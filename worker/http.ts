import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ApiError, ApiErrorCode } from '../shared/api-types';

/** Set in .dev.vars locally, and with `wrangler secret put` / dashboard variables in production. */
export interface Bindings {
  DB: D1Database;
  /** Secret. Without it (or MAIL_FROM) no emails are sent and bookings still work. */
  RESEND_API_KEY?: string;
  /** Sender, for example "Relax, Beauty and Spa Studio <rezervacije@example.hr>". */
  MAIL_FROM?: string;
  /** Where new-booking notices go. Optional. */
  OWNER_EMAIL?: string;
  /** "true" enables the local email preview pages. Never set it in production. */
  EMAIL_PREVIEW?: string;
}

export interface AppEnv {
  Bindings: Bindings;
}

export function fail(c: Context<AppEnv>, status: ContentfulStatusCode, error: ApiErrorCode) {
  return c.json<ApiError>({ error }, status);
}
