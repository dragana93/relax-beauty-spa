// The owner's evening email: every booking of the next day, plus a CSV copy for Excel.
// Croatian only. Every value that came from a visitor is escaped (HTML) or neutralized (CSV).
import { findService, formatPrice } from '../../shared/catalog';
import { formatTime } from '../../shared/slots';
import { STUDIO } from '../../shared/studio';
import { isValidPhone } from '../../shared/validation';
import { escapeHtml, formatLongDate } from './templates';

/** One booking of the day, as loaded for the digest. */
export interface DigestRow {
  reference: string;
  status: string;
  start_min: number;
  end_min: number;
  service_id: string;
  service_name: string;
  price_cents: number;
  customer_name: string;
  email: string;
  phone: string;
  note: string | null;
}

export interface RenderedDigest {
  subject: string;
  html: string;
  text: string;
  csv: string;
  csvFilename: string;
}

const serviceName = (row: DigestRow) => findService(row.service_id)?.name.hr ?? row.service_name;
const timeRange = (row: DigestRow) => `${formatTime(row.start_min)} – ${formatTime(row.end_min)}`;

function bookingCard(row: DigestRow, cancelled: boolean): string {
  const muted = cancelled ? 'text-decoration:line-through;color:#8A7F73' : 'color:#2E2822';
  const line = (label: string, value: string) =>
    `<tr><td style="padding:2px 12px 2px 0;font-size:13px;color:#6B5F52;vertical-align:top;white-space:nowrap">${label}</td><td style="padding:2px 0;font-size:15px;color:#2E2822">${value}</td></tr>`;
  const phone = escapeHtml(row.phone);
  const email = escapeHtml(row.email);
  const rows = [
    line('Klijent', escapeHtml(row.customer_name)),
    line(
      'Telefon',
      `<a href="tel:${escapeHtml(row.phone.replace(/\s/g, ''))}" style="color:#7A5A22">${phone}</a>`,
    ),
    line('E-mail', `<a href="mailto:${email}" style="color:#7A5A22">${email}</a>`),
    line('Cijena', escapeHtml(formatPrice(row.price_cents, 'hr'))),
    line('Broj', escapeHtml(row.reference)),
  ];
  if (row.note) rows.push(line('Napomena', escapeHtml(row.note).replaceAll('\n', '<br>')));
  return `<div style="margin:0 0 16px;padding:12px 16px;border:1px solid #E5D9C3;border-radius:8px;background:#FFFFFF">
<p style="margin:0 0 8px;font-size:17px;font-weight:bold;${muted}">${escapeHtml(timeRange(row))} · ${escapeHtml(serviceName(row))}</p>
<table role="presentation" cellpadding="0" cellspacing="0">${rows.join('')}</table></div>`;
}

function bookingText(row: DigestRow): string {
  const lines = [
    `${timeRange(row)}  ${serviceName(row)}`,
    `  Klijent: ${row.customer_name}`,
    `  Telefon: ${row.phone}`,
    `  E-mail: ${row.email}`,
    `  Cijena: ${formatPrice(row.price_cents, 'hr')}`,
    `  Broj: ${row.reference}`,
  ];
  if (row.note) lines.push(`  Napomena: ${row.note.replace(/\s*\n\s*/g, ' / ')}`);
  return lines.join('\n');
}

/**
 * A CSV cell. Excel and other spreadsheets run cells that start with = + - @ as formulas, so
 * those get a leading apostrophe. Valid phone numbers are written as ="…" so that Excel keeps
 * "+385" and leading zeros instead of turning them into a formula or a number.
 */
export function csvCell(value: string, kind: 'text' | 'phone' = 'text'): string {
  const quote = (v: string) => `"${v.replaceAll('"', '""')}"`;
  if (kind === 'phone' && isValidPhone(value)) return `="${value.trim()}"`;
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return quote(safe.replace(/\r?\n/g, ' '));
}

export function digestCsv(rows: DigestRow[]): string {
  const header = [
    'Od',
    'Do',
    'Tretman',
    'Klijent',
    'Telefon',
    'E-mail',
    'Napomena',
    'Cijena (EUR)',
    'Broj rezervacije',
    'Status',
  ];
  const lines = rows.map((row) =>
    [
      csvCell(formatTime(row.start_min)),
      csvCell(formatTime(row.end_min)),
      csvCell(serviceName(row)),
      csvCell(row.customer_name),
      csvCell(row.phone, 'phone'),
      csvCell(row.email),
      csvCell(row.note ?? ''),
      csvCell((row.price_cents / 100).toFixed(2).replace('.', ',')),
      csvCell(row.reference),
      csvCell(row.status === 'cancelled' ? 'otkazano' : 'potvrđeno'),
    ].join(';'),
  );
  // The byte order mark makes Excel read the file as UTF-8 (č ć đ š ž); ";" is the separator
  // Excel expects with Croatian regional settings.
  return '﻿' + [header.map((h) => csvCell(h)).join(';'), ...lines].join('\r\n') + '\r\n';
}

/** `rows` are all bookings of `date` (confirmed and cancelled), in any order. */
export function dailyDigest(date: string, rows: DigestRow[]): RenderedDigest {
  const sorted = [...rows].sort((a, b) => a.start_min - b.start_min);
  const confirmed = sorted.filter((r) => r.status === 'confirmed');
  const cancelled = sorted.filter((r) => r.status === 'cancelled');
  const day = formatLongDate(date, 'hr');
  const total = formatPrice(
    confirmed.reduce((sum, r) => sum + r.price_cents, 0),
    'hr',
  );

  const subject = `Termini za sutra, ${day} (${confirmed.length})`;
  const summary = confirmed.length
    ? `Zakazanih termina: ${confirmed.length} · očekivani prihod: ${total}`
    : 'Za ovaj dan nema zakazanih termina.';
  const attachmentNote = 'U privitku je popis u CSV obliku (otvara se u Excelu).';

  const section = (title: string, list: DigestRow[], isCancelled: boolean) =>
    list.length
      ? `<h2 style="margin:24px 0 12px;font-size:16px;color:#7A5A22">${title}</h2>${list.map((r) => bookingCard(r, isCancelled)).join('\n')}`
      : '';

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#F7F2EA">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F2EA"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFDF9;border:1px solid #E5D9C3;border-radius:12px"><tr><td style="padding:28px 20px;font-family:Arial,Helvetica,sans-serif">
<p style="margin:0 0 4px;font-size:14px;color:#6B5F52">${escapeHtml(STUDIO.name)}</p>
<h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:22px;color:#2E2822">${escapeHtml(day)}</h1>
<p style="margin:0 0 8px;font-size:16px;color:#2E2822">${escapeHtml(summary)}</p>
${section('Termini', confirmed, false)}
${section('Otkazano', cancelled, true)}
<p style="margin:24px 0 0;font-size:13px;color:#6B5F52">${escapeHtml(attachmentNote)}</p>
</td></tr></table>
</td></tr></table>
</body></html>`;

  const textParts = [day, summary];
  if (confirmed.length) textParts.push('TERMINI\n\n' + confirmed.map(bookingText).join('\n\n'));
  if (cancelled.length) textParts.push('OTKAZANO\n\n' + cancelled.map(bookingText).join('\n\n'));
  textParts.push(attachmentNote);

  return {
    subject,
    html,
    text: textParts.join('\n\n') + '\n',
    csv: digestCsv(sorted),
    csvFilename: `termini-${date}.csv`,
  };
}
