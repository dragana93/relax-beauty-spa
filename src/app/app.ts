import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { I18n } from './core/i18n/i18n.service';
import { STUDIO } from './core/studio';
import { Footer } from './layout/footer';
import { Header } from './layout/header';
import { StickyBook } from './layout/sticky-book';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, StickyBook],
  template: `
    <button type="button" class="skip-link" (click)="main.focus()">
      {{ i18n.t().common.skipToContent }}
    </button>
    @if (sample) {
      <p class="sample-notice">{{ i18n.t().common.sampleNotice }}</p>
    }
    <app-header />
    <main #main tabindex="-1"><router-outlet /></main>
    <app-footer />
    <app-sticky-book />
  `,
})
export class App {
  protected readonly i18n = inject(I18n);
  protected readonly sample = STUDIO.sampleContent;
}
