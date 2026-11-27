import type { Lang } from './lang';

export interface AvailabilityResponse {
  date: string;
  serviceId: string;
  /** Start times in minutes after midnight, studio local time. */
  starts: number[];
}

export interface BookingRequest {
  serviceId: string;
  date: string;
  startMin: number;
  name: string;
  email: string;
  phone: string;
  note?: string;
  lang: Lang;
  privacyAck: true;
  idempotencyKey: string;
  /** Honeypot: real visitors never fill this in. */
  website?: string;
}

export interface BookingResponse {
  reference: string;
  serviceId: string;
  date: string;
  startMin: number;
  durationMin: number;
  priceCents: number;
  /** True only when a confirmation email has actually been queued. */
  emailQueued: boolean;
}

export type ApiErrorCode =
  'INVALID' | 'SLOT_TAKEN' | 'LIMIT_REACHED' | 'FORBIDDEN' | 'NOT_FOUND' | 'SERVER_ERROR';

export interface ApiError {
  error: ApiErrorCode;
}
