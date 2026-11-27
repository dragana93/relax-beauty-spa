// Sends the emails for a saved booking and records the outcome in the bookings table.
// Runs after the response, so a mail problem can never lose or block a booking.
import type { Bindings } from '../http';
import { toBase64 } from './ics';
import { mailEnabled, sendEmail, type OutgoingEmail } from './send';
import { customerEmail, ownerEmail, studioReplyTo, type BookingRow } from './templates';

export const MAX_MAIL_ATTEMPTS = 5;
/** Older bookings are not retried; the owner sees the failure in the database (later: admin page). */
const RETRY_WINDOW_HOURS = 48;
/** Leave fresh bookings to their first attempt, which is still running. */
const RETRY_MIN_AGE_MINUTES = 2;

type Outcome = 'sent' | 'failed';

export function loadBooking(db: D1Database, reference: string): Promise<BookingRow | null> {
  return db
    .prepare(
      `SELECT reference, status, date, start_min, end_min, service_id, service_name, price_cents,
         customer_name, email, phone, note, lang, customer_mail, owner_mail, mail_attempts, created_at
       FROM bookings WHERE reference = ?`,
    )
    .bind(reference)
    .first<BookingRow>();
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
      ? [{ filename: `${row.reference}.ics`, content: toBase64(email.ics) }]
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
export async function deliverBookingEmails(env: Bindings, reference: string): Promise<void> {
  try {
    if (!mailEnabled(env)) return;
    const row = await loadBooking(env.DB, reference);
    if (!row || row.status !== 'confirmed') return;

    const customer =
      row.customer_mail === 'sent' ? null : await attempt(env, customerMessage(row, env), 'customer');
    const owner =
      env.OWNER_EMAIL && row.owner_mail !== 'sent'
        ? await attempt(env, ownerMessage(row, env.OWNER_EMAIL), 'owner')
        : null;

    await env.DB.prepare(
      `UPDATE bookings
       SET customer_mail = COALESCE(?, customer_mail),
           owner_mail = COALESCE(?, owner_mail),
           mail_attempts = mail_attempts + 1
       WHERE reference = ?`,
    )
      .bind(customer, owner, reference)
      .run();
  } catch (error) {
    console.error('Email delivery error:', error instanceof Error ? error.message : error);
  }
}

/** Called by the cron trigger: retries emails that failed or never ran. */
export async function retryPendingEmails(env: Bindings, now = new Date()): Promise<number> {
  if (!mailEnabled(env)) return 0;
  const oldest = new Date(now.getTime() - RETRY_WINDOW_HOURS * 3_600_000).toISOString();
  const newest = new Date(now.getTime() - RETRY_MIN_AGE_MINUTES * 60_000).toISOString();
  const { results } = await env.DB.prepare(
    `SELECT reference FROM bookings
     WHERE status = 'confirmed' AND mail_attempts < ?
       AND created_at BETWEEN ? AND ?
       AND (customer_mail != 'sent' OR (? = 1 AND owner_mail != 'sent'))
     ORDER BY created_at
     LIMIT 20`,
  )
    .bind(MAX_MAIL_ATTEMPTS, oldest, newest, env.OWNER_EMAIL ? 1 : 0)
    .all<{ reference: string }>();

  for (const { reference } of results) await deliverBookingEmails(env, reference);
  return results.length;
}
