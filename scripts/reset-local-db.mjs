// Deletes the LOCAL development database only (test bookings). Stop `npm start` first.
// `npm run db:reset` then re-creates it from the migrations.
import { rmSync } from 'node:fs';

rmSync('.wrangler/state/v3/d1', { recursive: true, force: true });
console.log('Local database removed.');
