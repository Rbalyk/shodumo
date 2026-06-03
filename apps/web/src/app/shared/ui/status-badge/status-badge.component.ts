import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { EventStatus } from '../../../core/models';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [LowerCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent {
  private readonly i18n = inject(I18nService);
  readonly status = input.required<EventStatus>();
  readonly label = computed(() => this.i18n.t(`status.${this.status()}`));
}
