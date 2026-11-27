import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../core/i18n/i18n.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `
    <footer>
      <div class="container">
        <img src="/brand/logo-compact.svg" width="740" height="164" alt="" loading="lazy" />
        <nav>
          <a [routerLink]="i18n.link('services')">{{ i18n.t().nav.services }}</a>
          <a [routerLink]="i18n.link('booking')">{{ i18n.t().common.book }}</a>
          <a [routerLink]="i18n.link('privacy')">{{ i18n.t().privacy.title }}</a>
        </nav>
        <p>© {{ year }} Dijana Savanović – Relax, Beauty and Spa Studio</p>
      </div>
    </footer>
  `,
  styles: `
    footer {
      padding-block: 2.5rem;
      background: var(--sand);
      text-align: center;
    }
    img {
      width: min(260px, 80%);
      height: auto;
    }
    nav {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      column-gap: 1.5rem;
      margin-block: 1rem;
    }
    nav a {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
    }
    p {
      margin: 0;
      color: var(--taupe);
      font-size: 0.875rem;
    }
  `,
})
export class Footer {
  protected readonly i18n = inject(I18n);
  protected readonly year = new Date().getFullYear();
}
