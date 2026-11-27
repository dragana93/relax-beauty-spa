import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatPrice, type Service } from '../../../shared/catalog';
import { I18n } from '../core/i18n/i18n.service';

@Component({
  selector: 'app-service-card',
  imports: [RouterLink],
  host: { class: 'card' },
  template: `
    <h3>{{ i18n.pick(service().name) }}</h3>
    <p class="meta">
      <span>{{ service().durationMin }} {{ i18n.t().common.minutes }}</span>
      <strong>{{ price() }}</strong>
    </p>
    <details>
      <summary>{{ i18n.t().services.details }}</summary>
      <p>{{ i18n.pick(service().description) }}</p>
    </details>
    <a
      class="btn btn--ghost"
      [routerLink]="i18n.link('booking')"
      [queryParams]="{ service: service().id }"
      [attr.aria-label]="i18n.t().common.bookShort + ': ' + i18n.pick(service().name)"
      >{{ i18n.t().common.bookShort }}</a
    >
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      margin: 0;
      color: var(--taupe);
    }
    strong {
      color: var(--gold-deep);
      font-weight: 500;
    }
    details {
      flex: 1;
      margin-block: 0.25rem 0.75rem;
    }
    summary {
      min-height: 44px;
      align-content: center;
      cursor: pointer;
    }
  `,
})
export class ServiceCard {
  protected readonly i18n = inject(I18n);
  readonly service = input.required<Service>();

  protected price(): string {
    return formatPrice(this.service().priceCents, this.i18n.lang());
  }
}
