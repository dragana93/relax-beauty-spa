// Booking records in the owner's Google Sheet, sheet "Rezervacije".
// The website writes columns A–K. Columns L–N (came, amount charged, payment method) belong
// to the owner and are never touched. The "Promet" sheet adds everything up with formulas
// (created once by `npm run google:setup`).
import { findService } from '../../shared/catalog';
import { formatTime } from '../../shared/slots';
import type { Bindings } from '../http';
import { googleFetch } from './auth';

export const BOOKINGS_SHEET = 'Rezervacije';

export const SHEET_HEADER = [
  'Broj rezervacije',
  'Datum',
  'Od',
  'Do',
  'Tretman',
  'Klijent',
  'Telefon',
  'E-mail',
  'Cijena (€)',
  'Status',
  'Rezervirano',
  'Došla',
  'Naplaćeno (€)',
  'Način plaćanja',
] as const;

export interface SheetBooking {
  reference: string;
  status: string;
  date: string;
  start_min: number;
  end_min: number;
  service_id: string;
  service_name: string;
  price_cents: number;
  customer_name: string;
  email: string;
  phone: string;
  created_at: string;
}

export function sheetEnabled(env: Bindings): boolean {
  return Boolean(env.GOOGLE_SERVICE_ACCOUNT_KEY && env.GOOGLE_SHEET_ID);
}

/** Text that a spreadsheet would run as a formula gets a leading apostrophe. */
export function sheetText(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

/** Columns A–K. Dates, times and the price are left for Sheets to read as real values. */
export function sheetRow(booking: SheetBooking): (string | number)[] {
  return [
    booking.reference,
    booking.date,
    formatTime(booking.start_min),
    formatTime(booking.end_min),
    sheetText(findService(booking.service_id)?.name.hr ?? booking.service_name),
    sheetText(booking.customer_name),
    sheetText(booking.phone),
    sheetText(booking.email),
    booking.price_cents / 100,
    booking.status === 'cancelled' ? 'otkazano' : 'potvrđeno',
    `${booking.created_at.slice(0, 10)} ${booking.created_at.slice(11, 16)}`,
  ];
}

const valuesUrl = (env: Bindings, range: string) =>
  `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.GOOGLE_SHEET_ID!)}/values/${encodeURIComponent(range)}`;

/**
 * Adds the booking's row, or updates columns A–K of its existing row (found by the booking
 * number), so a retry or a cancellation never creates a second row.
 */
export async function upsertSheetRow(env: Bindings, booking: SheetBooking): Promise<void> {
  const column = await googleFetch(env, valuesUrl(env, `${BOOKINGS_SHEET}!A:A`));
  const { values = [] } = (await column.json()) as { values?: string[][] };
  const index = values.findIndex((row) => row[0] === booking.reference);
  const row = [sheetRow(booking)];

  if (index >= 0) {
    const range = `${BOOKINGS_SHEET}!A${index + 1}:K${index + 1}`;
    await googleFetch(env, `${valuesUrl(env, range)}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      body: { range, majorDimension: 'ROWS', values: row },
    });
    return;
  }
  await googleFetch(
    env,
    `${valuesUrl(env, `${BOOKINGS_SHEET}!A:K`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: { majorDimension: 'ROWS', values: row } },
  );
}
