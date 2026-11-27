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
  startStepMin: 15,
  /** Cleanup time reserved after every booking. */
  bufferMin: 15,
  minNoticeHours: 12,
  windowDays: 60,
  cancelCutoffHours: 24,
  maxUpcomingPerEmail: 3,
  /**
   * When the owner gets the list of the next day's bookings (minutes after midnight, local time).
   * 21:00 is the moment the list becomes final: with 12 hours' notice, nobody can book a 09:00
   * appointment after 21:00 the evening before. If a day opens earlier than 09:00, move this
   * earlier too (a test checks the two settings agree).
   */
  digestAtMin: 21 * 60,
} as const;
