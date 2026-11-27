// Keeps the Google Calendar event and the Google Sheet row of each booking up to date.
// Runs after a booking is saved and from the cron trigger; a Google problem never blocks or
// loses a booking. Cancelling a booking in the database queues the update (see the trigger in
// supabase/migrations).
import { useDb, type Sql } from '../db/sql';
import type { Bindings } from '../http';
import { googleEnabled } from './auth';
import { calendarEnabled, deleteEvent, upsertEvent, type CalendarBooking } from './calendar';
import { sheetEnabled, upsertSheetRow, type SheetBooking } from './sheets';

export const MAX_SYNC_ATTEMPTS = 5;
const RETRY_WINDOW_HOURS = 48;
const RETRY_MIN_AGE_MINUTES = 2;

type SyncRow = CalendarBooking &
  SheetBooking & { calendar_sync: string; sheet_sync: string; status: string };

type Outcome = 'done' | 'failed' | null;

async function attempt(label: string, task: () => Promise<unknown>): Promise<Outcome> {
  try {
    await task();
    return 'done';
  } catch (error) {
    // No names or addresses in logs.
    console.error(`Google ${label} sync failed:`, error instanceof Error ? error.message : error);
    return 'failed';
  }
}

/** Brings one booking's calendar event and sheet row up to date. Never throws. */
export async function syncBooking(env: Bindings, db: Sql, reference: string): Promise<void> {
  try {
    if (!googleEnabled(env)) return;
    const [row] = await db.query<SyncRow>(
      `SELECT reference, status, date, start_min, end_min, service_id, service_name, price_cents,
         customer_name, email, phone, note, created_at, calendar_sync, sheet_sync
       FROM bookings WHERE reference = $1`,
      [reference],
    );
    if (!row) return;

    const calendar =
      calendarEnabled(env) && row.calendar_sync !== 'done'
        ? await attempt('calendar', () =>
            row.status === 'cancelled' ? deleteEvent(env, row.reference) : upsertEvent(env, row),
          )
        : null;
    const sheet =
      sheetEnabled(env) && row.sheet_sync !== 'done'
        ? await attempt('sheet', () => upsertSheetRow(env, row))
        : null;
    if (!calendar && !sheet) return;

    await db.query(
      `UPDATE bookings
       SET calendar_sync = COALESCE($1, calendar_sync),
           sheet_sync = COALESCE($2, sheet_sync),
           sync_attempts = sync_attempts + 1
       WHERE reference = $3`,
      [calendar, sheet, reference],
    );
  } catch (error) {
    console.error('Google sync error:', error instanceof Error ? error.message : error);
  }
}

/** For work that runs after the response: opens its own database connection. */
export function syncBookingLater(env: Bindings, reference: string): Promise<void> {
  return useDb(env, (db) => syncBooking(env, db, reference)).catch((error) =>
    console.error('Google sync error:', error instanceof Error ? error.message : error),
  );
}

/** Called by the cron trigger: retries bookings whose calendar or sheet copy is not done. */
export async function retryPendingSync(env: Bindings, db: Sql, now = new Date()): Promise<number> {
  if (!googleEnabled(env)) return 0;
  const oldest = new Date(now.getTime() - RETRY_WINDOW_HOURS * 3_600_000).toISOString();
  const newest = new Date(now.getTime() - RETRY_MIN_AGE_MINUTES * 60_000).toISOString();
  const rows = await db.query<{ reference: string }>(
    `SELECT reference FROM bookings
     WHERE sync_attempts < $1
       AND COALESCE(cancelled_at, created_at) BETWEEN $2 AND $3
       AND (($4 AND calendar_sync <> 'done') OR ($5 AND sheet_sync <> 'done'))
     ORDER BY created_at
     LIMIT 20`,
    [MAX_SYNC_ATTEMPTS, oldest, newest, calendarEnabled(env), sheetEnabled(env)],
  );
  for (const { reference } of rows) await syncBooking(env, db, reference);
  return rows.length;
}
