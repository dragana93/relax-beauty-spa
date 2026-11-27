// Sends the emails for a saved booking and records the outcome in the bookings table.
// Runs after the response, so a mail problem can never lose or block a booking.
import { useDb, type Sql } from '../db/sql';
import type { Bindings } from '../http';
import { mailEnabled, sendEmail, type OutgoingEmail } from './send';
import { customerEmail, ownerEmail, studioReplyTo, type BookingRow } from './templates';

export const MAX_MAIL_ATTEMPTS = 5;
/** Older bookings are not retried; the owner sees the failure in the database (later: admin page). */
const RETRY_WINDOW_HOURS = 48;
/** Leave fresh bookings to their first attempt, which is still running. */
const RETRY_MIN_AGE_MINUTES = 2;

type Outcome = 'sent' | 'failed';

export async function loadBooking(db: Sql, reference: string): Promise<BookingRow | null> {
  const [row] = await db.query<BookingRow>(
    `SELECT reference, status, date, start_min, end_min, service_id, service_name, price_cents,
       customer_name, email, phone, note, lang, customer_mail, owner_mail, mail_attempts, created_at
     FROM bookings WHERE reference = $1`,
    [reference],
  );
  return row ?? null;
}

export function customerMessage(row: BookingRow, env: Bindings): OutgoingEmail {
  const email = customerEmail(row, env.OWNER_EMAIL);
  return {
    to: row.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    replyTo: studioReplyTo(env.OWNER_EMAIL),
    attachments: email.ics
      ? [
          {
            filename: `${row.reference}.ics`,
            content: email.ics,
            contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
          },
        ]
      : undefined,
    idempotencyKey: `booking/${row.reference}/customer`,
  };
}

export function ownerMessage(row: BookingRow, ownerAddress: string): OutgoingEmail {
  const email = ownerEmail(row);
  return {
    to: ownerAddress,
    subject: email.subject,
    html: email.html,
    text: email.text,
    replyTo: row.email,
    idempotencyKey: `booking/${row.reference}/owner`,
  };
}

async function attempt(env: Bindings, message: OutgoingEmail, label: string): Promise<Outcome> {
  try {
    await sendEmail(env, message);
    return 'sent';
  } catch (error) {
    // No addresses or names in logs.
    console.error(`Email (${label}) failed:`, error instanceof Error ? error.message : error);
    return 'failed';
  }
}

/** Sends whichever of the two emails has not been sent yet. Never throws. */
export async function deliverBookingEmails(
  env: Bindings,
  db: Sql,
  reference: string,
): Promise<void> {
  try {
    if (!mailEnabled(env)) return;
    const row = await loadBooking(db, reference);
    if (!row || row.status !== 'confirmed') return;

    const customer =
      row.customer_mail === 'sent'
        ? null
        : await attempt(env, customerMessage(row, env), 'customer');
    const owner =
      env.OWNER_EMAIL && row.owner_mail !== 'sent'
        ? await attempt(env, ownerMessage(row, env.OWNER_EMAIL), 'owner')
        : null;

    await db.query(
      `UPDATE bookings
       SET customer_mail = COALESCE($1, customer_mail),
           owner_mail = COALESCE($2, owner_mail),
           mail_attempts = mail_attempts + 1
       WHERE reference = $3`,
      [customer, owner, reference],
    );
  } catch (error) {
    console.error('Email delivery error:', error instanceof Error ? error.message : error);
  }
}

/** For work that runs after the response: opens its own database connection. */
export function deliverBookingEmailsLater(env: Bindings, reference: string): Promise<void> {
  return useDb(env, (db) => deliverBookingEmails(env, db, reference)).catch((error) =>
    console.error('Email delivery error:', error instanceof Error ? error.message : error),
  );
}

/** Called by the cron trigger: retries emails that failed or never ran. */
export async function retryPendingEmails(
  env: Bindings,
  db: Sql,
  now = new Date(),
): Promise<number> {
  if (!mailEnabled(env)) return 0;
  const oldest = new Date(now.getTime() - RETRY_WINDOW_HOURS * 3_600_000).toISOString();
  const newest = new Date(now.getTime() - RETRY_MIN_AGE_MINUTES * 60_000).toISOString();
  const results = await db.query<{ reference: string }>(
    `SELECT reference FROM bookings
     WHERE status = 'confirmed' AND mail_attempts < $1
       AND created_at BETWEEN $2 AND $3
       AND (customer_mail <> 'sent' OR ($4 AND owner_mail <> 'sent'))
     ORDER BY created_at
     LIMIT 20`,
    [MAX_MAIL_ATTEMPTS, oldest, newest, Boolean(env.OWNER_EMAIL)],
  );

  for (const { reference } of results) await deliverBookingEmails(env, db, reference);
  return results.length;
}
