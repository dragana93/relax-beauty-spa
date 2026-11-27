// LOCAL ONLY: shows the emails of a booking in the browser, without sending anything.
// Enabled only with EMAIL_PREVIEW=true in .dev.vars and only on localhost.
import { Hono } from 'hono';
import { fail, type AppEnv } from '../http';
import { loadBooking } from '../email/booking-emails';
import { customerEmail, escapeHtml, ownerEmail } from '../email/templates';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export const dev = new Hono<AppEnv>()
  .use('*', async (c, next) => {
    const local = LOCAL_HOSTS.has(new URL(c.req.url).hostname);
    if (c.env.EMAIL_PREVIEW !== 'true' || !local) return fail(c, 404, 'NOT_FOUND');
    await next();
  })
  .get('/emails', async (c) => {
    const { results } = await c.env.DB.prepare(
      'SELECT reference, date, lang, customer_mail, owner_mail FROM bookings ORDER BY created_at DESC LIMIT 30',
    ).all<{ reference: string; date: string; lang: string; customer_mail: string; owner_mail: string }>();
    const items = results
      .map((r) => {
        const ref = escapeHtml(r.reference);
        return `<li>${ref} · ${escapeHtml(r.date)} · ${escapeHtml(r.lang)} · customer: ${escapeHtml(r.customer_mail)}, owner: ${escapeHtml(r.owner_mail)}
          — <a href="emails/${ref}/customer">customer</a> · <a href="emails/${ref}/customer.txt">text</a>
          · <a href="emails/${ref}/customer.ics">calendar</a> · <a href="emails/${ref}/owner">owner</a></li>`;
      })
      .join('');
    return c.html(
      `<!doctype html><meta charset="utf-8"><title>Email preview</title><body style="font-family:sans-serif"><h1>Email preview (local only)</h1><ul>${items || '<li>No bookings yet.</li>'}</ul>`,
    );
  })
  .get('/emails/:reference/:kind', async (c) => {
    const row = await loadBooking(c.env.DB, c.req.param('reference'));
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
