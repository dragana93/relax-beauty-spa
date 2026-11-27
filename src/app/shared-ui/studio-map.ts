import { Component, computed, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Consent } from '../core/consent';
import { I18n } from '../core/i18n/i18n.service';
import { mapEmbedUrl, mapLink } from '../core/studio';

/**
 * Google map of the studio. It loads only after the visitor accepts cookies in the banner,
 * because Google then receives their IP address and may set cookies.
 * Without STUDIO.address (or STUDIO.mapLocation) it shows a "Coming soon" placeholder.
 */
@Component({
  selector: 'app-studio-map',
  template: `
    @let t = i18n.t().contact;
    @if (!link) {
      <figure class="map">
        <div class="frame">
          <div class="consent">
            <img src="/brand/logo-mark.svg" width="64" height="64" alt="" />
            <p>{{ t.mapTitle }}: {{ i18n.t().common.comingSoon }}</p>
          </div>
        </div>
      </figure>
    } @else {
      <figure class="map">
        <div class="frame">
          @if (consent.mapsAllowed()) {
            <iframe
              [src]="src()"
              [title]="t.mapTitle"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              allowfullscreen
            ></iframe>
          } @else {
            <div class="consent">
              <img src="/brand/logo-mark.svg" width="64" height="64" alt="" />
              <p>{{ i18n.t().cookies.mapBlocked }}</p>
              <button type="button" class="btn btn--ghost" (click)="consent.reopen()">
                {{ i18n.t().cookies.settings }}
              </button>
            </div>
          }
        </div>
        <figcaption>
          <a [href]="link" target="_blank" rel="noopener">{{ t.map }}</a>
        </figcaption>
      </figure>
    }
  `,
  styles: `
    .map {
      margin: 2rem 0 0;
    }

    .frame {
      overflow: hidden;
      aspect-ratio: 4 / 3;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--sand);

      @media (min-width: 640px) {
        aspect-ratio: 16 / 9;
      }
    }

    iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
    }

    .consent {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      height: 100%;
      padding: 1rem;
      text-align: center;

      img {
        opacity: 0.6;
      }

      p {
        max-width: 32rem;
        margin: 0;
        color: var(--taupe);
        font-size: 0.95rem;
      }
    }

    figcaption {
      margin-top: 0.75rem;
    }
  `,
})
export class StudioMap {
  protected readonly i18n = inject(I18n);
  protected readonly consent = inject(Consent);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly link = mapLink();
  /** Built only from a fixed Google address and an encoded search text, so it is safe to trust. */
  protected readonly src = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(mapEmbedUrl(this.i18n.lang())),
  );
}
