// Runs the Worker routes against a real Postgres database (PGlite, in memory).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LANGS } from '../shared/lang';
import { bookableDates } from '../shared/slots';
import { SCHEDULE } from '../shared/schedule';
import { retryPendingEmails } from '../worker/email/booking-emails';
import type { Bindings } from '../worker/http';
import { app } from '../worker/index';
import { parseAddress } from '../worker/email/send';
import { createReference, REFERENCE_ALPHABET } from '../worker/security/reference';
import { createTestDb, type TestDb } from './helpers/pglite';
import { MAIL_ENV, stubBrevo, type MailStub } from './helpers/brevo';

let db: TestDb;
const date = bookableDates(new Date())[7]!;

beforeAll(async () => {
  db = await createTestDb();
}, 60_000);

afterAll(() => db?.pg.close());

beforeEach(() => db.reset());

function booking(overrides: Record<string, unknown> = {}) {
  return {
    serviceId: 'relax-massage-60',
    date,
    startMin: 600,
    name: 'Test Kupac',
    email: `${crypto.randomUUID()}@example.com`,
    phone: '+385 91 000 0000',
    lang: 'hr',
    privacyAck: true,
    idempotencyKey: crypto.randomUUID(),
    ...overrides,
  };
}

/** Only the database: email settings from a local .dev.vars must never reach the tests. */
function baseEnv(): Bindings {
  return { DB: db.sql };
}

function post(
  body: unknown,
  headers: Record<string, string> = {},
  env: Bindings = baseEnv(),
  ctx?: ExecutionContext,
) {
  return app.request(
    '/api/bookings',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    },
    env,
    ctx,
  );
}

async function count(table: string): Promise<number> {
  const [row] = await db.sql.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM ${table}`);
  return row!.n;
}

async function starts(serviceId = 'relax-massage-60'): Promise<number[]> {
  const res = await app.request(
    `/api/availability?serviceId=${serviceId}&date=${date}`,
    {},
    baseEnv(),
  );
  return ((await res.json()) as { starts: number[] }).starts;
}

describe('booking reference', () => {
  it('uses the unambiguous alphabet', () => {
    const pattern = new RegExp(`^RBS-[${REFERENCE_ALPHABET}]{6}$`);
    const made = Array.from({ length: 500 }, createReference);
    for (const reference of made) expect(reference).toMatch(pattern);
    expect(new Set(made).size).toBe(made.length);
  });
});

describe('POST /api/bookings', () => {
  it('stores a booking and removes its time from availability', async () => {
    expect(await starts()).toContain(600);
    const res = await post(booking());
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ startMin: 600, priceCents: 4500, emailQueued: false });
    expect(await starts()).not.toContain(600);
    expect(await count('occupied_slots')).toBe(5);
  });

  it('lets exactly one of many parallel requests win the same time', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => post(booking())));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409, 409, 409, 409, 409, 409]);
    expect(await count('bookings')).toBe(1);
    expect(await count('occupied_slots')).toBe(5);
  });

  it('lets only one of two overlapping services win', async () => {
    const results = await Promise.all([
      post(booking({ serviceId: 'spa-ritual', startMin: 600 })),
      post(booking({ serviceId: 'back-massage-30', startMin: 660 })),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await count('bookings')).toBe(1);
  });

  it('rolls back the booking row when any cell is already taken', async () => {
    // Occupy only a late cell, so the booking row is written before the cells fail.
    await db.sql.query(
      "INSERT INTO blocks (public_id, date, start_min, end_min, created_at) VALUES ('b1', $1, 660, 675, 'x')",
      [date],
    );
    await db.sql.query(
      "INSERT INTO occupied_slots (date, slot_min, block_ref) VALUES ($1, 660, 'b1')",
      [date],
    );
    const { insertBooking, conflictType } = await import('../worker/db/bookings');
    const error = await insertBooking(db.sql, {
      reference: createReference(),
      idempotencyKey: crypto.randomUUID(),
      date,
      startMin: 600,
      durationMin: 60,
      serviceId: 'relax-massage-60',
      serviceName: 'x',
      priceCents: 1,
      name: 'x',
      email: 'x@example.com',
      phone: '123456',
      note: null,
      lang: 'hr',
      createdAt: new Date().toISOString(),
    }).then(
      () => null,
      (e: unknown) => e,
    );
    expect(conflictType(error)).toBe('slot');
    expect(await count('bookings')).toBe(0);
    expect(await count('occupied_slots')).toBe(1);
  });

  it('returns the original booking when a request is retried', async () => {
    const body = booking();
    const first = (await (await post(body)).json()) as { reference: string };
    const retry = await post(body);
    expect(retry.status).toBe(201);
    expect(await retry.json()).toMatchObject({ reference: first.reference });
    expect(await count('bookings')).toBe(1);
  });

  it('handles parallel copies of one request as a single booking', async () => {
    const body = booking();
    const results = await Promise.all([post(body), post(body), post(body)]);
    expect(results.map((r) => r.status)).toEqual([201, 201, 201]);
    expect(await count('bookings')).toBe(1);
  });

  it('does not reveal a booking to someone reusing its key with another email', async () => {
    const body = booking();
    await post(body);
    expect((await post({ ...body, email: 'other@example.com' })).status).toBe(422);
  });

  it('ignores a tampered price and duration', async () => {
    const res = await post(booking({ priceCents: 1, durationMin: 15 }));
    expect(await res.json()).toMatchObject({ priceCents: 4500, durationMin: 60 });
  });

  it('limits upcoming bookings per email', async () => {
    const email = 'limit@example.com';
    for (let i = 0; i < SCHEDULE.maxUpcomingPerEmail; i++) {
      expect((await post(booking({ email, startMin: 540 + i * 90 }))).status).toBe(201);
    }
    expect((await post(booking({ email, startMin: 900 }))).status).toBe(429);
  });

  it.each([
    ['unknown service', { serviceId: 'nope' }],
    ['bad email', { email: 'not-an-email' }],
    ['bad phone', { phone: 'abc' }],
    ['phone without digits', { phone: '-- -- --' }],
    ['phone with too few digits', { phone: '+(12) 34' }],
    ['phone with too many digits', { phone: '+385 91 123 4567 8901' }],
    ['empty name', { name: '   ' }],
    ['empty email', { email: '' }],
    ['empty phone', { phone: '' }],
    ['missing acknowledgement', { privacyAck: false }],
    ['filled honeypot', { website: 'http://spam.example' }],
    ['bad date', { date: '2026-02-30' }],
  ])('rejects %s', async (_label, overrides) => {
    expect((await post(booking(overrides))).status).toBe(422);
    expect(await count('bookings')).toBe(0);
  });

  it.each(['name', 'email', 'phone'])('rejects a booking without %s', async (field) => {
    const body: Record<string, unknown> = booking();
    delete body[field];
    expect((await post(body)).status).toBe(422);
    expect(await count('bookings')).toBe(0);
  });

  it.each(LANGS)('stores a booking made in %s', async (lang) => {
    expect((await post(booking({ lang }))).status).toBe(201);
  });

  it('rejects an unsupported language', async () => {
    expect((await post(booking({ lang: 'fr' }))).status).toBe(422);
  });

  it('rejects a time that is not offered', async () => {
    expect((await post(booking({ startMin: 605 }))).status).toBe(409);
  });

  it('rejects cross-site and non-JSON requests', async () => {
    expect((await post(booking(), { 'Sec-Fetch-Site': 'cross-site' })).status).toBe(403);
    expect((await post(booking(), { 'Content-Type': 'text/plain' })).status).toBe(403);
  });
});

describe('confirmation emails (Brevo)', () => {
  let mail: MailStub;

  beforeEach(() => {
    mail = stubBrevo();
  });
  afterEach(() => vi.unstubAllGlobals());

  function mailEnv(): Bindings {
    return { DB: db.sql, ...MAIL_ENV };
  }

  it('reads the sender name and address for Brevo', () => {
    expect(parseAddress('Relax Studio <rezervacije@example.hr>')).toEqual({
      name: 'Relax Studio',
      email: 'rezervacije@example.hr',
    });
    expect(parseAddress('"Relax, Beauty" <a@example.hr>')).toEqual({
      name: 'Relax, Beauty',
      email: 'a@example.hr',
    });
    expect(parseAddress(' a@example.hr ')).toEqual({ email: 'a@example.hr' });
  });

  /** Collects the work a booking schedules after its response. */
  function context() {
    const tasks: Promise<unknown>[] = [];
    const ctx = {
      waitUntil: (task: Promise<unknown>) => void tasks.push(task),
      passThroughOnException: () => {},
      props: {},
    } as unknown as ExecutionContext;
    return { ctx, done: () => Promise.all(tasks) };
  }

  async function mailStatus(reference: string) {
    const [row] = await db.sql.query<{
      customer_mail: string;
      owner_mail: string;
      mail_attempts: number;
    }>('SELECT customer_mail, owner_mail, mail_attempts FROM bookings WHERE reference = $1', [
      reference,
    ]);
    return row;
  }

  it('sends the customer and owner emails after a booking', async () => {
    const { ctx, done } = context();
    const body = booking({ lang: 'de', name: '<b>Ana</b> Test', note: 'Bitte ruhig' });
    const res = await post(body, {}, mailEnv(), ctx);
    const { reference, emailQueued } = (await res.json()) as {
      reference: string;
      emailQueued: boolean;
    };
    expect(res.status).toBe(201);
    expect(emailQueued).toBe(true);
    await done();

    expect(mail.sent).toHaveLength(2);
    const customer = mail.sent.find((m) => m.fields['to'] === body.email)!;
    const owner = mail.sent.find((m) => m.fields['to'] === 'owner@example.com')!;

    expect(customer.url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(customer.headers.get('api-key')).toBe('xkeysib-test');
    expect(customer.fields['from']).toBe(MAIL_ENV.MAIL_FROM);
    expect(customer.fields['subject']).toBe(`Buchungsbestätigung ${reference}`);
    expect(customer.fields['messageKey']).toBe(`booking/${reference}/customer`);
    expect(customer.fields['replyTo']).toBe('owner@example.com');
    expect(customer.fields['html']).toContain('&lt;b&gt;Ana&lt;/b&gt;');
    expect(customer.fields['html']).not.toContain('<b>Ana');
    expect(customer.fields['html']).not.toContain('Bitte ruhig'); // The note is for the owner only.
    expect(customer.fields['text']).toContain(reference);
    const [ics] = customer.attachments;
    expect(ics!.filename).toBe(`${reference}.ics`);
    expect(ics!.content).toContain(`UID:${reference}@relax-beauty-spa`);
    expect(ics!.content).toMatch(/DTSTART:\d{8}T\d{6}Z/);

    expect(owner.fields['subject']).toMatch(/^Nova rezervacija: /);
    expect(owner.fields['html']).toContain(reference);
    expect(customer.fields['html']).toContain(reference);
    expect(owner.fields['replyTo']).toBe(body.email);
    expect(owner.fields['html']).toContain('Bitte ruhig');

    expect(await mailStatus(reference)).toEqual({
      customer_mail: 'sent',
      owner_mail: 'sent',
      mail_attempts: 1,
    });
  });

  it('keeps the booking when sending fails, and the retry job sends it later', async () => {
    mail.status = 500;
    const { ctx, done } = context();
    const res = await post(booking(), {}, mailEnv(), ctx);
    const { reference } = (await res.json()) as { reference: string };
    expect(res.status).toBe(201);
    await done();
    expect(await mailStatus(reference)).toMatchObject({
      customer_mail: 'failed',
      owner_mail: 'failed',
    });

    mail.status = 201;
    // Fresh bookings are left alone; a few minutes later the job picks them up.
    expect(await retryPendingEmails(mailEnv(), db.sql)).toBe(0);
    const later = new Date(Date.now() + 5 * 60_000);
    expect(await retryPendingEmails(mailEnv(), db.sql, later)).toBe(1);
    expect(await mailStatus(reference)).toEqual({
      customer_mail: 'sent',
      owner_mail: 'sent',
      mail_attempts: 2,
    });
    expect(await retryPendingEmails(mailEnv(), db.sql, later)).toBe(0);
  });

  it('sends nothing and promises nothing when email is not configured', async () => {
    const res = await post(booking());
    expect(await res.json()).toMatchObject({ emailQueued: false });
    expect(mail.sent).toHaveLength(0);
  });

  it('hides the email preview unless it is enabled locally', async () => {
    const preview = (env: Bindings, host: string) =>
      app.request(`http://${host}/api/dev/emails`, {}, env);
    expect((await preview(baseEnv(), 'localhost')).status).toBe(404);
    expect((await preview({ ...baseEnv(), EMAIL_PREVIEW: 'true' }, 'example.hr')).status).toBe(404);
    expect((await preview({ ...baseEnv(), EMAIL_PREVIEW: 'true' }, 'localhost')).status).toBe(200);
  });
});
