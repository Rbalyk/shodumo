import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CabinetEventsStore } from '../cabinet-events.store';
import { EventsApi } from '../../../core/api/events.api';
import { EventModel, EventStatus } from '../../../core/models';
import { environment } from '../../../../environments/environment';
import { ConfirmService } from '../../../shared/ui/confirm/confirm.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';
import { StatePanelComponent } from '../../../shared/ui/state-panel/state-panel.component';
import { fadeIn, fadeStagger } from '../../../shared/animations';

const STATUSES: EventStatus[] = ['DRAFT', 'PENDING', 'PUBLISHED', 'ARCHIVED'];

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [DatePipe, RouterLink, TranslatePipe, StatusBadgeComponent, StatePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './events-list.component.html',
  styleUrl: './events-list.component.scss',
  animations: [fadeIn, fadeStagger],
})
export class EventsListComponent implements OnInit {
  readonly store = inject(CabinetEventsStore);
  private readonly api = inject(EventsApi);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);

  readonly statuses = STATUSES;
  readonly filter = signal<EventStatus | null>(null);

  readonly visible = computed(() => {
    const f = this.filter();
    return f ? this.store.events().filter((e) => e.status === f) : this.store.events();
  });

  ngOnInit(): void {
    this.store.load();
  }

  setFilter(status: EventStatus | null): void {
    this.filter.set(status);
  }

  goingOf(e: EventModel): number {
    return e.goingCount ?? e._count?.attendees ?? 0;
  }

  publicUrl(e: EventModel): string {
    return `${environment.publicSiteUrl}/event/${e.slug}/`;
  }

  async remove(e: EventModel): Promise<void> {
    const res = await this.confirm.ask({
      message: this.i18n.t('events.deleteConfirm'),
      danger: true,
      confirmLabel: this.i18n.t('common.delete'),
    });
    if (!res.ok) return;
    this.api.remove(e.id).subscribe({
      next: () => {
        this.store.removeLocal(e.id);
        this.toast.success(this.i18n.t('events.deleted'));
      },
    });
  }
}
