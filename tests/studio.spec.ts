import { describe, expect, it } from 'vitest';
import { mapEmbedUrl, mapLink } from '../shared/studio';

describe('studio map', () => {
  it('shows no map until a location is filled in', () => {
    expect(mapLink('')).toBe('');
    expect(mapLink('   ')).toBe('');
    expect(mapEmbedUrl('hr', '')).toBe('');
  });

  it('builds Google Maps addresses from the location', () => {
    const location = 'Ilica 1, 10000 Zagreb & Co';
    expect(mapLink(location)).toBe(
      'https://www.google.com/maps/search/?api=1&query=Ilica%201%2C%2010000%20Zagreb%20%26%20Co',
    );
    expect(mapEmbedUrl('de', location)).toBe(
      'https://www.google.com/maps?q=Ilica%201%2C%2010000%20Zagreb%20%26%20Co&hl=de&z=16&output=embed',
    );
  });

  it('cannot be turned into another address by the location text', () => {
    const url = new URL(mapEmbedUrl('hr', '"><script>x</script>&output=evil'));
    expect(url.origin).toBe('https://www.google.com');
    expect(url.searchParams.getAll('output')).toEqual(['embed']);
  });
});
