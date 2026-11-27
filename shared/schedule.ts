// Booking rules. Opening hours are SAMPLE values until the studio confirms them.

export interface OpeningHours {
  /** Minutes after midnight, studio local time. */
  open: number;
  close: number;
}

/** Index 0 is Sunday, as in Date.getUTCDay(). null means closed. */
export const OPENING_HOURS: readonly (OpeningHours | null)[] = [
  null,
  { open: 9 * 60, close: 19 * 60 },
  { open: 9 * 60, close: 19 * 60 },
  { open: 9 * 60, close: 19 * 60 },
  { open: 9 * 60, close: 19 * 60 },
  { open: 9 * 60, close: 19 * 60 },
  { open: 9 * 60, close: 14 * 60 },
];

export const SCHEDULE = {
  timeZone: 'Europe/Zagreb',
  /** Size of one stored cell. */
  gridMin: 15,
  /** How often an appointment may start. */
  startStepMin: 30,
  /** Cleanup time reserved after every booking. */
  bufferMin: 15,
  minNoticeHours: 12,
  windowDays: 60,
  cancelCutoffHours: 24,
  maxUpcomingPerEmail: 3,
} as const;
