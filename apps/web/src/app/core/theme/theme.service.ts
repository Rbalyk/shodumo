import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';
const THEME_KEY = 'sd_theme';

/**
 * Light/dark theme. Light by default (matching the design); only an explicit
 * user choice is persisted. SSR-safe: the server always renders light, the
 * browser re-applies the stored choice on boot (no token differences in markup).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly theme = signal<Theme>('light');

  /** Apply the persisted choice. Called once from the shell on browser boot. */
  init(): void {
    if (!this.isBrowser) return;
    let saved: Theme = 'light';
    try {
      const v = localStorage.getItem(THEME_KEY);
      if (v === 'light' || v === 'dark') saved = v;
    } catch {
      /* storage unavailable */
    }
    this.apply(saved);
  }

  toggle(): void {
    this.apply(this.theme() === 'dark' ? 'light' : 'dark');
  }

  private apply(theme: Theme): void {
    this.theme.set(theme);
    if (!this.isBrowser) return;
    this.document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* storage unavailable */
    }
  }
}
