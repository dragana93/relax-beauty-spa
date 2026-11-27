import { Component, inject } from '@angular/core';
import { I18n } from '../../core/i18n/i18n.service';
import { STUDIO } from '../../core/studio';

@Component({
  selector: 'app-privacy',
  template: `
    @let t = i18n.t().privacy;
    <article class="container narrow section">
      <h1>{{ t.title }}</h1>
      @if (sample) {
        <p class="card">
          <strong>{{ t.draft }}</strong>
        </p>
      }
      @for (section of t.sections; track $index) {
        <h2>{{ section.h }}</h2>
        <p>{{ section.p }}</p>
      }
    </article>
  `,
  styles: `
    h2 {
      margin-top: 2rem;
      font-size: 1.5rem;
    }
  `,
})
export class Privacy {
  protected readonly i18n = inject(I18n);
  protected readonly sample = STUDIO.sampleContent;
}
