import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CATEGORIES } from '../../../../shared/catalog';
import { OPENING_HOURS } from '../../../../shared/schedule';
import { formatTime } from '../../../../shared/slots';
import { I18n } from '../../core/i18n/i18n.service';
import { STUDIO } from '../../core/studio';

const PLACEHOLDER_COUNT = 8;
const COLLAPSED_COUNT = 4;

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly i18n = inject(I18n);
  protected readonly categories = CATEGORIES;
  protected readonly studio = STUDIO;

  protected readonly expanded = signal(false);
  private readonly gallery = STUDIO.gallery.length
    ? STUDIO.gallery
    : Array.from({ length: PLACEHOLDER_COUNT }, () => null);
  protected readonly canExpand = this.gallery.length > COLLAPSED_COUNT;
  protected readonly photos = computed(() =>
    this.expanded() ? this.gallery : this.gallery.slice(0, COLLAPSED_COUNT),
  );

  /** Monday first, as customary in Croatia. */
  protected readonly hours = [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const open = OPENING_HOURS[day];
    return { day, time: open ? `${formatTime(open.open)} – ${formatTime(open.close)}` : null };
  });
}
