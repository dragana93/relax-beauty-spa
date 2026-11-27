import { Hono } from 'hono';
import { useDb } from './db/sql';
import { retryPendingEmails } from './email/booking-emails';
import { sendDailyDigestIfDue } from './email/daily-digest';
import { retryPendingSync } from './google/sync';
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

// Every other route gets a database connection for the length of the request.
app.use('*', (c, next) =>
  useDb(c.env, async (db) => {
    c.set('db', db);
    await next();
  }),
);
app.route('/availability', availability);
app.route('/bookings', bookings);
app.route('/dev', dev);

app.notFound((c) => fail(c, 404, 'NOT_FOUND'));
app.onError((error, c) => {
  // Log the error only; request bodies contain personal data.
  console.error('API error:', error.message);
  return fail(c, 500, 'SERVER_ERROR');
});

/** Every 15 minutes: retry emails and Google copies, and send the evening list when due. */
export async function runScheduled(env: Bindings, now = new Date()): Promise<void> {
  await useDb(env, async (db) => {
    const tasks: [string, () => Promise<unknown>][] = [
      ['emails', () => retryPendingEmails(env, db, now)],
      ['google', () => retryPendingSync(env, db, now)],
      ['digest', () => sendDailyDigestIfDue(env, db, now)],
    ];
    // One connection handles one query at a time, so the tasks run one after another.
    for (const [label, task] of tasks) {
      await task().catch((error) =>
        console.error(`Scheduled ${label} failed:`, error instanceof Error ? error.message : error),
      );
    }
  });
}

export default {
  fetch: app.fetch,
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(runScheduled(env));
  },
} satisfies ExportedHandler<Bindings>;
