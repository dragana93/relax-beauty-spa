-- Used by `npm run db:bookings`: upcoming and recent bookings in the LOCAL database.
SELECT
  reference,
  status,
  date,
  printf('%02d:%02d', start_min / 60, start_min % 60) AS time,
  service_name,
  customer_name,
  email,
  phone,
  lang,
  customer_mail AS email_status,
  created_at
FROM bookings
ORDER BY date DESC, start_min DESC
LIMIT 50;
