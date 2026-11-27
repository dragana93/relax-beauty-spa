-- Relax, Beauty and Spa Studio: bookings database (Supabase Postgres).
-- Dates are 'YYYY-MM-DD' (studio local date) and times are minutes after local midnight.
-- Timestamps are ISO 8601 UTC strings, written by the Worker.

CREATE TABLE bookings (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reference        TEXT NOT NULL UNIQUE,
  idempotency_key  TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  date             TEXT NOT NULL CHECK (date ~ '^\d{4}-\d{2}-\d{2}$'),
  start_min        INTEGER NOT NULL,
  end_min          INTEGER NOT NULL,       -- service end, without the cleanup break
  service_id       TEXT NOT NULL,
  service_name     TEXT NOT NULL,          -- snapshot at booking time
  price_cents      INTEGER NOT NULL,       -- snapshot at booking time
  customer_name    TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT NOT NULL,
  note             TEXT,
  lang             TEXT NOT NULL CHECK (lang IN ('hr','en','de','it')),
  privacy_ack_at   TEXT NOT NULL,
  customer_mail    TEXT NOT NULL DEFAULT 'pending' CHECK (customer_mail IN ('pending','sent','failed')),
  owner_mail       TEXT NOT NULL DEFAULT 'pending' CHECK (owner_mail IN ('pending','sent','failed')),
  mail_attempts    INTEGER NOT NULL DEFAULT 0,
  -- Google Calendar and Google Sheets copies, kept up to date by the Worker and its cron job.
  calendar_sync    TEXT NOT NULL DEFAULT 'pending' CHECK (calendar_sync IN ('pending','done','failed')),
  sheet_sync       TEXT NOT NULL DEFAULT 'pending' CHECK (sheet_sync IN ('pending','done','failed')),
  sync_attempts    INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL,
  cancelled_at     TEXT
);

CREATE INDEX idx_bookings_date  ON bookings(date, start_min);
CREATE INDEX idx_bookings_email ON bookings(email, date);

CREATE TABLE blocks (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id  TEXT NOT NULL UNIQUE,
  date       TEXT NOT NULL,
  start_min  INTEGER NOT NULL,
  end_min    INTEGER NOT NULL,
  reason     TEXT,
  created_at TEXT NOT NULL
);

-- One row per occupied 15-minute cell. The primary key prevents double booking.
CREATE TABLE occupied_slots (
  date        TEXT NOT NULL,
  slot_min    INTEGER NOT NULL,
  booking_ref TEXT REFERENCES bookings(reference) ON DELETE CASCADE,
  block_ref   TEXT REFERENCES blocks(public_id) ON DELETE CASCADE,
  CONSTRAINT occupied_slots_pkey PRIMARY KEY (date, slot_min),
  CHECK ((booking_ref IS NULL) <> (block_ref IS NULL))
);

CREATE INDEX idx_occupied_booking ON occupied_slots(booking_ref);
CREATE INDEX idx_occupied_block   ON occupied_slots(block_ref);

-- One row per day whose booking list was emailed to the owner (the evening before).
CREATE TABLE daily_digests (
  date            TEXT PRIMARY KEY,
  status          TEXT NOT NULL CHECK (status IN ('sent','failed')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  booking_count   INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT NOT NULL,
  sent_at         TEXT
);

-- Cancelling a booking (for example by setting status = 'cancelled' in the Supabase table
-- editor) frees its time and queues the calendar and sheet updates.
CREATE FUNCTION booking_status_changed() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    DELETE FROM occupied_slots WHERE booking_ref = NEW.reference;
    NEW.cancelled_at := COALESCE(
      NEW.cancelled_at,
      to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );
    NEW.calendar_sync := 'pending';
    NEW.sheet_sync := 'pending';
    NEW.sync_attempts := 0;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER booking_status_changed
  BEFORE UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION booking_status_changed();

-- Personal data: only the Worker (direct database connection) may read or write.
-- Row level security without policies blocks the public Supabase API keys completely.
ALTER TABLE bookings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE occupied_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_digests  ENABLE ROW LEVEL SECURITY;
