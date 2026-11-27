import { bookingCells } from '../../shared/slots';

export interface NewBooking {
  reference: string;
  idempotencyKey: string;
  date: string;
  startMin: number;
  durationMin: number;
  serviceId: string;
  serviceName: string;
  priceCents: number;
  name: string;
  email: string;
  phone: string;
  note: string | null;
  lang: string;
  createdAt: string;
}

export interface StoredBooking {
  reference: string;
  email: string;
  service_id: string;
  date: string;
  start_min: number;
  end_min: number;
  price_cents: number;
}

export async function occupiedCells(db: D1Database, date: string): Promise<Set<number>> {
  const { results } = await db
    .prepare('SELECT slot_min FROM occupied_slots WHERE date = ?')
    .bind(date)
    .all<{ slot_min: number }>();
  return new Set(results.map((row) => row.slot_min));
}

export function findByIdempotencyKey(db: D1Database, key: string): Promise<StoredBooking | null> {
  return db
    .prepare(
      `SELECT reference, email, service_id, date, start_min, end_min, price_cents
       FROM bookings WHERE idempotency_key = ?`,
    )
    .bind(key)
    .first<StoredBooking>();
}

export async function countUpcoming(db: D1Database, email: string, today: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS total FROM bookings
       WHERE email = ? AND date >= ? AND status = 'confirmed'`,
    )
    .bind(email, today)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

/**
 * Writes the booking and the cells it occupies. D1 runs a batch as one transaction,
 * so a single taken cell rolls back everything, including the booking row.
 */
export async function insertBooking(db: D1Database, booking: NewBooking): Promise<void> {
  const insert = db
    .prepare(
      `INSERT INTO bookings (reference, idempotency_key, date, start_min, end_min, service_id,
         service_name, price_cents, customer_name, email, phone, note, lang, privacy_ack_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      booking.reference,
      booking.idempotencyKey,
      booking.date,
      booking.startMin,
      booking.startMin + booking.durationMin,
      booking.serviceId,
      booking.serviceName,
      booking.priceCents,
      booking.name,
      booking.email,
      booking.phone,
      booking.note,
      booking.lang,
      booking.createdAt,
      booking.createdAt,
    );
  const cell = db.prepare(
    'INSERT INTO occupied_slots (date, slot_min, booking_ref) VALUES (?, ?, ?)',
  );

  await db.batch([
    insert,
    ...bookingCells(booking.startMin, booking.durationMin).map((slot) =>
      cell.bind(booking.date, slot, booking.reference),
    ),
  ]);
}

export type Conflict = 'slot' | 'reference' | 'idempotency';

export function conflictType(error: unknown): Conflict | null {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes('UNIQUE constraint failed')) return null;
  if (message.includes('occupied_slots.')) return 'slot';
  if (message.includes('bookings.idempotency_key')) return 'idempotency';
  if (message.includes('bookings.reference')) return 'reference';
  return null;
}
