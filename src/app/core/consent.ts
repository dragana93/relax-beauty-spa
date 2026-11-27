import { computed, Injectable, signal } from '@angular/core';

export type ConsentChoice = 'granted' | 'denied';

/** Bump the version when the cookie notice changes in a way visitors must see again. */
const STORAGE_KEY = 'rbs-cookie-consent';
const VERSION = 1;

/**
 * The visitor's choice about third-party cookies (Google Maps). Kept in localStorage only,
 * never sent to the server. On the server and before `load()` the choice is unknown, so the
 * prerendered pages never contain the banner or the map, and nothing reaches Google early.
 */
@Injectable({ providedIn: 'root' })
export class Consent {
  private readonly loaded = signal(false);
  private readonly reopened = signal(false);
  readonly choice = signal<ConsentChoice | null>(null);

  readonly mapsAllowed = computed(() => this.choice() === 'granted');
  readonly bannerOpen = computed(
    () => this.loaded() && (this.choice() === null || this.reopened()),
  );

  /** Reads the stored choice. Call in the browser after the first render. */
  load(): void {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as {
        v?: number;
        choice?: string;
      } | null;
      if (stored?.v === VERSION && (stored.choice === 'granted' || stored.choice === 'denied')) {
        this.choice.set(stored.choice);
      }
    } catch {
      // Storage blocked (private mode, settings): ask again on every visit.
    }
    this.loaded.set(true);
  }

  set(choice: ConsentChoice): void {
    this.choice.set(choice);
    this.reopened.set(false);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ v: VERSION, choice, at: new Date().toISOString() }),
      );
    } catch {
      // The choice still applies to this visit.
    }
  }

  /** Shows the banner again so the visitor can change the choice. */
  reopen(): void {
    this.reopened.set(true);
  }
}
