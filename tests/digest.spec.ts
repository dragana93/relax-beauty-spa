// The owner's evening list of the next day's bookings, against a real Postgres (PGlite, in
// memory). fetch is replaced, so nothing is sent to Brevo.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { OPENING_HOURS, SCHEDULE } from '../shared/schedule';
import { addDays, bookableDates, openingHours, toInstant } from '../shared/slots';
import {
  digestDateDue,
  MAX_DIGEST_ATTEMPTS,
  sendDailyDigestIfDue,
} from '../worker/email/daily-digest';
import { csvCell } from '../worker/email/digest-template';
import type { Bindings } from '../worker/http';
import { app } from '../worker/index';
import { MAIL_ENV, stubBrevo, type MailStub, type SentMail } from './helpers/brevo';
import { createTestDb, type TestDb } from './helpers/pglite';

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
}, 60_000);

afterAll(() => db?.pg.close());

interface Sent {
  idempotencyKey: string | undefined;
  body: {
    to: string[];
    subject: string;
    html: string;
    text: string;
    attachments: { filename: string; content: string }[];
  };
}
let mail: MailStub;
/** The emails sent so far, in a simple shape for the checks below. */
let sent: Sent[];
const view = (m: SentMail): Sent => ({
  idempotencyKey: m.fields['messageKey'],
  body: {
    to: [m.fields['to']!],
    subject: m.fields['subject']!,
    html: m.fields['html']!,
    text: m.fields['text']!,
    attachments: m.attachments,
  },
});

beforeEach(async () => {
  await db.reset();
  mail = stubBrevo();
  // Always shows the current list of emails sent through the stub.
  sent = new Proxy([] as Sent[], {
    get: (_target, key) => Reflect.get(mail.sent.map(view), key),
  });
});
afterEach(() => vi.unstubAllGlobals());

function mailEnv(overrides: Partial<Bindings> = {}): Bindings {
  return { DB: db.sql, ...MAIL_ENV, ...overrides };
}

/** An open day about a week away. */
const day = bookableDates(new Date())[7]!;
/** An instant on the evening before `date`, studio time. */
const eveningBefore = (date: string, minutes = SCHEDULE.digestAtMin) =>
  toInstant(addDays(date, -1), minutes);
const closedDay = (() => {
  let d = day;
  while (openingHours(d) !== null) d = addDays(d, 1);
  return d;
})();

let counter = 0;
async function insert(row: {
  date?: string;
  start: number;
  name?: string;
  phone?: string;
  note?: string | null;
  status?: 'confirmed' | 'cancelled';
  price?: number;
}) {
  const reference = `RBS-T${String(++counter).padStart(5, '0')}`;
  await db.sql.query(
    `INSERT INTO bookings (reference, idempotency_key, status, date, start_min, end_min, service_id,
       service_name, price_cents, customer_name, email, phone, note, lang, privacy_ack_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'relax-massage-60', 'Relax masaža', $7, $8, $9, $10, $11, 'hr', $12, $13)`,
    [
      reference,
      crypto.randomUUID(),
      row.status ?? 'confirmed',
      row.date ?? day,
      row.start,
      row.start + 60,
      row.price ?? 4500,
      row.name ?? 'Ana Anić',
      `${reference.toLowerCase()}@example.com`,
      row.phone ?? '+385 91 000 0000',
      row.note ?? null,
      new Date().toISOString(),
      new Date().toISOString(),
    ],
  );
  return reference;
}

const csvOf = (m: Sent) => m.body.attachments[0]!.content;

async function digestRow(date = day) {
  const [row] = await db.sql.query<{
    status: string;
    attempts: number;
    booking_count: number;
    sent_at: string | null;
  }>('SELECT status, attempts, booking_count, sent_at FROM daily_digests WHERE date = $1', [date]);
  return row;
}

describe('when the evening list is due', () => {
  it('is not due before the send time and is due for tomorrow from then on', () => {
    expect(digestDateDue(eveningBefore(day, SCHEDULE.digestAtMin - 1))).toBeNull();
    expect(digestDateDue(eveningBefore(day))).toBe(day);
    expect(digestDateDue(eveningBefore(day, 23 * 60 + 59))).toBe(day);
    expect(digestDateDue(toInstant(day, 0))).toBeNull();
  });

  it.each([
    ['the autumn clock change', '2026-10-25'],
    ['the day after the autumn change', '2026-10-26'],
    ['the spring clock change', '2027-03-28'],
    ['the day after the spring change', '2027-03-29'],
  ])('picks the right day around %s', (_label, date) => {
    expect(digestDateDue(eveningBefore(date))).toBe(date);
    expect(digestDateDue(eveningBefore(date, SCHEDULE.digestAtMin - 1))).toBeNull();
  });

  it('sends only after the list is final (nobody can book the next day later)', () => {
    for (const hours of OPENING_HOURS) {
      if (!hours) continue;
      const lastBookingMoment = 24 * 60 + hours.open - SCHEDULE.minNoticeHours * 60;
      expect(lastBookingMoment).toBeLessThanOrEqual(SCHEDULE.digestAtMin);
    }
  });
});

describe('sendDailyDigestIfDue', () => {
  it('sends nothing before the send time', async () => {
    await insert({ start: 600 });
    expect(await sendDailyDigestIfDue(mailEnv(), db.sql, eveningBefore(day, 20 * 60 + 45))).toBe(
      'not-due',
    );
    expect(sent).toHaveLength(0);
  });

  it('sends nothing when email or the owner address is not configured', async () => {
    await insert({ start: 600 });
    const now = eveningBefore(day);
    expect(await sendDailyDigestIfDue({ DB: db.sql }, db.sql, now)).toBe('disabled');
    expect(await sendDailyDigestIfDue(mailEnv({ OWNER_EMAIL: undefined }), db.sql, now)).toBe(
      'disabled',
    );
    expect(sent).toHaveLength(0);
  });

  it('emails the owner every booking of the next day, sorted, with cancellations apart', async () => {
    const late = await insert({ start: 900, name: 'Zora Zorić', price: 6000 });
    const early = await insert({ start: 540, name: 'Iva Ivić', note: 'Alergija na lavandu' });
    const cancelled = await insert({ start: 720, name: 'Maja Majić', status: 'cancelled' });
    await insert({ date: addDays(day, 1), start: 600, name: 'Drugi Dan' });

    expect(await sendDailyDigestIfDue(mailEnv(), db.sql, eveningBefore(day))).toBe('sent');
    expect(sent).toHaveLength(1);
    const mail = sent[0]!;
    expect(mail.body.to).toEqual(['owner@example.com']);
    expect(mail.body.subject).toMatch(/^Termini za sutra, .+ \(2\)$/);
    expect(mail.idempotencyKey).toMatch(new RegExp(`^digest/${day}/[0-9a-f]{16}$`));

    const { html, text } = mail.body;
    expect(html.indexOf(early)).toBeLessThan(html.indexOf(late));
    expect(html.indexOf(late)).toBeLessThan(html.indexOf('Otkazano'));
    expect(html.indexOf('Otkazano')).toBeLessThan(html.indexOf(cancelled));
    expect(html).toContain('09:00 – 10:00');
    expect(html).toContain('tel:+385910000000');
    expect(html).toContain('Alergija na lavandu');
    expect(html).toMatch(/105\s?€/); // 45 € + 60 €, the cancelled one not counted
    expect(html).not.toContain('Drugi Dan');
    expect(text).toContain('Iva Ivić');
    expect(text).toContain('OTKAZANO');

    const attachment = mail.body.attachments[0]!;
    expect(attachment.filename).toBe(`termini-${day}.csv`);
    const csv = csvOf(mail);
    expect(csv.startsWith('﻿"Od";"Do";"Tretman"')).toBe(true);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(4); // header + 3 bookings of the day
    expect(lines[1]).toContain('"Iva Ivić"');
    expect(lines[1]).toContain('="+385 91 000 0000"');
    expect(lines[1]).toContain('"45,00"');
    expect(lines[2]).toContain('"otkazano"');

    expect(await digestRow()).toMatchObject({ status: 'sent', attempts: 1, booking_count: 2 });
  });

  it('sends a day only once', async () => {
    await insert({ start: 600 });
    expect(await sendDailyDigestIfDue(mailEnv(), db.sql, eveningBefore(day))).toBe('sent');
    expect(
      await sendDailyDigestIfDue(mailEnv(), db.sql, eveningBefore(day, SCHEDULE.digestAtMin + 15)),
    ).toBe('already-sent');
    expect(sent).toHaveLength(1);
  });

  it('sends a short note on an open day without bookings', async () => {
    expect(await sendDailyDigestIfDue(mailEnv(), db.sql, eveningBefore(day))).toBe('sent');
    expect(sent[0]!.body.subject).toMatch(/\(0\)$/);
    expect(sent[0]!.body.html).toContain('nema zakazanih termina');
    expect(csvOf(sent[0]!).trim().split('\r\n')).toHaveLength(1);
  });

  it('skips a closed day without bookings', async () => {
    expect(await sendDailyDigestIfDue(mailEnv(), db.sql, eveningBefore(closedDay))).toBe('closed');
    expect(sent).toHaveLength(0);
  });

  it('retries a failed send on the next run and stops after the last attempt', async () => {
    await insert({ start: 600 });
    mail.status = 500;
    for (let i = 0; i < MAX_DIGEST_ATTEMPTS; i++) {
      const now = eveningBefore(day, SCHEDULE.digestAtMin + i * 15);
      expect(await sendDailyDigestIfDue(mailEnv(), db.sql, now)).toBe('failed');
    }
    expect(await digestRow()).toMatchObject({ status: 'failed', attempts: MAX_DIGEST_ATTEMPTS });
    expect(await sendDailyDigestIfDue(mailEnv(), db.sql, eveningBefore(day, 23 * 60))).toBe(
      'gave-up',
    );
    expect(sent).toHaveLength(MAX_DIGEST_ATTEMPTS);
  });

  it('sends on the next run after a failure', async () => {
    await insert({ start: 600 });
    mail.status = 500;
    expect(await sendDailyDigestIfDue(mailEnv(), db.sql, eveningBefore(day))).toBe('failed');
    mail.status = 200;
    expect(
      await sendDailyDigestIfDue(mailEnv(), db.sql, eveningBefore(day, SCHEDULE.digestAtMin + 15)),
    ).toBe('sent');
    expect(await digestRow()).toMatchObject({ status: 'sent', attempts: 2 });
  });

  it('includes a booking made through the API', async () => {
    const date = bookableDates(new Date())[7]!;
    const res = await app.request(
      '/api/bookings',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: 'relax-massage-60',
          date,
          startMin: 600,
          name: 'Petra Perić',
          email: 'petra@example.com',
          phone: '091 234 5678',
          lang: 'hr',
          privacyAck: true,
          idempotencyKey: crypto.randomUUID(),
        }),
      },
      { DB: db.sql },
    );
    expect(res.status).toBe(201);
    const { reference } = (await res.json()) as { reference: string };

    expect(await sendDailyDigestIfDue(mailEnv(), db.sql, eveningBefore(date))).toBe('sent');
    const mail = sent[0]!;
    expect(mail.body.html).toContain(reference);
    expect(mail.body.html).toContain('Petra Perić');
    expect(mail.body.html).toContain('petra@example.com');
    expect(csvOf(mail)).toContain('="091 234 5678"');
  });

  it('escapes what customers typed', async () => {
    await insert({
      start: 600,
      name: '<script>alert(1)</script>',
      note: '<img src=x onerror=alert(1)>',
    });
    await sendDailyDigestIfDue(mailEnv(), db.sql, eveningBefore(day));
    const { html } = sent[0]!.body;
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('CSV cells', () => {
  it.each([
    ['=HYPERLINK("http://x")', `"'=HYPERLINK(""http://x"")"`],
    ['+1+2', `"'+1+2"`],
    ['-2', `"'-2"`],
    ['@SUM(A1)', `"'@SUM(A1)"`],
    ['Ana "Anči" Anić', '"Ana ""Anči"" Anić"'],
    ['red 1\nred 2', '"red 1 red 2"'],
  ])('neutralizes %j', (value, expected) => {
    expect(csvCell(value)).toBe(expected);
  });

  it('keeps valid phone numbers as text and treats anything else as a plain cell', () => {
    expect(csvCell('+385 91 000 0000', 'phone')).toBe('="+385 91 000 0000"');
    expect(csvCell('=1+1', 'phone')).toBe(`"'=1+1"`);
  });
});

describe('digest preview', () => {
  it('is hidden unless enabled locally', async () => {
    const res = await app.request(`http://example.com/api/dev/digest/${day}`, {}, mailEnv());
    expect(res.status).toBe(404);
  });

  it('shows the list and the CSV locally', async () => {
    await insert({ start: 600, name: 'Ana Anić' });
    const env = mailEnv({ EMAIL_PREVIEW: 'true' });
    const html = await app.request(`http://localhost/api/dev/digest/${day}`, {}, env);
    expect(await html.text()).toContain('Ana Anić');
    const csv = await app.request(`http://localhost/api/dev/digest/${day}.csv`, {}, env);
    expect(csv.headers.get('Content-Type')).toContain('text/csv');
    expect(await csv.text()).toContain('Ana Anić');
    expect(sent).toHaveLength(0);
  });
});
