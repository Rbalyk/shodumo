import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReferenceApi } from '../api/reference.api';
import { City } from '../models';

const CITY_KEY = 'sd_city';

/**
 * Selected city for the public feed/map. Defaults to the build-time default
 * (`lviv`) so the server and the first client render agree; the persisted choice
 * is applied after hydration via `init()` to avoid a markup mismatch.
 */
@Injectable({ providedIn: 'root' })
export class CityService {
  private readonly ref = inject(ReferenceApi);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly cities = signal<City[]>([]);
  readonly selected = signal<string>(environment.defaultCity);

  readonly selectedCity = computed(
    () => this.cities().find((c) => c.slug === this.selected()) ?? null,
  );

  constructor() {
    // Load the list eagerly (server + browser) so the header city name renders
    // correctly on first paint; the response is replayed via the transfer cache.
    this.ref
      .getCities()
      .pipe(catchError(() => of([] as City[])))
      .subscribe((list) => this.cities.set(list));
  }

  /** Apply the persisted city choice (browser-only, after hydration). */
  init(): void {
    if (!this.isBrowser) return;
    try {
      const saved = localStorage.getItem(CITY_KEY);
      if (saved) this.selected.set(saved);
    } catch {
      /* storage unavailable */
    }
  }

  nameOf(slug: string): string {
    return this.cities().find((c) => c.slug === slug)?.name ?? slug;
  }

  select(slug: string): void {
    if (this.selected() === slug) return;
    this.selected.set(slug);
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(CITY_KEY, slug);
    } catch {
      /* storage unavailable */
    }
  }
}
