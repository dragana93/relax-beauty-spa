// The production database path: postgres.js over a real Postgres network connection (PGlite
// served on a local port), through useDb() exactly as the Worker uses it with Supabase.
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  conflictType,
  countUpcoming,
  findByIdempotencyKey,
  insertBooking,
  occupiedCells,
  type NewBooking,
} from '../worker/db/bookings';
import { useDb } from '../worker/db/sql';
import { createTestDb, type TestDb } from './helpers/pglite';

let db: TestDb;
let server: PGLiteSocketServer;
const PORT = 55432;
const env = { DATABASE_URL: `postgres://postgres:postgres@127.0.0.1:${PORT}/postgres` };

beforeAll(async () => {
  db = await createTestDb();
  server = new PGLiteSocketServer({ db: db.pg, port: PORT, host: '127.0.0.1' });
  await server.start();
}, 60_000);

afterAll(async () => {
  await server?.stop();
  await db?.pg.close();
});

beforeEach(() => db.reset());

function booking(overrides: Partial<NewBooking> = {}): NewBooking {
  return {
    reference: 'RBS-AAAAAA',
    idempotencyKey: crypto.randomUUID(),
    date: '2026-12-07',
    startMin: 600,
    durationMin: 60,
    serviceId: 'relax-massage-60',
    serviceName: 'Relax masaža',
    priceCents: 4500,
    name: 'Ana Anić',
    email: 'ana@example.com',
    phone: '+385 91 000 0000',
    note: null,
    lang: 'hr',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('postgres.js driver (production path)', () => {
  it('saves a booking with its cells and reads it back', async () => {
    const key = crypto.randomUUID();
    await useDb(env, (sql) => insertBooking(sql, booking({ idempotencyKey: key })));
    await useDb(env, async (sql) => {
      expect([...(await occupiedCells(sql, '2026-12-07'))].sort()).toEqual([
        600, 615, 630, 645, 660,
      ]);
      expect(await countUpcoming(sql, 'ana@example.com', '2026-12-01')).toBe(1);
      expect(await findByIdempotencyKey(sql, key)).toMatchObject({
        reference: 'RBS-AAAAAA',
        start_min: 600,
        price_cents: 4500,
      });
    });
  });

  it('reports a taken time as a slot conflict and rolls the whole booking back', async () => {
    await useDb(env, (sql) => insertBooking(sql, booking()));
    const error = await useDb(env, (sql) =>
      insertBooking(sql, booking({ reference: 'RBS-BBBBBB', startMin: 630 })),
    ).then(
      () => null,
      (e: unknown) => e,
    );
    expect(conflictType(error)).toBe('slot');
    const [row] = await db.sql.query<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM bookings WHERE reference = 'RBS-BBBBBB'",
    );
    expect(row!.n).toBe(0);
  });

  it('reports a repeated idempotency key and booking number', async () => {
    const first = booking();
    await useDb(env, (sql) => insertBooking(sql, first));
    const again = (b: NewBooking) =>
      useDb(env, (sql) => insertBooking(sql, b)).then(
        () => null,
        (e: unknown) => conflictType(e),
      );
    expect(
      await again(
        booking({ reference: 'RBS-CCCCCC', idempotencyKey: first.idempotencyKey, startMin: 900 }),
      ),
    ).toBe('idempotency');
    expect(await again(booking({ startMin: 900 }))).toBe('reference');
  });

  it('passes null, boolean and text parameters through', async () => {
    const rows = await useDb(env, (sql) =>
      sql.query<{ a: string | null; b: boolean; c: string }>(
        'SELECT $1::text AS a, $2::boolean AS b, $3::text AS c',
        [null, true, 'č ć đ š ž'],
      ),
    );
    expect(rows).toEqual([{ a: null, b: true, c: 'č ć đ š ž' }]);
  });
});
