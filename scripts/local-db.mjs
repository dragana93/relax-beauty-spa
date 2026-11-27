// `npm run start:db` (part of `npm start`): a local Postgres for development, so the website
// works on this computer without a Supabase account. Data is kept in .wrangler/local-db
// (ignored by git) and survives restarts; `npm run db:reset` deletes it.
// Not used when .dev.vars has a DATABASE_URL (then the API talks to that Supabase project).
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { LOCAL_DB_DIR, LOCAL_DB_PORT, readDevVar } from './dev-vars.mjs';

if (readDevVar('DATABASE_URL')) {
  console.log('DATABASE_URL is set in .dev.vars: using that database, no local database started.');
  setInterval(() => {}, 1 << 30); // stay running, `npm start` stops everything when one part exits
} else {
  mkdirSync(LOCAL_DB_DIR, { recursive: true });
  const db = new PGlite(LOCAL_DB_DIR);

  // Apply new files from supabase/migrations once, in order.
  await db.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
  const done = new Set(
    (await db.query('SELECT name FROM local_migrations')).rows.map((row) => row.name),
  );
  for (const file of readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    if (done.has(file)) continue;
    await db.transaction(async (tx) => {
      await tx.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
      await tx.query('INSERT INTO local_migrations (name) VALUES ($1)', [file]);
    });
    console.log(`Applied ${file}`);
  }

  const server = new PGLiteSocketServer({ db, port: LOCAL_DB_PORT, host: '127.0.0.1' });
  await server.start();
  console.log(`Local database ready on port ${LOCAL_DB_PORT} (data in ${LOCAL_DB_DIR}).`);

  const stop = async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
