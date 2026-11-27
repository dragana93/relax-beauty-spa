// Every evening the owner gets the list of the next day's bookings (see SCHEDULE.digestAtMin).
// Runs from the cron trigger every 15 minutes. It sends once a day is due and has not been
// sent, and retries a failed send on the next runs. Never throws.
import { SCHEDULE } from '../../shared/schedule';
import { addDays, openingHours, studioTime } from '../../shared/slots';
import type { Sql } from '../db/sql';
import type { Bindings } from '../http';
import { dailyDigest, type DigestRow } from './digest-template';
import { mailEnabled, sendEmail } from './send';

export const MAX_DIGEST_ATTEMPTS = 5;

export type DigestResult =
  'disabled' | 'not-due' | 'already-sent' | 'gave-up' | 'closed' | 'sent' | 'failed';

/** The day whose list is due at `now`, or null before the evening send time. */
export function digestDateDue(now: Date): string | null {
  const local = studioTime(now);
  return local.minutes >= SCHEDULE.digestAtMin ? addDays(local.date, 1) : null;
}

/** All bookings of a day, confirmed and cancelled, by start time. */
export function loadDay(db: Sql, date: string): Promise<DigestRow[]> {
  return db.query<DigestRow>(
    `SELECT reference, status, start_min, end_min, service_id, service_name, price_cents,
       customer_name, email, phone, note
     FROM bookings WHERE date = $1 ORDER BY start_min, created_at`,
    [date],
  );
}

async function shortHash(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest).slice(0, 8), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

/** Sends the list for `date` to the owner and records the outcome. */
export async function sendDailyDigest(
  env: Bindings,
  db: Sql,
  date: string,
  now = new Date(),
): Promise<'sent' | 'failed'> {
  const rows = await loadDay(db, date);
  const digest = dailyDigest(date, rows);
  let status: 'sent' | 'failed' = 'sent';
  try {
    await sendEmail(env, {
      to: env.OWNER_EMAIL!,
      subject: digest.subject,
      html: digest.html,
      text: digest.text,
      attachments: [
        {
          filename: digest.csvFilename,
          content: digest.csv,
          contentType: 'text/csv; charset=utf-8',
        },
      ],
      // Shows in Brevo's logs which version of the day's list was sent.
      idempotencyKey: `digest/${date}/${await shortHash(digest.csv)}`,
    });
  } catch (error) {
    // No addresses or names in logs.
    console.error('Daily digest failed:', error instanceof Error ? error.message : error);
    status = 'failed';
  }

  const at = now.toISOString();
  await db.query(
    `INSERT INTO daily_digests (date, status, attempts, booking_count, last_attempt_at, sent_at)
     VALUES ($1, $2, 1, $3, $4, $5)
     ON CONFLICT(date) DO UPDATE SET
       status = excluded.status,
       attempts = daily_digests.attempts + 1,
       booking_count = excluded.booking_count,
       last_attempt_at = excluded.last_attempt_at,
       sent_at = excluded.sent_at`,
    [
      date,
      status,
      rows.filter((r) => r.status === 'confirmed').length,
      at,
      status === 'sent' ? at : null,
    ],
  );
  return status;
}

/** Called by the cron trigger. */
export async function sendDailyDigestIfDue(
  env: Bindings,
  db: Sql,
  now = new Date(),
): Promise<DigestResult> {
  try {
    if (!mailEnabled(env) || !env.OWNER_EMAIL) return 'disabled';
    const date = digestDateDue(now);
    if (!date) return 'not-due';

    const [state] = await db.query<{ status: string; attempts: number }>(
      'SELECT status, attempts FROM daily_digests WHERE date = $1',
      [date],
    );
    if (state?.status === 'sent') return 'already-sent';
    if (state && state.attempts >= MAX_DIGEST_ATTEMPTS) return 'gave-up';

    if (openingHours(date) === null) {
      const [booked] = await db.query('SELECT 1 FROM bookings WHERE date = $1 LIMIT 1', [date]);
      // A closed day with no bookings needs no email.
      if (!booked) return 'closed';
    }
    return await sendDailyDigest(env, db, date, now);
  } catch (error) {
    console.error('Daily digest error:', error instanceof Error ? error.message : error);
    return 'failed';
  }
}
