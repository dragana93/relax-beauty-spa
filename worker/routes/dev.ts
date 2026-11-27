// LOCAL ONLY: shows the emails of a booking in the browser, without sending anything.
// Enabled only with EMAIL_PREVIEW=true in .dev.vars and only on localhost.
import { Hono } from 'hono';
import { fail, type AppEnv } from '../http';
import { loadBooking } from '../email/booking-emails';
import { loadDay } from '../email/daily-digest';
import { dailyDigest } from '../email/digest-template';
import { isValidDate } from '../../shared/slots';
import { customerEmail, escapeHtml, ownerEmail } from '../email/templates';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export const dev = new Hono<AppEnv>()
  .use('*', async (c, next) => {
    const local = LOCAL_HOSTS.has(new URL(c.req.url).hostname);
    if (c.env.EMAIL_PREVIEW !== 'true' || !local) return fail(c, 404, 'NOT_FOUND');
    await next();
  })
  .get('/emails', async (c) => {
    const results = await c.var.db.query<{
      reference: string;
      date: string;
      lang: string;
      customer_mail: string;
      owner_mail: string;
    }>(
      'SELECT reference, date, lang, customer_mail, owner_mail FROM bookings ORDER BY created_at DESC LIMIT 30',
    );
    const items = results
      .map((r) => {
        const ref = escapeHtml(r.reference);
        return `<li>${ref} · ${escapeHtml(r.date)} · ${escapeHtml(r.lang)} · customer: ${escapeHtml(r.customer_mail)}, owner: ${escapeHtml(r.owner_mail)}
          — <a href="emails/${ref}/customer">customer</a> · <a href="emails/${ref}/customer.txt">text</a>
          · <a href="emails/${ref}/customer.ics">calendar</a> · <a href="emails/${ref}/owner">owner</a></li>`;
      })
      .join('');
    return c.html(
      `<!doctype html><meta charset="utf-8"><title>Email preview</title><body style="font-family:sans-serif"><h1>Email preview (local only)</h1><p>Evening list of a day: <code>/api/dev/digest/YYYY-MM-DD</code> (add <code>.csv</code> for the attachment)</p><ul>${items || '<li>No bookings yet.</li>'}</ul>`,
    );
  })
  .get('/digest/:day', async (c) => {
    const day = c.req.param('day');
    const csv = day.endsWith('.csv');
    const date = csv ? day.slice(0, -4) : day;
    if (!isValidDate(date)) return fail(c, 404, 'NOT_FOUND');
    const digest = dailyDigest(date, await loadDay(c.var.db, date));
    if (!csv) return c.html(digest.html);
    return c.body(digest.csv, 200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${digest.csvFilename}"`,
    });
  })
  .get('/emails/:reference/:kind', async (c) => {
    const row = await loadBooking(c.var.db, c.req.param('reference'));
    if (!row) return fail(c, 404, 'NOT_FOUND');
    switch (c.req.param('kind')) {
      case 'customer':
        return c.html(customerEmail(row, c.env.OWNER_EMAIL).html);
      case 'customer.txt':
        return c.text(customerEmail(row, c.env.OWNER_EMAIL).text);
      case 'customer.ics':
        return c.text(customerEmail(row, c.env.OWNER_EMAIL).ics ?? '');
      case 'owner':
        return c.html(ownerEmail(row).html);
      default:
        return fail(c, 404, 'NOT_FOUND');
    }
  });
