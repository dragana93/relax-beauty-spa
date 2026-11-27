// Local development settings: .dev.vars (never committed) and the local database.
import { existsSync, readFileSync } from 'node:fs';

/** The local Postgres started by `npm start` when .dev.vars has no DATABASE_URL. */
export const LOCAL_DB_PORT = 54329;
export const LOCAL_DB_DIR = '.wrangler/local-db';
export const LOCAL_DB_URL = `postgres://postgres:postgres@127.0.0.1:${LOCAL_DB_PORT}/postgres`;

/** Reads one setting from .dev.vars. */
export function readDevVar(name) {
  if (!existsSync('.dev.vars')) return undefined;
  for (const line of readFileSync('.dev.vars', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || match[1] !== name) continue;
    let value = match[2];
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    return value;
  }
  return undefined;
}

/** The database the local API uses: Supabase from .dev.vars, or else the local one. */
export function devDatabaseUrl() {
  return process.env.DATABASE_URL || readDevVar('DATABASE_URL') || LOCAL_DB_URL;
}
