import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import type { BookingResponse } from '../../shared/api-types';
import { findService } from '../../shared/catalog';
import { LANGS } from '../../shared/lang';
import { SCHEDULE } from '../../shared/schedule';
import { availableStarts, isValidDate, studioTime } from '../../shared/slots';
import { EMAIL_PATTERN, isValidPhone, LIMITS } from '../../shared/validation';
import {
  conflictType,
  countUpcoming,
  findByIdempotencyKey,
  insertBooking,
  occupiedCells,
  type StoredBooking,
} from '../db/bookings';
import { deliverBookingEmails } from '../email/booking-emails';
import { mailEnabled } from '../email/send';
import { fail, type AppEnv } from '../http';
import { createReference } from '../security/reference';

// Unknown fields (for example a tampered price or duration) are stripped by zod.
const bookingSchema = z.object({
  serviceId: z.string().max(60),
  date: z.string().refine(isValidDate),
  startMin: z.number().int().min(0).max(1439),
  name: z.string().trim().min(LIMITS.nameMin).max(LIMITS.nameMax),
  email: z.string().trim().toLowerCase().max(LIMITS.emailMax).regex(EMAIL_PATTERN),
  phone: z.string().trim().refine(isValidPhone),
  note: z.string().trim().max(LIMITS.noteMax).optional(),
  lang: z.enum(LANGS),
  privacyAck: z.literal(true),
  idempotencyKey: z.uuid(),
  website: z.string().max(0).optional(),
});

const MAX_REFERENCE_ATTEMPTS = 3;

function respond(c: Context<AppEnv>, booking: StoredBooking) {
  return c.json<BookingResponse>(
    {
      reference: booking.reference,
      serviceId: booking.service_id,
      date: booking.date,
      startMin: booking.start_min,
      durationMin: booking.end_min - booking.start_min,
      priceCents: booking.price_cents,
      emailQueued: mailEnabled(c.env),
    },
    201,
  );
}

export const bookings = new Hono<AppEnv>().post(
  '/',
  bodyLimit({ maxSize: 8 * 1024, onError: (c) => fail(c, 413, 'INVALID') }),
  async (c) => {
    const parsed = bookingSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return fail(c, 422, 'INVALID');
    const input = parsed.data;

    const service = findService(input.serviceId);
    if (!service) return fail(c, 422, 'INVALID');

    // A retry of an attempt that already succeeded returns the original booking.
    const replay = async () => {
      const existing = await findByIdempotencyKey(c.env.DB, input.idempotencyKey);
      if (!existing) return null;
      const same =
        existing.email === input.email &&
        existing.service_id === input.serviceId &&
        existing.date === input.date &&
        existing.start_min === input.startMin;
      return same ? respond(c, existing) : fail(c, 422, 'INVALID');
    };
    const earlier = await replay();
    if (earlier) return earlier;

    const now = new Date();
    const upcoming = await countUpcoming(c.env.DB, input.email, studioTime(now).date);
    if (upcoming >= SCHEDULE.maxUpcomingPerEmail) return fail(c, 429, 'LIMIT_REACHED');

    const starts = availableStarts({
      date: input.date,
      durationMin: service.durationMin,
      occupied: await occupiedCells(c.env.DB, input.date),
      now,
    });
    if (!starts.includes(input.startMin)) return (await replay()) ?? fail(c, 409, 'SLOT_TAKEN');

    for (let attempt = 1; attempt <= MAX_REFERENCE_ATTEMPTS; attempt++) {
      const reference = createReference();
      try {
        await insertBooking(c.env.DB, {
          reference,
          idempotencyKey: input.idempotencyKey,
          date: input.date,
          startMin: input.startMin,
          durationMin: service.durationMin,
          serviceId: service.id,
          serviceName: service.name[input.lang],
          priceCents: service.priceCents,
          name: input.name,
          email: input.email,
          phone: input.phone,
          note: input.note || null,
          lang: input.lang,
          createdAt: now.toISOString(),
        });
        // Emails go out after the response; failures are retried by the cron trigger.
        if (mailEnabled(c.env)) c.executionCtx.waitUntil(deliverBookingEmails(c.env, reference));
        return respond(c, {
          reference,
          email: input.email,
          service_id: service.id,
          date: input.date,
          start_min: input.startMin,
          end_min: input.startMin + service.durationMin,
          price_cents: service.priceCents,
        });
      } catch (error) {
        const conflict = conflictType(error);
        if (conflict === 'reference') continue;
        // A concurrent copy of this same request may have won the race.
        if (conflict) return (await replay()) ?? fail(c, 409, 'SLOT_TAKEN');
        throw error;
      }
    }
    throw new Error('Could not generate a unique booking reference');
  },
);
