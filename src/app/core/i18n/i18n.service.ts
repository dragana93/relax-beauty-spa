import { computed, Injectable, signal } from '@angular/core';
import { LOCALES, type Lang, type Localized } from '../../../../shared/lang';
import { PATHS, type PageId } from '../pages';
import { de } from './de';
import { en } from './en';
import { hr, type Dictionary } from './hr';
import { it } from './it';

const DICTIONARIES: Record<Lang, Dictionary> = { hr, en, de, it };

@Injectable({ providedIn: 'root' })
export class I18n {
  /** Set from the route on every navigation, so the URL decides the language. */
  readonly lang = signal<Lang>('hr');
  readonly page = signal<PageId | 'notFound'>('home');
  readonly t = computed(() => DICTIONARIES[this.lang()]);
  /** Locale for dates. */
  readonly locale = computed(() => LOCALES[this.lang()]);

  dictionary(lang: Lang): Dictionary {
    return DICTIONARIES[lang];
  }

  link(page: PageId): string {
    return PATHS[page][this.lang()];
  }

  pick(text: Localized): string {
    return text[this.lang()];
  }

  /** Formats a "YYYY-MM-DD" studio date without shifting it into the visitor's time zone. */
  formatDate(date: string, options: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(this.locale(), { ...options, timeZone: 'UTC' }).format(
      new Date(`${date}T00:00:00Z`),
    );
  }
}
