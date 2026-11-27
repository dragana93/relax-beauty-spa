import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../core/i18n/i18n.service';

/** Mobile-only booking button fixed to the bottom of the screen. */
@Component({
  selector: 'app-sticky-book',
  imports: [RouterLink],
  template: `
    @if (i18n.page() !== 'booking') {
      <div class="spacer"></div>
      <div class="dock">
        <a class="btn" [routerLink]="i18n.link('booking')">{{ i18n.t().common.book }}</a>
      </div>
    }
  `,
  styles: `
    .spacer {
      height: 76px;
      background: var(--sand);
    }
    .dock {
      position: fixed;
      inset: auto 0 0;
      z-index: 15;
      padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
      background: var(--ivory);
      border-top: 1px solid var(--line);
    }
    .btn {
      display: flex;
      width: 100%;
    }
    @media (min-width: 1024px) {
      .spacer,
      .dock {
        display: none;
      }
    }
  `,
})
export class StickyBook {
  protected readonly i18n = inject(I18n);
}
