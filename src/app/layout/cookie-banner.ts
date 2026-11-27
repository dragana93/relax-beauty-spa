import { afterNextRender, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Consent } from '../core/consent';
import { I18n } from '../core/i18n/i18n.service';

/**
 * Cookie notice at the bottom of the screen until the visitor chooses.
 * "Accept" and "Reject" look the same, so rejecting is as easy as accepting (GDPR).
 */
@Component({
  selector: 'app-cookie-banner',
  imports: [RouterLink],
  template: `
    @if (consent.bannerOpen()) {
      @let t = i18n.t().cookies;
      <section class="banner" role="region" [attr.aria-label]="t.label">
        <div class="inner">
          <p>
            {{ t.text }}
            <a [routerLink]="i18n.link('privacy')">{{ t.more }}</a>
          </p>
          <div class="actions">
            <button type="button" class="btn" (click)="consent.set('denied')">
              {{ t.reject }}
            </button>
            <button type="button" class="btn" (click)="consent.set('granted')">
              {{ t.accept }}
            </button>
          </div>
        </div>
      </section>
    }
  `,
  styles: `
    .banner {
      position: fixed;
      inset: auto 0 0;
      z-index: 30;
      padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom));
      background: var(--white);
      border-top: 1px solid var(--line);
      box-shadow: 0 -6px 24px rgb(46 40 34 / 12%);
    }
    .inner {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 1100px;
      margin: 0 auto;

      @media (min-width: 768px) {
        flex-direction: row;
        align-items: center;
        gap: 1.5rem;
      }
    }
    p {
      flex: 1;
      margin: 0;
      color: var(--ink);
      font-size: 0.95rem;
    }
    .actions {
      display: flex;
      gap: 0.75rem;

      .btn {
        flex: 1;
        white-space: nowrap;
      }
    }
  `,
})
export class CookieBanner {
  protected readonly i18n = inject(I18n);
  protected readonly consent = inject(Consent);

  constructor() {
    // After hydration, so the prerendered HTML and the first browser render match.
    afterNextRender(() => this.consent.load());
  }
}
