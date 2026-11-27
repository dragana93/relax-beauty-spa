// Two-way link with the owner's Google Calendar:
// - every booking from the website becomes an event (and is removed when cancelled);
// - anything marked "busy" in the calendar (a phone booking, a break, a holiday) blocks
//   those times on the website.
import { findService, formatPrice } from '../../shared/catalog';
import { SCHEDULE } from '../../shared/schedule';
import { addDays, cellsBetween, studioTime, toInstant } from '../../shared/slots';
import type { Bindings } from '../http';
import { GoogleError, googleFetch } from './auth';

const API = 'https://www.googleapis.com/calendar/v3';

export interface CalendarBooking {
  reference: string;
  date: string;
  start_min: number;
  end_min: number;
  service_id: string;
  service_name: string;
  price_cents: number;
  customer_name: string;
  email: string;
  phone: string;
  note: string | null;
}

export function calendarEnabled(env: Bindings): boolean {
  return Boolean(env.GOOGLE_SERVICE_ACCOUNT_KEY && env.GOOGLE_CALENDAR_ID);
}

/**
 * A fixed event id per booking (Google allows the characters 0-9 and a-v), so a retry
 * updates the same event instead of creating a second one.
 */
export async function eventId(reference: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(reference));
  const hex = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
  return `rbs${hex.slice(0, 40)}`;
}

const pad = (n: number) => String(n).padStart(2, '0');
const localDateTime = (date: string, minutes: number) =>
  `${date}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00`;

export function eventBody(booking: CalendarBooking) {
  const service = findService(booking.service_id)?.name.hr ?? booking.service_name;
  const lines = [
    `Klijent: ${booking.customer_name}`,
    `Telefon: ${booking.phone}`,
    `E-mail: ${booking.email}`,
    `Cijena: ${formatPrice(booking.price_cents, 'hr')}`,
    `Broj rezervacije: ${booking.reference}`,
  ];
  if (booking.note) lines.push(`Napomena: ${booking.note}`);
  lines.push('', 'Rezervirano preko web stranice.');
  return {
    summary: `${service} – ${booking.customer_name}`,
    description: lines.join('\n'),
    start: {
      dateTime: localDateTime(booking.date, booking.start_min),
      timeZone: SCHEDULE.timeZone,
    },
    end: { dateTime: localDateTime(booking.date, booking.end_min), timeZone: SCHEDULE.timeZone },
    transparency: 'opaque',
    reminders: { useDefault: true },
  };
}

const calendarUrl = (env: Bindings) =>
  `${API}/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID!)}/events`;

/** Creates the booking's event, or updates it if it already exists. */
export async function upsertEvent(env: Bindings, booking: CalendarBooking): Promise<string> {
  const id = await eventId(booking.reference);
  const body = eventBody(booking);
  try {
    await googleFetch(env, calendarUrl(env), { method: 'POST', body: { id, ...body } });
  } catch (error) {
    // 409: the event exists (an earlier attempt worked, or it was deleted and is in the bin).
    if (!(error instanceof GoogleError) || error.status !== 409) throw error;
    await googleFetch(env, `${calendarUrl(env)}/${id}`, {
      method: 'PUT',
      body: { ...body, status: 'confirmed' },
    });
  }
  return id;
}

/** Removes the booking's event. An event that is already gone counts as removed. */
export async function deleteEvent(env: Bindings, reference: string): Promise<void> {
  const id = await eventId(reference);
  try {
    await googleFetch(env, `${calendarUrl(env)}/${id}`, { method: 'DELETE' });
  } catch (error) {
    if (error instanceof GoogleError && (error.status === 404 || error.status === 410)) return;
    throw error;
  }
}

/**
 * The 15-minute cells of `date` that are busy in the owner's calendar. Never throws: if
 * Google is slow or fails, the website falls back to its own bookings only.
 */
export async function calendarBusyCells(env: Bindings, date: string): Promise<Set<number>> {
  if (!calendarEnabled(env)) return new Set();
  try {
    const response = await googleFetch(env, `${API}/freeBusy`, {
      method: 'POST',
      body: {
        timeMin: toInstant(date, 0).toISOString(),
        timeMax: toInstant(addDays(date, 1), 0).toISOString(),
        items: [{ id: env.GOOGLE_CALENDAR_ID }],
      },
      timeoutMs: 3_000,
    });
    const body = (await response.json()) as {
      calendars?: Record<string, { busy?: { start: string; end: string }[]; errors?: unknown[] }>;
    };
    const calendar = body.calendars?.[env.GOOGLE_CALENDAR_ID!];
    if (!calendar || calendar.errors?.length) throw new Error('Calendar not readable');

    const cells = new Set<number>();
    for (const { start, end } of calendar.busy ?? []) {
      const from = studioTime(new Date(start));
      const to = studioTime(new Date(end));
      const startMin = from.date < date ? 0 : from.minutes;
      const endMin = to.date > date ? 24 * 60 : to.minutes;
      for (const cell of cellsBetween(startMin, endMin)) cells.add(cell);
    }
    return cells;
  } catch (error) {
    console.error(
      'Calendar busy times unavailable:',
      error instanceof Error ? error.message : error,
    );
    return new Set();
  }
}
