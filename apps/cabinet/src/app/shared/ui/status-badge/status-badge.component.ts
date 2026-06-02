import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { EventStatus } from '../../../core/models';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [LowerCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge badge--{{ status() | lowercase }}">{{ label() }}</span>`,
  styles: [
    `
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 4px 11px;
        border-radius: var(--r-pill);
        font-size: 12.5px;
        font-weight: 700;
        white-space: nowrap;
      }
      .badge--draft { background: var(--surface-2); color: var(--st-draft); }
      .badge--pending { background: var(--st-pending-soft); color: var(--st-pending); }
      .badge--published { background: var(--st-published-soft); color: var(--st-published); }
      .badge--archived { background: var(--st-archived-soft); color: var(--st-archived); }
    `,
  ],
})
export class StatusBadgeComponent {
  private readonly i18n = inject(I18nService);
  readonly status = input.required<EventStatus>();
  readonly label = computed(() => this.i18n.t(`status.${this.status()}`));
}
