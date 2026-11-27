import { bookingCells } from '../../shared/slots';
import { pgError, type Sql } from './sql';

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

export async function occupiedCells(db: Sql, date: string): Promise<Set<number>> {
  const rows = await db.query<{ slot_min: number }>(
    'SELECT slot_min FROM occupied_slots WHERE date = $1',
    [date],
  );
  return new Set(rows.map((row) => row.slot_min));
}

export async function findByIdempotencyKey(db: Sql, key: string): Promise<StoredBooking | null> {
  const [row] = await db.query<StoredBooking>(
    `SELECT reference, email, service_id, date, start_min, end_min, price_cents
     FROM bookings WHERE idempotency_key = $1`,
    [key],
  );
  return row ?? null;
}

export async function countUpcoming(db: Sql, email: string, today: string): Promise<number> {
  const [row] = await db.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM bookings
     WHERE email = $1 AND date >= $2 AND status = 'confirmed'`,
    [email, today],
  );
  return row?.total ?? 0;
}

/**
 * Writes the booking and the cells it occupies in one transaction, so a single taken cell
 * rolls back everything, including the booking row.
 */
export async function insertBooking(db: Sql, booking: NewBooking): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.query(
      `INSERT INTO bookings (reference, idempotency_key, date, start_min, end_min, service_id,
         service_name, price_cents, customer_name, email, phone, note, lang, privacy_ack_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
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
      ],
    );
    const cells = bookingCells(booking.startMin, booking.durationMin);
    await tx.query(
      `INSERT INTO occupied_slots (date, slot_min, booking_ref)
       SELECT $1, cell, $2 FROM unnest($3::int[]) AS cell`,
      // A Postgres array literal works the same with every driver.
      [booking.date, booking.reference, `{${cells.join(',')}}`],
    );
  });
}

export type Conflict = 'slot' | 'reference' | 'idempotency';

/** Which unique rule a failed insert broke, or null for any other error. */
export function conflictType(error: unknown): Conflict | null {
  const { code, constraint } = pgError(error);
  if (code !== '23505') return null; // unique_violation
  if (constraint === 'occupied_slots_pkey') return 'slot';
  if (constraint === 'bookings_idempotency_key_key') return 'idempotency';
  if (constraint === 'bookings_reference_key') return 'reference';
  return null;
}
