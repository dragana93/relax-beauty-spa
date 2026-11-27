import { Hono } from 'hono';
import type { AvailabilityResponse } from '../../shared/api-types';
import { findService } from '../../shared/catalog';
import { availableStarts, isValidDate } from '../../shared/slots';
import { occupiedCells } from '../db/bookings';
import { fail, type AppEnv } from '../http';

export const availability = new Hono<AppEnv>().get('/', async (c) => {
  const serviceId = c.req.query('serviceId') ?? '';
  const date = c.req.query('date') ?? '';
  const service = findService(serviceId);
  if (!service || !isValidDate(date)) return fail(c, 422, 'INVALID');

  const starts = availableStarts({
    date,
    durationMin: service.durationMin,
    occupied: await occupiedCells(c.env.DB, date),
    now: new Date(),
  });
  return c.json<AvailabilityResponse>({ date, serviceId, starts });
});
