// `npm run db:reset`: deletes the LOCAL development database (test bookings only).
// Stop `npm start` first; the next `npm start` creates it again, empty.
import { rmSync } from 'node:fs';
import { LOCAL_DB_DIR } from './dev-vars.mjs';

rmSync(LOCAL_DB_DIR, { recursive: true, force: true });
console.log('Local database deleted.');
