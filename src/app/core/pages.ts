import type { Lang } from '../../../shared/lang';

export type PageId = 'home' | 'services' | 'booking' | 'privacy';

export const PATHS: Record<PageId, Record<Lang, string>> = {
  home: { hr: '/', en: '/en', de: '/de', it: '/it' },
  services: { hr: '/usluge', en: '/en/services', de: '/de/leistungen', it: '/it/servizi' },
  booking: { hr: '/rezervacija', en: '/en/booking', de: '/de/termin', it: '/it/prenotazione' },
  privacy: { hr: '/privatnost', en: '/en/privacy', de: '/de/datenschutz', it: '/it/privacy' },
};
