// No 0/O or 1/I/L, so references survive being read aloud or typed by hand.
export const REFERENCE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const LENGTH = 6;

export function createReference(): string {
  // Discard bytes above the last full multiple of the alphabet to avoid modulo bias.
  const limit = 256 - (256 % REFERENCE_ALPHABET.length);
  let code = '';
  while (code.length < LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(LENGTH))) {
      if (byte < limit && code.length < LENGTH) {
        code += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
      }
    }
  }
  return `RBS-${code}`;
}
