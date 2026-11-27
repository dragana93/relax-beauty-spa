// Pure date and slot logic shared by the browser and the Worker.
// Dates are "YYYY-MM-DD" and times are minutes after midnight, both in studio local time.
import { OPENING_HOURS, SCHEDULE } from './schedule';

export interface LocalMoment {
  date: string;
  minutes: number;
}

const zoneFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: SCHEDULE.timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** The studio's wall-clock date and time at a given instant. */
export function studioTime(instant: Date): LocalMoment {
  const parts = Object.fromEntries(zoneFormat.formatToParts(instant).map((p) => [p.type, p.value]));
  return {
    date: `${parts['year']}-${parts['month']}-${parts['day']}`,
    minutes: Number(parts['hour']) * 60 + Number(parts['minute']),
  };
}

/** Milliseconds of a wall-clock moment read as if it were UTC. */
function asUtcMs(date: string, minutes: number): number {
  return Date.parse(`${date}T00:00:00Z`) + minutes * 60_000;
}

/** The real instant of a studio wall-clock moment, including daylight-saving offsets. */
export function toInstant(date: string, minutes: number): Date {
  const wall = asUtcMs(date, minutes);
  const offsetAt = (ms: number) => {
    const local = studioTime(new Date(ms));
    return asUtcMs(local.date, local.minutes) - ms;
  };
  // The second pass corrects guesses that land on the other side of a clock change.
  return new Date(wall - offsetAt(wall - offsetAt(wall)));
}

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const ms = Date.parse(`${date}T00:00:00Z`);
  return !Number.isNaN(ms) && new Date(ms).toISOString().startsWith(date);
}

export function addDays(date: string, days: number): string {
  return new Date(asUtcMs(date, days * 24 * 60)).toISOString().slice(0, 10);
}

export function openingHours(date: string) {
  return OPENING_HOURS[new Date(`${date}T00:00:00Z`).getUTCDay()] ?? null;
}

/** Every open date a customer may currently choose from. */
export function bookableDates(now: Date): string[] {
  const today = studioTime(now).date;
  return Array.from({ length: SCHEDULE.windowDays + 1 }, (_, i) => addDays(today, i)).filter(
    (date) => openingHours(date) !== null,
  );
}

/** Grid cells touched by the interval [start, end). */
export function cellsBetween(start: number, end: number): number[] {
  const grid = SCHEDULE.gridMin;
  const cells: number[] = [];
  for (let cell = Math.floor(start / grid) * grid; cell < end; cell += grid) cells.push(cell);
  return cells;
}

/** Cells a booking occupies, including the cleanup buffer. */
export function bookingCells(start: number, durationMin: number): number[] {
  return cellsBetween(start, start + durationMin + SCHEDULE.bufferMin);
}

export function availableStarts(options: {
  date: string;
  durationMin: number;
  occupied: ReadonlySet<number>;
  now: Date;
}): number[] {
  const { date, durationMin, occupied, now } = options;
  if (!isValidDate(date)) return [];

  const today = studioTime(now).date;
  const hours = openingHours(date);
  if (!hours || date < today || date > addDays(today, SCHEDULE.windowDays)) return [];

  const earliest = now.getTime() + SCHEDULE.minNoticeHours * 3_600_000;
  const lastStart = hours.close - durationMin - SCHEDULE.bufferMin;
  const starts: number[] = [];

  for (let start = hours.open; start <= lastStart; start += SCHEDULE.startStepMin) {
    if (toInstant(date, start).getTime() < earliest) continue;
    if (bookingCells(start, durationMin).some((cell) => occupied.has(cell))) continue;
    starts.push(start);
  }
  return starts;
}

export function formatTime(minutes: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}
