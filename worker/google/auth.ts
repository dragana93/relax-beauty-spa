// Google API access with a service account (no user login). The owner shares her calendar and
// spreadsheet with the service account's email address; see docs/SETUP.md.
import { importPKCS8, SignJWT } from 'jose';
import type { Bindings } from '../http';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ');
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

export class GoogleError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Tokens live one hour; reuse them while this Worker instance is alive. */
let cached: { keyId: string; token: string; expiresAt: number } | null = null;

export function googleEnabled(env: Bindings): boolean {
  return Boolean(env.GOOGLE_SERVICE_ACCOUNT_KEY && (env.GOOGLE_CALENDAR_ID || env.GOOGLE_SHEET_ID));
}

function parseKey(json: string): ServiceAccountKey {
  const key = JSON.parse(json) as Partial<ServiceAccountKey>;
  if (!key.client_email || !key.private_key) throw new Error('Invalid Google service account key');
  return { client_email: key.client_email, private_key: key.private_key };
}

export async function accessToken(env: Bindings, now = Date.now()): Promise<string> {
  const key = parseKey(env.GOOGLE_SERVICE_ACCOUNT_KEY ?? '');
  if (cached && cached.keyId === key.client_email && cached.expiresAt > now + 60_000) {
    return cached.token;
  }
  const assertion = await new SignJWT({ scope: SCOPES })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(key.client_email)
    .setAudience(TOKEN_URL)
    .setIssuedAt(Math.floor(now / 1000))
    .setExpirationTime(Math.floor(now / 1000) + 3600)
    .sign(await importPKCS8(key.private_key, 'RS256'));

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new GoogleError(response.status, 'Google token request failed');
  const body = (await response.json()) as { access_token: string; expires_in: number };
  cached = {
    keyId: key.client_email,
    token: body.access_token,
    expiresAt: now + body.expires_in * 1000,
  };
  return body.access_token;
}

/** Forgets the cached token (used by tests). */
export function resetGoogleToken(): void {
  cached = null;
}

/** An authorized request to a Google API. Throws GoogleError on any non-2xx answer. */
export async function googleFetch(
  env: Bindings,
  url: string,
  init: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<Response> {
  const response = await fetch(url, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${await accessToken(env)}`,
      ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(init.timeoutMs ?? 10_000),
  });
  if (!response.ok) {
    throw new GoogleError(
      response.status,
      `Google API ${init.method ?? 'GET'} failed: ${response.status}`,
    );
  }
  return response;
}
