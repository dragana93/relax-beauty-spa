export const LANGS = ['hr', 'en', 'de', 'it'] as const;
export type Lang = (typeof LANGS)[number];
export type Localized = Record<Lang, string>;

/** Each language's name in that language, for the language switch. */
export const LANG_NAMES: Localized = {
  hr: 'Hrvatski',
  en: 'English',
  de: 'Deutsch',
  it: 'Italiano',
};

/** Locale for dates and prices. */
export const LOCALES: Localized = {
  hr: 'hr-HR',
  en: 'en-GB',
  de: 'de-DE',
  it: 'it-IT',
};
