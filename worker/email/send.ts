// The only place that talks to the email provider (Brevo). Swap providers here.
import type { Bindings } from '../http';

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: { filename: string; content: string; contentType: string }[];
  /**
   * Identifies the message (for example "booking/RBS-…/customer"). Sent as a header so it shows
   * in Brevo's logs. Duplicates are prevented by the status columns in the database.
   */
  idempotencyKey: string;
}

export class EmailError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`Email provider error ${status} ${code}`);
  }
}

export const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

export function mailEnabled(env: Bindings): boolean {
  return Boolean(env.BREVO_API_KEY && env.MAIL_FROM);
}

/** "Studio <rezervacije@example.hr>" or "rezervacije@example.hr" → Brevo's sender object. */
export function parseAddress(value: string): { name?: string; email: string } {
  const match = value.trim().match(/^(.*?)\s*<([^<>]+)>$/);
  if (!match) return { email: value.trim() };
  const name = match[1]!.trim().replace(/^"(.*)"$/, '$1');
  return name ? { name, email: match[2]!.trim() } : { email: match[2]!.trim() };
}

/** Base64 of the UTF-8 bytes, as Brevo expects for attachments. */
export function toBase64(text: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function sendEmail(env: Bindings, email: OutgoingEmail): Promise<void> {
  if (env.BREVO_API_KEY!.startsWith('xsmtpsib-')) {
    // A common mix-up: Brevo's SMTP key only works for SMTP, not for this API.
    throw new EmailError(
      401,
      'BREVO_API_KEY is an SMTP key (xsmtpsib-…). Use an API key (xkeysib-…): ' +
        'Brevo → SMTP & API → API Keys → Generate a new API key',
    );
  }
  const response = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY!,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: parseAddress(env.MAIL_FROM!),
      to: [{ email: email.to }],
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
      replyTo: email.replyTo ? { email: email.replyTo } : undefined,
      attachment: email.attachments?.map((file) => ({
        name: file.filename,
        content: toBase64(file.content),
      })),
      headers: { 'X-Message-Key': email.idempotencyKey },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    // Brevo answers {"code": "...", "message": "..."}; the message may contain addresses,
    // so only the code is kept.
    const body = (await response.json().catch(() => null)) as { code?: string } | null;
    throw new EmailError(response.status, body?.code ?? 'error');
  }
}
