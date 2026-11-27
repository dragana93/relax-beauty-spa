import { Hono } from 'hono';
import type { AvailabilityResponse } from '../../shared/api-types';
import { findService } from '../../shared/catalog';
import { availableStarts, isValidDate } from '../../shared/slots';
import { occupiedCells } from '../db/bookings';
import type { Sql } from '../db/sql';
import { calendarBusyCells } from '../google/calendar';
import { fail, type AppEnv, type Bindings } from '../http';

/** Cells taken by website bookings plus cells marked busy in the owner's Google Calendar. */
export async function takenCells(env: Bindings, db: Sql, date: string): Promise<Set<number>> {
  const [booked, busy] = await Promise.all([occupiedCells(db, date), calendarBusyCells(env, date)]);
  return new Set([...booked, ...busy]);
}

export const availability = new Hono<AppEnv>().get('/', async (c) => {
  const serviceId = c.req.query('serviceId') ?? '';
  const date = c.req.query('date') ?? '';
  const service = findService(serviceId);
  if (!service || !isValidDate(date)) return fail(c, 422, 'INVALID');

  const starts = availableStarts({
    date,
    durationMin: service.durationMin,
    occupied: await takenCells(c.env, c.var.db, date),
    now: new Date(),
  });
  return c.json<AvailabilityResponse>({ date, serviceId, starts });
});
