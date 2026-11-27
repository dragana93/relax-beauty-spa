// Studio details, used by the website and the emails.
// Fill in the real values before launch; empty values show "coming soon" or are left out.
import type { Localized } from './lang';

export const STUDIO = {
  name: 'Dijana Savanović – Relax, Beauty and Spa Studio',
  address: '',
  phone: '',
  /** Public contact address. Customers' replies to confirmation emails go here. */
  email: '',
  mapUrl: '',
  /** Public address such as "https://example.hr". Enables canonical and hreflang links. */
  siteUrl: '',
  /** While true, a preview notice is shown and search engines are asked not to index. */
  sampleContent: true,
  /** Real photos go in public/gallery. Until then, placeholders are shown. */
  gallery: [] as { src: string; alt: Localized }[],
};
