// `npm run db:bookings`: the 50 most recent bookings in the development database: the one in
// .dev.vars (DATABASE_URL), or else the local one (`npm start` must be running).
// In production, use the Supabase table editor.
import postgres from 'postgres';
import { devDatabaseUrl } from './dev-vars.mjs';

const url = devDatabaseUrl();
const sql = postgres(url, { prepare: false, max: 1 });
try {
  const rows = await sql`
    SELECT reference, status, date,
           to_char(make_time(start_min / 60, start_min % 60, 0), 'HH24:MI') AS time,
           service_name, customer_name, email, phone,
           customer_mail AS mail, calendar_sync AS calendar, sheet_sync AS sheet, created_at
    FROM bookings
    ORDER BY date DESC, start_min DESC
    LIMIT 50`;
  console.table(rows);
} finally {
  await sql.end();
}
