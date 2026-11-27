import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ApiError, ApiErrorCode } from '../shared/api-types';
import type { DbEnv, Sql } from './db/sql';

/**
 * Set in .dev.vars locally, and as Worker variables / secrets in Cloudflare in production.
 * Every integration is optional: without its settings it is skipped and bookings still work.
 */
export interface Bindings extends DbEnv {
  /** Brevo API key (secret). Without it (or MAIL_FROM) no emails are sent. */
  BREVO_API_KEY?: string;
  /**
   * Sender verified in Brevo (Senders, domains & dedicated IPs), for example
   * "Relax, Beauty and Spa Studio <rezervacije@example.hr>".
   */
  MAIL_FROM?: string;
  /** Where new-booking notices and the evening list go. Optional. */
  OWNER_EMAIL?: string;
  /** "true" enables the local email preview pages. Never set it in production. */
  EMAIL_PREVIEW?: string;
  /** Google service account key, the whole JSON file (secret). */
  GOOGLE_SERVICE_ACCOUNT_KEY?: string;
  /** The calendar shared with the service account, usually the owner's Gmail address. */
  GOOGLE_CALENDAR_ID?: string;
  /** The spreadsheet id from its URL: docs.google.com/spreadsheets/d/<id>/edit */
  GOOGLE_SHEET_ID?: string;
}

export interface AppEnv {
  Bindings: Bindings;
  Variables: { db: Sql };
}

export function fail(c: Context<AppEnv>, status: ContentfulStatusCode, error: ApiErrorCode) {
  return c.json<ApiError>({ error }, status);
}
