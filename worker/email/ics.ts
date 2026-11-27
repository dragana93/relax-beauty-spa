// Calendar file (RFC 5545) attached to the confirmation, so the customer can add the appointment.
import { toInstant } from '../../shared/slots';
import { STUDIO } from '../../shared/studio';
import type { BookingRow } from './templates';

/** 20261130T083000Z */
function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Lines longer than 75 bytes must be folded; never split a multi-byte character. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  for (const char of line) {
    const limit = parts.length ? 74 : 75; // Continuation lines start with a space.
    if (encoder.encode(current + char).length > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function bookingIcs(row: BookingRow): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Relax Beauty and Spa Studio//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${row.reference}@relax-beauty-spa`,
    `DTSTAMP:${utcStamp(new Date(row.created_at))}`,
    `DTSTART:${utcStamp(toInstant(row.date, row.start_min))}`,
    `DTEND:${utcStamp(toInstant(row.date, row.end_min))}`,
    `SUMMARY:${escapeText(`${row.service_name} – ${STUDIO.name}`)}`,
    `DESCRIPTION:${escapeText(row.reference)}`,
    ...(STUDIO.address ? [`LOCATION:${escapeText(STUDIO.address)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Base64 of the UTF-8 bytes, as the email provider expects for attachments. */
export function toBase64(text: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}
