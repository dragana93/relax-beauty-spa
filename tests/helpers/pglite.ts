// An in-memory Postgres (PGlite) with the real Supabase migrations, behind the Worker's Sql
// interface. No Docker and no network.
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import type { Sql } from '../../worker/db/sql';

const MIGRATIONS = 'supabase/migrations';

function wrap(client: PGlite | Transaction): Sql {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await client.query<T>(text, params)).rows;
    },
    async transaction<R>(fn: (tx: Sql) => Promise<R>) {
      if (!('transaction' in client)) return fn(wrap(client));
      return client.transaction((tx) => fn(wrap(tx)));
    },
  };
}

export interface TestDb {
  sql: Sql;
  pg: PGlite;
  /** Empties every table between tests. */
  reset(): Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
  const pg = new PGlite();
  for (const file of readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    await pg.exec(readFileSync(`${MIGRATIONS}/${file}`, 'utf8'));
  }
  return {
    sql: wrap(pg),
    pg,
    reset: () =>
      pg.exec('TRUNCATE occupied_slots, bookings, blocks, daily_digests RESTART IDENTITY CASCADE'),
  };
}
