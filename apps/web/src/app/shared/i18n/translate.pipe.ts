import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

/**
 * `{{ 'feed.heading' | t }}` — impure so it re-renders when the active language
 * changes. The dictionary lookup is a cheap map access.
 */
@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string, vars?: Record<string, string | number>): string {
    return this.i18n.t(key, vars);
  }
}
