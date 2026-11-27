import { Component, ElementRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LANG_NAMES, LANGS, type Lang } from '../../../shared/lang';
import { I18n } from '../core/i18n/i18n.service';
import { PATHS } from '../core/pages';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  host: {
    '(keydown.escape)': 'onEscape()',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class Header {
  protected readonly i18n = inject(I18n);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly open = signal(false);
  protected readonly langOpen = signal(false);

  protected close(): void {
    this.langOpen.set(false);
    this.open.set(false);
  }

  /** Escape closes the language list first, then the menu, and returns focus to its button. */
  protected onEscape(): void {
    if (this.langOpen()) {
      this.langOpen.set(false);
      this.host.nativeElement.querySelector<HTMLElement>('.lang-toggle')?.focus();
    } else {
      this.open.set(false);
    }
  }

  /** A click outside the language menu closes it. */
  protected onDocumentClick(event: Event): void {
    const menu = this.host.nativeElement.querySelector('.lang-menu');
    if (this.langOpen() && !menu?.contains(event.target as Node)) this.langOpen.set(false);
  }
  protected readonly langs = LANGS;
  protected readonly names = LANG_NAMES;

  /** The current page in another language. */
  protected langLink(lang: Lang): string {
    const page = this.i18n.page();
    return PATHS[page === 'notFound' ? 'home' : page][lang];
  }
}
