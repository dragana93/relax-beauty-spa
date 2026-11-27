// Stands in for Brevo (and any other outside service) in tests: nothing leaves the machine.
import { vi } from 'vitest';

export interface SentMail {
  url: string;
  headers: Headers;
  /** The message as a flat record: from, to, subject, html, text, replyTo, messageKey. */
  fields: Record<string, string>;
  /** Attachments, decoded back to text (a byte order mark is kept). */
  attachments: { filename: string; content: string }[];
}

export interface MailStub {
  sent: SentMail[];
  /** HTTP status Brevo answers with. */
  status: number;
}

interface BrevoBody {
  sender: { name?: string; email: string };
  to: { email: string }[];
  subject: string;
  htmlContent: string;
  textContent: string;
  replyTo?: { email: string };
  attachment?: { name: string; content: string }[];
  headers?: Record<string, string>;
}

const fromBase64 = (content: string) =>
  new TextDecoder('utf-8', { ignoreBOM: true }).decode(Buffer.from(content, 'base64'));

/** Replaces fetch. Brevo requests are recorded; `other` answers every other request. */
export function stubBrevo(other?: (url: string, init: RequestInit) => Promise<Response>): MailStub {
  const stub: MailStub = { sent: [], status: 201 };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
      const url = String(input instanceof Request ? input.url : input);
      if (!url.startsWith('https://api.brevo.com/')) {
        if (other) return other(url, init);
        throw new Error(`Unexpected request in test: ${url}`);
      }
      const body = JSON.parse(String(init.body)) as BrevoBody;
      const sender = body.sender.name
        ? `${body.sender.name} <${body.sender.email}>`
        : body.sender.email;
      stub.sent.push({
        url,
        headers: new Headers(init.headers),
        fields: {
          from: sender,
          to: body.to.map((t) => t.email).join(', '),
          subject: body.subject,
          html: body.htmlContent,
          text: body.textContent,
          ...(body.replyTo ? { replyTo: body.replyTo.email } : {}),
          ...(body.headers?.['X-Message-Key'] ? { messageKey: body.headers['X-Message-Key'] } : {}),
        },
        attachments: (body.attachment ?? []).map((a) => ({
          filename: a.name,
          content: fromBase64(a.content),
        })),
      });
      return stub.status < 300
        ? Response.json({ messageId: '<test@brevo>' }, { status: stub.status })
        : Response.json({ code: 'unauthorized', message: 'test failure' }, { status: stub.status });
    }),
  );
  return stub;
}

export const MAIL_ENV = {
  BREVO_API_KEY: 'xkeysib-test',
  MAIL_FROM: 'Relax Studio <rezervacije@example.hr>',
  OWNER_EMAIL: 'owner@example.com',
} as const;
