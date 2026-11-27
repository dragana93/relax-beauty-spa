// Field limits enforced by both the booking form and the API.
export const LIMITS = {
  nameMin: 2,
  nameMax: 80,
  emailMax: 120,
  noteMax: 500,
} as const;

export const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;
export const PHONE_PATTERN = /^\+?[0-9 ()/.-]{6,25}$/;
/** Phone numbers have 6 to 15 digits (15 is the international maximum, E.164). */
export const PHONE_DIGITS = { min: 6, max: 15 } as const;

/** Allowed characters only, and a real number of digits ("------" is not a phone number). */
export function isValidPhone(value: string): boolean {
  const phone = value.trim();
  if (!PHONE_PATTERN.test(phone)) return false;
  const digits = phone.replace(/\D/g, '').length;
  return digits >= PHONE_DIGITS.min && digits <= PHONE_DIGITS.max;
}
