import { Injectable, computed, signal } from '@angular/core';
import { Lang } from '../../core/models';
import { DICTIONARIES } from './dictionaries';

const LANG_KEY = 'sd_cab_lang';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly _lang = signal<Lang>((localStorage.getItem(LANG_KEY) as Lang) || 'uk');
  readonly lang = this._lang.asReadonly();

  /** Reactive dictionary for the active language. */
  private readonly dict = computed(() => DICTIONARIES[this._lang()]);

  setLang(lang: Lang): void {
    localStorage.setItem(LANG_KEY, lang);
    this._lang.set(lang);
  }

  toggle(): void {
    this.setLang(this._lang() === 'uk' ? 'en' : 'uk');
  }

  /** Translate a dotted key, with optional {var} interpolation. */
  t(key: string, vars?: Record<string, string | number>): string {
    let value = this.dict()[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return value;
  }
}
