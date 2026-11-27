CREATE TABLE bookings (
  id               INTEGER PRIMARY KEY,
  reference        TEXT NOT NULL UNIQUE,
  idempotency_key  TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  date             TEXT NOT NULL,          -- YYYY-MM-DD, studio local date
  start_min        INTEGER NOT NULL,       -- minutes after local midnight
  end_min          INTEGER NOT NULL,       -- service end, without buffer
  service_id       TEXT NOT NULL,
  service_name     TEXT NOT NULL,          -- snapshot
  price_cents      INTEGER NOT NULL,       -- snapshot
  customer_name    TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT NOT NULL,
  note             TEXT,
  lang             TEXT NOT NULL CHECK (lang IN ('hr','en','de','it')),
  privacy_ack_at   TEXT NOT NULL,
  customer_mail    TEXT NOT NULL DEFAULT 'pending' CHECK (customer_mail IN ('pending','sent','failed')),
  owner_mail       TEXT NOT NULL DEFAULT 'pending' CHECK (owner_mail IN ('pending','sent','failed')),
  mail_attempts    INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL,          -- UTC
  cancelled_at     TEXT
);

CREATE INDEX idx_bookings_date  ON bookings(date, start_min);
CREATE INDEX idx_bookings_email ON bookings(email, date);

CREATE TABLE blocks (
  id         INTEGER PRIMARY KEY,
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
  PRIMARY KEY (date, slot_min),
  CHECK ((booking_ref IS NULL) <> (block_ref IS NULL))
);

CREATE INDEX idx_occupied_booking ON occupied_slots(booking_ref);
CREATE INDEX idx_occupied_block   ON occupied_slots(block_ref);
