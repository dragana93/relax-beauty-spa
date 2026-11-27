import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { activeServices, CATEGORIES } from '../../../../shared/catalog';
import { I18n } from '../../core/i18n/i18n.service';
import { ServiceCard } from '../../shared-ui/service-card';

@Component({
  selector: 'app-services',
  imports: [ServiceCard],
  template: `
    @let t = i18n.t();
    <div class="container section">
      <div class="center">
        <h1 class="ornament">{{ t.services.title }}</h1>
        <p class="lead">{{ t.services.lead }}</p>
        <div class="actions filters" role="group" [attr.aria-label]="t.services.filterLabel">
          <button
            type="button"
            class="chip"
            [attr.aria-pressed]="!filter()"
            (click)="filter.set('')"
          >
            {{ t.services.all }}
          </button>
          @for (category of categories; track category.id) {
            <button
              type="button"
              class="chip"
              [attr.aria-pressed]="filter() === category.id"
              (click)="filter.set(category.id)"
            >
              {{ i18n.pick(category.name) }}
            </button>
          }
        </div>
      </div>

      @for (group of groups(); track group.category.id) {
        <section [attr.aria-labelledby]="'cat-' + group.category.id">
          <h2 [id]="'cat-' + group.category.id">{{ i18n.pick(group.category.name) }}</h2>
          <ul class="grid grid--2">
            @for (service of group.services; track service.id) {
              <li><app-service-card [service]="service" /></li>
            }
          </ul>
        </section>
      }
    </div>
  `,
  styles: `
    section {
      margin-top: 2.5rem;
    }
    li {
      display: grid;
    }
  `,
})
export class ServicesPage {
  protected readonly i18n = inject(I18n);
  protected readonly categories = CATEGORIES;
  protected readonly filter = signal('');
  protected readonly groups = computed(() =>
    CATEGORIES.filter((c) => !this.filter() || c.id === this.filter())
      .map((category) => ({ category, services: activeServices(category.id) }))
      .filter((group) => group.services.length),
  );

  constructor() {
    const route = inject(ActivatedRoute);
    afterNextRender(() => {
      const wanted = route.snapshot.queryParamMap.get('category');
      if (CATEGORIES.some((c) => c.id === wanted)) this.filter.set(wanted!);
    });
  }
}
