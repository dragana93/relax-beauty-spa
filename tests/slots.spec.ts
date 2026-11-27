import { describe, expect, it } from 'vitest';
import { SERVICES } from '../shared/catalog';
import { SCHEDULE } from '../shared/schedule';
import {
  addDays,
  availableStarts,
  bookableDates,
  bookingCells,
  cellsBetween,
  formatTime,
  isValidDate,
  studioTime,
  toInstant,
} from '../shared/slots';

const at = (iso: string) => new Date(iso);
// 2026-12-07 is a Monday (09:00-19:00); 2026-12-12 a Saturday; 2026-12-13 a Sunday.
const now = at('2026-12-01T10:00:00Z');
const starts = (date: string, durationMin = 60, occupied: number[] = [], moment = now) =>
  availableStarts({ date, durationMin, occupied: new Set(occupied), now: moment });

describe('catalog', () => {
  it('has unique ids and durations on the grid', () => {
    expect(new Set(SERVICES.map((s) => s.id)).size).toBe(SERVICES.length);
    for (const s of SERVICES) expect(s.durationMin % SCHEDULE.gridMin).toBe(0);
  });
});

describe('cells', () => {
  it('includes the cleanup buffer', () => {
    expect(bookingCells(600, 60).map(formatTime)).toEqual([
      '10:00',
      '10:15',
      '10:30',
      '10:45',
      '11:00',
    ]);
  });
  it('rounds blocks outward to the grid', () => {
    expect(cellsBetween(605, 631)).toEqual([600, 615, 630]);
  });
});

describe('availableStarts', () => {
  it('fits the booking and buffer inside opening hours', () => {
    const result = starts('2026-12-07');
    expect(result[0]).toBe(9 * 60);
    expect(formatTime(result.at(-1)!)).toBe('17:30');
  });
  it('uses shorter Saturday hours and closes on Sunday', () => {
    expect(formatTime(starts('2026-12-12').at(-1)!)).toBe('12:30');
    expect(starts('2026-12-13')).toEqual([]);
  });
  it('removes every start that overlaps an occupied cell', () => {
    const result = starts('2026-12-07', 60, bookingCells(600, 60)).map(formatTime);
    expect(result).not.toContain('09:00'); // its buffer would reach 10:00
    expect(result).not.toContain('11:00');
    expect(result[0]).toBe('11:30');
  });
  it('enforces the minimum notice', () => {
    const evening = at('2026-12-06T21:00:00Z'); // 22:00 in Zagreb
    expect(formatTime(starts('2026-12-07', 60, [], evening)[0]!)).toBe('10:00');
  });
  it('rejects past dates, dates beyond the window and invalid dates', () => {
    expect(starts('2026-11-30')).toEqual([]);
    expect(starts(addDays('2026-12-01', SCHEDULE.windowDays + 1))).toEqual([]);
    expect(starts('2026-02-30')).toEqual([]);
    expect(isValidDate('2026-13-01')).toBe(false);
  });
  it('offers only open days within the window', () => {
    const dates = bookableDates(now);
    expect(dates[0]).toBe('2026-12-01');
    expect(dates).not.toContain('2026-12-06');
    expect(dates.at(-1)! <= addDays('2026-12-01', SCHEDULE.windowDays)).toBe(true);
  });
});

describe('Europe/Zagreb time', () => {
  it('applies winter and summer offsets', () => {
    expect(toInstant('2026-12-07', 600).toISOString()).toBe('2026-12-07T09:00:00.000Z');
    expect(toInstant('2027-06-07', 600).toISOString()).toBe('2027-06-07T08:00:00.000Z');
  });
  it('is correct on both clock-change days', () => {
    expect(toInstant('2027-03-28', 600).toISOString()).toBe('2027-03-28T08:00:00.000Z');
    expect(toInstant('2026-10-25', 600).toISOString()).toBe('2026-10-25T09:00:00.000Z');
  });
  it('rolls the date over at local midnight', () => {
    expect(studioTime(at('2026-12-07T23:30:00Z'))).toEqual({ date: '2026-12-08', minutes: 30 });
  });
});
