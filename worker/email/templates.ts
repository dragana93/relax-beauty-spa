// Confirmation email for the customer (in their language) and a notice for the owner (Croatian).
// Every value that came from a visitor is escaped. The free-text note goes to the owner only.
import { findService, formatPrice } from '../../shared/catalog';
import { LANG_NAMES, LANGS, LOCALES, type Lang } from '../../shared/lang';
import { SCHEDULE } from '../../shared/schedule';
import { formatTime } from '../../shared/slots';
import { mapLink, STUDIO } from '../../shared/studio';
import { bookingIcs } from './ics';

export interface BookingRow {
  reference: string;
  status: string;
  date: string;
  start_min: number;
  end_min: number;
  service_id: string;
  service_name: string;
  price_cents: number;
  customer_name: string;
  email: string;
  phone: string;
  note: string | null;
  lang: string;
  customer_mail: string;
  owner_mail: string;
  mail_attempts: number;
  created_at: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  ics?: string;
}

const hours = SCHEDULE.cancelCutoffHours;

const CUSTOMER_TEXT = {
  hr: {
    subject: (ref: string) => `Potvrda rezervacije ${ref}`,
    greeting: (name: string) => `Dobar dan, ${name}!`,
    intro: 'Vaš je termin rezerviran. Veselimo se vašem dolasku.',
    reference: 'Broj rezervacije',
    service: 'Tretman',
    date: 'Datum',
    time: 'Vrijeme',
    duration: 'Trajanje',
    price: 'Cijena',
    address: 'Adresa',
    phone: 'Telefon',
    minutes: 'min',
    cancel: `Ako trebate otkazati ili promijeniti termin, javite nam se najkasnije ${hours} sata prije početka i navedite broj rezervacije.`,
    reply: 'Na ovu poruku možete i odgovoriti.',
    calendar: 'U privitku je datoteka za dodavanje termina u kalendar.',
    closing: 'Srdačan pozdrav,',
  },
  en: {
    subject: (ref: string) => `Booking confirmed: ${ref}`,
    greeting: (name: string) => `Hello ${name},`,
    intro: 'Your appointment is booked. We look forward to seeing you.',
    reference: 'Booking number',
    service: 'Treatment',
    date: 'Date',
    time: 'Time',
    duration: 'Duration',
    price: 'Price',
    address: 'Address',
    phone: 'Phone',
    minutes: 'min',
    cancel: `If you need to cancel or change your appointment, please contact us at least ${hours} hours before it starts and give your booking number.`,
    reply: 'You can also reply to this email.',
    calendar: 'The attached file adds the appointment to your calendar.',
    closing: 'Kind regards,',
  },
  de: {
    subject: (ref: string) => `Buchungsbestätigung ${ref}`,
    greeting: (name: string) => `Guten Tag ${name},`,
    intro: 'Ihr Termin ist gebucht. Wir freuen uns auf Ihren Besuch.',
    reference: 'Buchungsnummer',
    service: 'Behandlung',
    date: 'Datum',
    time: 'Uhrzeit',
    duration: 'Dauer',
    price: 'Preis',
    address: 'Adresse',
    phone: 'Telefon',
    minutes: 'Min.',
    cancel: `Wenn Sie den Termin absagen oder ändern möchten, melden Sie sich bitte spätestens ${hours} Stunden vor Beginn und nennen Sie Ihre Buchungsnummer.`,
    reply: 'Sie können auch direkt auf diese E-Mail antworten.',
    calendar: 'Mit der angehängten Datei können Sie den Termin in Ihren Kalender übernehmen.',
    closing: 'Herzliche Grüße',
  },
  it: {
    subject: (ref: string) => `Conferma prenotazione ${ref}`,
    greeting: (name: string) => `Ciao ${name},`,
    intro: 'Il tuo appuntamento è prenotato. Ti aspettiamo!',
    reference: 'Numero di prenotazione',
    service: 'Trattamento',
    date: 'Data',
    time: 'Ora',
    duration: 'Durata',
    price: 'Prezzo',
    address: 'Indirizzo',
    phone: 'Telefono',
    minutes: 'min',
    cancel: `Se devi disdire o spostare l'appuntamento, contattaci almeno ${hours} ore prima dell'inizio indicando il numero di prenotazione.`,
    reply: 'Puoi anche rispondere a questa email.',
    calendar: "Il file allegato aggiunge l'appuntamento al tuo calendario.",
    closing: 'A presto,',
  },
} satisfies Record<Lang, unknown>;

export function bookingLang(row: BookingRow): Lang {
  return (LANGS as readonly string[]).includes(row.lang) ? (row.lang as Lang) : 'hr';
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatLongDate(date: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

/** Customers' replies go to the studio's public address, or else to the owner. */
export function studioReplyTo(ownerEmail?: string): string | undefined {
  return STUDIO.email || ownerEmail || undefined;
}

type Row = [label: string, value: string, href?: string];

/** Table-based layout with inline styles: the form most email programs display reliably. */
function layout(title: string, paragraphsBefore: string[], rows: Row[], paragraphsAfter: string[]) {
  const logo = STUDIO.siteUrl
    ? `<img src="${STUDIO.siteUrl}/brand/logo-email.png" width="280" alt="${escapeHtml(STUDIO.name)}" style="display:block;margin:0 auto 24px;max-width:100%;height:auto;border:0">`
    : `<p style="margin:0 0 24px;text-align:center;font-family:Georgia,serif;font-size:20px;color:#7A5A22">${escapeHtml(STUDIO.name)}</p>`;
  const paragraph = (p: string) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#2E2822">${p}</p>`;
  const tableRows = rows
    .map(([label, value, href]) => {
      const shown = href
        ? `<a href="${escapeHtml(href)}" style="color:#7A5A22">${escapeHtml(value)}</a>`
        : escapeHtml(value);
      return `<tr><td style="padding:8px 12px 8px 0;font-size:14px;color:#6B5F52;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:8px 0;font-size:16px;color:#2E2822">${shown}</td></tr>`;
    })
    .join('');
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#F7F2EA">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F2EA"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFDF9;border:1px solid #E5D9C3;border-radius:12px"><tr><td style="padding:32px 24px;font-family:Arial,Helvetica,sans-serif">
${logo}
${paragraphsBefore.map(paragraph).join('\n')}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;border-top:1px solid #E5D9C3;border-bottom:1px solid #E5D9C3;width:100%">${tableRows}</table>
${paragraphsAfter.map(paragraph).join('\n')}
</td></tr></table>
</td></tr></table>
</body></html>`;
}

function textVersion(before: string[], rows: Row[], after: string[]): string {
  const table = rows.map(([label, value]) => `${label}: ${value}`).join('\n');
  return [...before, table, ...after].join('\n\n') + '\n';
}

export function customerEmail(row: BookingRow, ownerEmail?: string): RenderedEmail {
  const lang = bookingLang(row);
  const t = CUSTOMER_TEXT[lang];
  const duration = row.end_min - row.start_min;
  const rows: Row[] = [
    [t.reference, row.reference],
    [t.service, row.service_name],
    [t.date, formatLongDate(row.date, lang)],
    [t.time, formatTime(row.start_min)],
    [t.duration, `${duration} ${t.minutes}`],
    [t.price, formatPrice(row.price_cents, lang)],
  ];
  if (STUDIO.address) rows.push([t.address, STUDIO.address, mapLink() || undefined]);
  if (STUDIO.phone) rows.push([t.phone, STUDIO.phone, `tel:${STUDIO.phone.replace(/\s/g, '')}`]);

  const after = [t.cancel];
  if (studioReplyTo(ownerEmail)) after.push(t.reply);
  after.push(t.calendar);

  const before = [t.greeting(row.customer_name), t.intro];
  const subject = t.subject(row.reference);
  return {
    subject,
    html: layout(subject, before.map(escapeHtml), rows, [
      ...after.map(escapeHtml),
      `${escapeHtml(t.closing)}<br>${escapeHtml(STUDIO.name)}`,
    ]),
    text: textVersion(before, rows, [...after, `${t.closing}\n${STUDIO.name}`]),
    ics: bookingIcs(row),
  };
}

export function ownerEmail(row: BookingRow): RenderedEmail {
  const serviceName = findService(row.service_id)?.name.hr ?? row.service_name;
  const time = formatTime(row.start_min);
  const rows: Row[] = [
    ['Broj rezervacije', row.reference],
    ['Tretman', serviceName],
    ['Datum', formatLongDate(row.date, 'hr')],
    ['Vrijeme', `${time} – ${formatTime(row.end_min)}`],
    ['Cijena', formatPrice(row.price_cents, 'hr')],
    ['Ime i prezime', row.customer_name],
    ['Telefon', row.phone, `tel:${row.phone.replace(/\s/g, '')}`],
    ['E-mail', row.email, `mailto:${row.email}`],
    ['Jezik', LANG_NAMES[bookingLang(row)]],
  ];
  if (row.note) rows.push(['Napomena', row.note]);

  const subject = `Nova rezervacija: ${row.date} u ${time} – ${serviceName}`;
  const before = ['Stigla je nova online rezervacija.'];
  const after = ['Odgovorom na ovu poruku pišete izravno klijentu.'];
  return {
    subject,
    html: layout(subject, before, rows, after),
    text: textVersion(before, rows, after),
  };
}
