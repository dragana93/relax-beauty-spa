import { Hono } from 'hono';
import { retryPendingEmails } from './email/booking-emails';
import { fail, type AppEnv, type Bindings } from './http';
import { availability } from './routes/availability';
import { bookings } from './routes/bookings';
import { dev } from './routes/dev';

export const app = new Hono<AppEnv>().basePath('/api');

app.use('*', async (c, next) => {
  // Changes must be same-origin JSON. Cross-origin JSON needs a CORS preflight, which we never allow.
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    const crossSite = c.req.header('Sec-Fetch-Site') === 'cross-site';
    const isJson = c.req.header('Content-Type')?.startsWith('application/json');
    if (crossSite || !isJson) return fail(c, 403, 'FORBIDDEN');
  }
  await next();
  c.header('Cache-Control', 'no-store');
});

app.get('/health', (c) => c.json({ ok: true }));
app.route('/availability', availability);
app.route('/bookings', bookings);
app.route('/dev', dev);

app.notFound((c) => fail(c, 404, 'NOT_FOUND'));
app.onError((error, c) => {
  // Log the error only; request bodies contain personal data.
  console.error('API error:', error.message);
  return fail(c, 500, 'SERVER_ERROR');
});

export default {
  fetch: app.fetch,
  /** Cron trigger (see wrangler.jsonc): retries emails that failed. */
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(retryPendingEmails(env));
  },
} satisfies ExportedHandler<Bindings>;
