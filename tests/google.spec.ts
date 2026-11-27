// Google Calendar (two-way) and Google Sheets, against PGlite. Google's APIs are replaced by a
// fake, so nothing leaves the machine.
import { exportPKCS8, generateKeyPair } from 'jose';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays, bookableDates, toInstant } from '../shared/slots';
import { resetGoogleToken } from '../worker/google/auth';
import { eventId } from '../worker/google/calendar';
import { sheetRow, sheetText } from '../worker/google/sheets';
import { retryPendingSync } from '../worker/google/sync';
import type { Bindings } from '../worker/http';
import { app } from '../worker/index';
import { createTestDb, type TestDb } from './helpers/pglite';

let db: TestDb;
let serviceAccountKey: string;
const date = bookableDates(new Date())[7]!;
const CALENDAR = 'owner@example.com';
const SHEET = 'sheet-123';

beforeAll(async () => {
  db = await createTestDb();
  const { privateKey } = await generateKeyPair('RS256', { extractable: true });
  serviceAccountKey = JSON.stringify({
    client_email: 'booking-bot@project.iam.gserviceaccount.com',
    private_key: await exportPKCS8(privateKey),
  });
}, 60_000);
afterAll(() => db?.pg.close());

interface Call {
  method: string;
  url: string;
  body: unknown;
}

/** A fake Google: records every call; tests can change its answers. */
let calls: Call[];
let google: {
  insertStatus: number;
  sheetStatus: number;
  /** Column A of the "Rezervacije" sheet. */
  sheetColumn: string[][];
  busy: { start: string; end: string }[];
  freeBusyFails: boolean;
};

beforeEach(async () => {
  await db.reset();
  resetGoogleToken();
  calls = [];
  google = {
    insertStatus: 200,
    sheetStatus: 200,
    sheetColumn: [['Broj rezervacije']],
    busy: [],
    freeBusyFails: false,
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
      const url = String(input instanceof Request ? input.url : input);
      const method = init.method ?? 'GET';
      const body =
        typeof init.body === 'string' && init.body.startsWith('{')
          ? JSON.parse(init.body)
          : init.body;
      calls.push({ method, url, body });

      if (url === 'https://oauth2.googleapis.com/token') {
        return Response.json({ access_token: 'token-1', expires_in: 3600 });
      }
      if (url.endsWith('/freeBusy')) {
        if (google.freeBusyFails) return new Response('down', { status: 503 });
        return Response.json({ calendars: { [CALENDAR]: { busy: google.busy } } });
      }
      if (url.includes('/calendar/v3/calendars/')) {
        if (method === 'POST') return new Response('{}', { status: google.insertStatus });
        return Response.json({});
      }
      if (url.includes('sheets.googleapis.com')) {
        if (google.sheetStatus !== 200) return new Response('{}', { status: google.sheetStatus });
        if (method === 'GET') return Response.json({ values: google.sheetColumn });
        return Response.json({});
      }
      throw new Error(`Unexpected request in test: ${url}`);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function googleEnv(overrides: Partial<Bindings> = {}): Bindings {
  return {
    DB: db.sql,
    GOOGLE_SERVICE_ACCOUNT_KEY: serviceAccountKey,
    GOOGLE_CALENDAR_ID: CALENDAR,
    GOOGLE_SHEET_ID: SHEET,
    ...overrides,
  };
}

function context() {
  const tasks: Promise<unknown>[] = [];
  const ctx = {
    waitUntil: (task: Promise<unknown>) => void tasks.push(task),
    passThroughOnException: () => {},
    props: {},
  } as unknown as ExecutionContext;
  return { ctx, done: () => Promise.all(tasks) };
}

async function book(env: Bindings, startMin = 600, ctx?: ExecutionContext) {
  const res = await app.request(
    '/api/bookings',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId: 'relax-massage-60',
        date,
        startMin,
        name: 'Ana Anić',
        email: 'ana@example.com',
        phone: '+385 91 000 0000',
        note: 'Prvi put',
        lang: 'hr',
        privacyAck: true,
        idempotencyKey: crypto.randomUUID(),
      }),
    },
    env,
    ctx,
  );
  return { res, body: (await res.json()) as { reference: string } };
}

async function starts(env: Bindings): Promise<number[]> {
  const res = await app.request(
    `/api/availability?serviceId=relax-massage-60&date=${date}`,
    {},
    env,
  );
  return ((await res.json()) as { starts: number[] }).starts;
}

async function syncState(reference: string) {
  const [row] = await db.sql.query<{
    calendar_sync: string;
    sheet_sync: string;
    sync_attempts: number;
  }>('SELECT calendar_sync, sheet_sync, sync_attempts FROM bookings WHERE reference = $1', [
    reference,
  ]);
  return row;
}

const callsTo = (fragment: string, method?: string) =>
  calls.filter((c) => c.url.includes(fragment) && (!method || c.method === method));

describe('website → Google Calendar and Sheets', () => {
  it('adds an event and a sheet row after a booking', async () => {
    const { ctx, done } = context();
    const { res, body } = await book(googleEnv(), 600, ctx);
    expect(res.status).toBe(201);
    await done();

    const [insert] = callsTo('/events', 'POST');
    const event = insert!.body as Record<string, any>;
    expect(insert!.url).toContain(`/calendars/${encodeURIComponent(CALENDAR)}/events`);
    expect(event['id']).toBe(await eventId(body.reference));
    expect(event['summary']).toBe('Relax masaža – Ana Anić');
    expect(event['description']).toContain(body.reference);
    expect(event['description']).toContain('+385 91 000 0000');
    expect(event['start']).toEqual({ dateTime: `${date}T10:00:00`, timeZone: 'Europe/Zagreb' });
    expect(event['end']).toEqual({ dateTime: `${date}T11:00:00`, timeZone: 'Europe/Zagreb' });

    const [append] = callsTo(':append', 'POST');
    const row = (append!.body as { values: unknown[][] }).values[0]!;
    expect(row.slice(0, 10)).toEqual([
      body.reference,
      date,
      '10:00',
      '11:00',
      'Relax masaža',
      'Ana Anić',
      "'+385 91 000 0000",
      'ana@example.com',
      45,
      'potvrđeno',
    ]);
    expect(row).toHaveLength(11); // columns L–N belong to the owner
    expect(await syncState(body.reference)).toEqual({
      calendar_sync: 'done',
      sheet_sync: 'done',
      sync_attempts: 1,
    });
  });

  it('uses the same event id on every attempt and updates an event that exists', async () => {
    expect(await eventId('RBS-ABC234')).toBe(await eventId('RBS-ABC234'));
    expect(await eventId('RBS-ABC234')).toMatch(/^[a-v0-9]{5,1024}$/);
    expect(await eventId('RBS-ABC234')).not.toBe(await eventId('RBS-ABC235'));

    google.insertStatus = 409;
    const { ctx, done } = context();
    const { body } = await book(googleEnv(), 600, ctx);
    await done();
    const [put] = callsTo(`/events/${await eventId(body.reference)}`, 'PUT');
    expect(put).toBeDefined();
    expect(await syncState(body.reference)).toMatchObject({ calendar_sync: 'done' });
  });

  it('updates the existing sheet row instead of adding a second one', async () => {
    const { ctx, done } = context();
    const { body } = await book(googleEnv({ GOOGLE_CALENDAR_ID: undefined }), 600, ctx);
    await done();
    expect(callsTo(':append')).toHaveLength(1);

    google.sheetColumn = [['Broj rezervacije'], ['RBS-OTHER1'], [body.reference]];
    await db.sql.query("UPDATE bookings SET sheet_sync = 'pending' WHERE reference = $1", [
      body.reference,
    ]);
    calls = [];
    await retryPendingSync(
      googleEnv({ GOOGLE_CALENDAR_ID: undefined }),
      db.sql,
      new Date(Date.now() + 5 * 60_000),
    );
    expect(callsTo(':append')).toHaveLength(0);
    const [update] = callsTo('/values/', 'PUT');
    expect(decodeURIComponent(update!.url)).toContain('Rezervacije!A3:K3');
  });

  it('keeps the booking when Google fails, and the cron job finishes the copies later', async () => {
    google.insertStatus = 500;
    google.sheetStatus = 500;
    const { ctx, done } = context();
    const { res, body } = await book(googleEnv(), 600, ctx);
    expect(res.status).toBe(201);
    await done();
    expect(await syncState(body.reference)).toEqual({
      calendar_sync: 'failed',
      sheet_sync: 'failed',
      sync_attempts: 1,
    });

    google.insertStatus = 200;
    google.sheetStatus = 200;
    expect(await retryPendingSync(googleEnv(), db.sql)).toBe(0); // too fresh
    expect(await retryPendingSync(googleEnv(), db.sql, new Date(Date.now() + 5 * 60_000))).toBe(1);
    expect(await syncState(body.reference)).toEqual({
      calendar_sync: 'done',
      sheet_sync: 'done',
      sync_attempts: 2,
    });
  });

  it('does nothing with Google when it is not configured', async () => {
    const { ctx, done } = context();
    expect((await book({ DB: db.sql }, 600, ctx)).res.status).toBe(201);
    await done();
    expect(calls).toHaveLength(0);
  });
});

describe('cancelling in the database', () => {
  it('frees the time, removes the event and marks the sheet row', async () => {
    const env = googleEnv();
    const { ctx, done } = context();
    const { body } = await book(env, 600, ctx);
    await done();
    expect(await starts(env)).not.toContain(600);

    // What the owner does in the Supabase table editor:
    await db.sql.query("UPDATE bookings SET status = 'cancelled' WHERE reference = $1", [
      body.reference,
    ]);
    expect(await starts(env)).toContain(600);
    expect(await syncState(body.reference)).toEqual({
      calendar_sync: 'pending',
      sheet_sync: 'pending',
      sync_attempts: 0,
    });

    google.sheetColumn = [['Broj rezervacije'], [body.reference]];
    calls = [];
    await retryPendingSync(env, db.sql, new Date(Date.now() + 5 * 60_000));
    expect(callsTo(`/events/${await eventId(body.reference)}`, 'DELETE')).toHaveLength(1);
    const [update] = callsTo('/values/', 'PUT');
    expect(decodeURIComponent(update!.url)).toContain('Rezervacije!A2:K2');
    expect((update!.body as { values: unknown[][] }).values[0]![9]).toBe('otkazano');
    expect(await syncState(body.reference)).toMatchObject({
      calendar_sync: 'done',
      sheet_sync: 'done',
    });

    const [row] = await db.sql.query<{ cancelled_at: string }>(
      'SELECT cancelled_at FROM bookings WHERE reference = $1',
      [body.reference],
    );
    expect(row!.cancelled_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe('Google Calendar → website', () => {
  it('hides times that are busy in the owner calendar', async () => {
    google.busy = [
      {
        start: toInstant(date, 9 * 60).toISOString(),
        end: toInstant(date, 10 * 60 + 30).toISOString(),
      },
    ];
    const free = await starts(googleEnv());
    expect(free).not.toContain(9 * 60);
    expect(free).not.toContain(10 * 60 + 15);
    expect(free[0]).toBe(10 * 60 + 30); // right after the calendar event
    expect((await book(googleEnv(), 9 * 60)).res.status).toBe(409);
  });

  it('blocks the whole day for an event that spans it', async () => {
    google.busy = [
      {
        start: toInstant(addDays(date, -1), 20 * 60).toISOString(),
        end: toInstant(addDays(date, 1), 0).toISOString(),
      },
    ];
    expect(await starts(googleEnv())).toEqual([]);
  });

  it('still offers times from the database when Google is down', async () => {
    google.freeBusyFails = true;
    const free = await starts(googleEnv());
    expect(free[0]).toBe(9 * 60);
  });
});

describe('sheet cells', () => {
  it('neutralizes text a spreadsheet would run as a formula', () => {
    expect(sheetText('=IMPORTXML("http://x")')).toBe(`'=IMPORTXML("http://x")`);
    expect(sheetText('+385 91')).toBe("'+385 91");
    expect(sheetText('Ana')).toBe('Ana');
  });

  it('writes the cancelled status and the booking time', () => {
    const row = sheetRow({
      reference: 'RBS-ABC234',
      status: 'cancelled',
      date: '2026-12-07',
      start_min: 570,
      end_min: 600,
      service_id: 'back-massage-30',
      service_name: 'x',
      price_cents: 2550,
      customer_name: 'Ana',
      email: 'ana@example.com',
      phone: '091 000 0000',
      created_at: '2026-11-27T10:15:30.000Z',
    });
    expect(row).toEqual([
      'RBS-ABC234',
      '2026-12-07',
      '09:30',
      '10:00',
      'Masaža leđa',
      'Ana',
      '091 000 0000',
      'ana@example.com',
      25.5,
      'otkazano',
      '2026-11-27 10:15',
    ]);
  });
});
