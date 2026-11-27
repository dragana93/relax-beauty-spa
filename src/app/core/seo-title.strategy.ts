import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { LANGS, type Lang } from '../../../shared/lang';
import { I18n } from './i18n/i18n.service';
import { PATHS, type PageId } from './pages';
import { STUDIO } from './studio';

/** On every navigation: sets the language, title, description and language links. */
@Injectable()
export class SeoTitleStrategy extends TitleStrategy {
  private readonly i18n = inject(I18n);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    let route = snapshot.root;
    while (route.firstChild) route = route.firstChild;
    const lang = (route.data['lang'] as Lang | undefined) ?? 'hr';
    const page = (route.data['page'] as PageId | 'notFound' | undefined) ?? 'notFound';

    this.i18n.lang.set(lang);
    this.i18n.page.set(page);
    this.document.documentElement.lang = lang;

    const { title, description } = this.i18n.dictionary(lang).meta[page];
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    if (STUDIO.sampleContent || page === 'notFound') {
      this.meta.updateTag({ name: 'robots', content: 'noindex' });
    } else {
      this.meta.removeTag('name="robots"');
    }
    this.updateLinks(lang, page);
  }

  private updateLinks(lang: Lang, page: PageId | 'notFound'): void {
    this.document.head.querySelectorAll('link[data-seo]').forEach((el) => el.remove());
    if (!STUDIO.siteUrl || page === 'notFound') return;
    const add = (rel: string, href: string, hreflang?: string) => {
      const link = this.document.createElement('link');
      link.rel = rel;
      link.href = STUDIO.siteUrl + href;
      if (hreflang) link.hreflang = hreflang;
      link.setAttribute('data-seo', '');
      this.document.head.appendChild(link);
    };
    add('canonical', PATHS[page][lang]);
    for (const other of LANGS) add('alternate', PATHS[page][other], other);
  }
}
