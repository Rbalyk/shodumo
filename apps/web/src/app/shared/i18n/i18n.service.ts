import { Injectable, computed, inject, signal } from '@angular/core';
import { PlatformLocation } from '@angular/common';
import { Lang } from '../../core/models';
import { DICTIONARIES, TAXONOMY_EN } from './dictionaries';

/**
 * i18n is path-based: the `uk` branch lives at the root, the `en` branch under
 * `/en/...`. Language is derived from the request path (SSR) / location path
 * (browser) so the server render and the first client render agree — no
 * hydration flash, no localStorage read on the server.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly platformLocation = inject(PlatformLocation);

  private readonly _lang = signal<Lang>(langFromPath(this.platformLocation.pathname));
  readonly lang = this._lang.asReadonly();

  /** Path prefix for the active language ('' for uk, '/en' for en). */
  readonly langBase = computed(() => (this._lang() === 'en' ? '/en' : ''));

  private readonly dict = computed(() => DICTIONARIES[this._lang()]);

  /** Sync the active language (called by the router on navigation). */
  setLang(lang: Lang): void {
    if (this._lang() !== lang) this._lang.set(lang);
  }

  /** Translate a dotted key with optional {var} interpolation. */
  t(key: string, vars?: Record<string, string | number>): string {
    let value = this.dict()[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return value;
  }

  /** Prefix an app-internal path with the active language base. */
  url(path: string): string {
    const p = path.startsWith('/') ? path : `/${path}`;
    return this.langBase() + p;
  }

  /** English display name for a city slug (en-branch fallback before API). */
  cityNameEn(slug: string): string | null {
    return TAXONOMY_EN.cities[slug] ?? null;
  }

  /** English display name for a category slug (en-branch fallback before API). */
  categoryNameEn(slug: string): string | null {
    return TAXONOMY_EN.categories[slug] ?? null;
  }
}

/** Derive the language from a URL path: `/en` (or `/en/...`) → en, else uk. */
export function langFromPath(pathname: string): Lang {
  return /^\/en(\/|$)/.test(pathname || '/') ? 'en' : 'uk';
}
