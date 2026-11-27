// The only way the Worker talks to the database (Supabase Postgres).
// Production uses postgres.js over Supabase's connection pooler; tests pass an in-memory
// Postgres (PGlite) through the same small interface.
import postgres from 'postgres';

export interface Sql {
  /** Runs one statement with $1, $2 … parameters and returns its rows. */
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  /** Runs `fn` in one transaction: everything is saved, or nothing is. */
  transaction<R>(fn: (tx: Sql) => Promise<R>): Promise<R>;
}

/** Postgres error details, whichever driver raised the error. */
export function pgError(error: unknown): { code?: string; constraint?: string } {
  if (!error || typeof error !== 'object') return {};
  const e = error as { code?: unknown; constraint_name?: unknown; constraint?: unknown };
  return {
    code: typeof e.code === 'string' ? e.code : undefined,
    constraint:
      typeof e.constraint_name === 'string'
        ? e.constraint_name
        : typeof e.constraint === 'string'
          ? e.constraint
          : undefined,
  };
}

type PgClient = postgres.Sql | postgres.TransactionSql;

function wrap(client: PgClient): Sql {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await client.unsafe(text, params as postgres.ParameterOrJSON<never>[])) as T[];
    },
    async transaction<R>(fn: (tx: Sql) => Promise<R>) {
      if (!('begin' in client)) return fn(wrap(client)); // already inside a transaction
      return (await client.begin((tx) => fn(wrap(tx)))) as R;
    },
  };
}

export interface DbEnv {
  /** Supabase connection string (transaction pooler, port 6543). Secret. */
  DATABASE_URL?: string;
  /** Tests inject a ready database here instead of DATABASE_URL. */
  DB?: Sql;
}

/**
 * Opens a connection for one piece of work and closes it afterwards. A Worker cannot reuse a
 * connection across requests, so every request, background task and cron run uses its own.
 */
export async function useDb<R>(env: DbEnv, fn: (db: Sql) => Promise<R>): Promise<R> {
  if (env.DB) return fn(env.DB);
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const client = postgres(env.DATABASE_URL, {
    // Encrypted connection to Supabase, so the password never travels in plain text.
    ssl: /\.supabase\.(com|co)[:/]/.test(env.DATABASE_URL) ? 'require' : false,
    prepare: false, // required by Supabase's transaction pooler
    max: 1,
    fetch_types: false,
    connect_timeout: 10,
  });
  try {
    return await fn(wrap(client));
  } finally {
    await client.end({ timeout: 5 });
  }
}
