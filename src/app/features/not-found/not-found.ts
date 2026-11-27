import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="container narrow section center">
      <h1 class="ornament">{{ i18n.t().notFound.title }}</h1>
      <p>{{ i18n.t().notFound.text }}</p>
      <a class="btn" [routerLink]="i18n.link('home')">{{ i18n.t().booking.backHome }}</a>
    </div>
  `,
})
export class NotFound {
  protected readonly i18n = inject(I18n);
}
