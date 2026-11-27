// Studio details, used by the website and the emails.
// Fill in the real values before launch; empty values show "coming soon" or are left out.
import type { Localized } from './lang';

export const STUDIO = {
  name: 'Dijana Savanović – Relax, Beauty and Spa Studio',
  /**
   * Shown under "Contact" and in the confirmation email, and pinned on the Google map below it,
   * for example "Ilica 1, 10000 Zagreb". Empty: "Coming soon" and a map placeholder.
   */
  address: '',
  phone: '',
  /** Public contact address. Customers' replies to confirmation emails go here. */
  email: '',
  /**
   * Optional: what the map pins, if it should differ from `address`. Once the studio has a
   * Google Business Profile, its name as shown on Google Maps also shows the rating and reviews,
   * for example "Relax, Beauty and Spa Studio, Zagreb". Empty: the map uses `address`.
   */
  // TEST ONLY: shows the map with a sample location. Set back to '' before launch.
  mapLocation: 'Trg bana Josipa Jelačića, Zagreb',
  /** Public address such as "https://example.hr". Enables canonical and hreflang links. */
  siteUrl: '',
  /** While true, a preview notice is shown and search engines are asked not to index. */
  sampleContent: true,
  /** Real photos go in public/gallery. Until then, placeholders are shown. */
  gallery: [] as { src: string; alt: Localized }[],
};

const GOOGLE_MAPS = 'https://www.google.com/maps';

const studioLocation = () => STUDIO.mapLocation || STUDIO.address;

/** Opens Google Maps (the app on phones) at the studio. Empty without a location. */
export function mapLink(location = studioLocation()): string {
  const query = location.trim();
  return query ? `${GOOGLE_MAPS}/search/?api=1&query=${encodeURIComponent(query)}` : '';
}

/** The address of the embedded map; free and without an API key. Empty without a location. */
export function mapEmbedUrl(lang: string, location = studioLocation()): string {
  const query = location.trim();
  return query
    ? `${GOOGLE_MAPS}?q=${encodeURIComponent(query)}&hl=${encodeURIComponent(lang)}&z=16&output=embed`
    : '';
}
