// The only place that talks to the email provider (Resend). Swap providers here.
import type { Bindings } from '../http';

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: { filename: string; content: string }[];
  /** Resend ignores repeats of the same key for 24 hours, so a retry never sends twice. */
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

export function mailEnabled(env: Bindings): boolean {
  return Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
}

export async function sendEmail(env: Bindings, email: OutgoingEmail): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': email.idempotencyKey,
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      reply_to: email.replyTo,
      attachments: email.attachments,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { name?: string } | null;
    throw new EmailError(response.status, body?.name ?? 'unknown');
  }
}
