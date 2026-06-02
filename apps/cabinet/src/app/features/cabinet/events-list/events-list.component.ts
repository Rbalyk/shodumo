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

const STATUSES: EventStatus[] = ['DRAFT', 'PENDING', 'PUBLISHED', 'ARCHIVED'];

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [DatePipe, RouterLink, TranslatePipe, StatusBadgeComponent, StatePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head">
      <h1 class="page-title">{{ 'events.title' | t }}</h1>
      <a class="btn btn--grad" routerLink="/cabinet/events/new">{{ 'events.new' | t }}</a>
    </div>

    <div class="filters">
      <button class="chip" [class.is-active]="filter() === null" type="button" (click)="setFilter(null)">
        {{ 'common.all' | t }}
      </button>
      @for (s of statuses; track s) {
        <button class="chip" [class.is-active]="filter() === s" type="button" (click)="setFilter(s)">
          {{ 'status.' + s | t }}
        </button>
      }
    </div>

    @switch (store.state()) {
      @case ('loading') { <app-state-panel mode="loading" /> }
      @case ('error') { <app-state-panel mode="error" (retry)="store.load(true)" /> }
      @default {
        @if (visible().length === 0) {
          <app-state-panel mode="empty" />
        } @else {
          <div class="card tbl-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>{{ 'events.colTitle' | t }}</th>
                  <th>{{ 'events.colStatus' | t }}</th>
                  <th>{{ 'events.colDate' | t }}</th>
                  <th class="num">{{ 'events.colGoing' | t }}</th>
                  <th class="actions">{{ 'events.colActions' | t }}</th>
                </tr>
              </thead>
              <tbody>
                @for (e of visible(); track e.id) {
                  <tr>
                    <td class="title">{{ e.title }}</td>
                    <td><app-status-badge [status]="e.status" /></td>
                    <td>{{ e.startsAt | date: 'dd MMM yyyy, HH:mm' }}</td>
                    <td class="num">{{ goingOf(e) }}</td>
                    <td class="actions">
                      <a class="btn btn--soft btn--sm" [routerLink]="['/cabinet/events', e.id, 'edit']">{{ 'common.edit' | t }}</a>
                      <a class="btn btn--ghost btn--sm" [href]="publicUrl(e)" target="_blank" rel="noopener">↗</a>
                      <button class="btn btn--ghost btn--sm danger" type="button" (click)="remove(e)">{{ 'common.delete' | t }}</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    }
  `,
  styles: [
    `
      .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; gap: 12px; }
      .page-title { font-size: 24px; font-weight: 800; }
      .filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
      .chip {
        border: 0;
        background: var(--surface-2);
        color: var(--ink-2);
        padding: 7px 14px;
        border-radius: var(--r-pill);
        font-weight: 600;
        font-size: 13.5px;
      }
      .chip.is-active { background: var(--ink); color: #fff; }
      .tbl-wrap { overflow-x: auto; }
      .tbl { width: 100%; border-collapse: collapse; }
      .tbl th, .tbl td { text-align: left; padding: 13px 16px; border-bottom: 1px solid var(--line); font-size: 14px; }
      .tbl th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.03em; color: var(--ink-3); }
      .tbl tbody tr:last-child td { border-bottom: 0; }
      .tbl .title { font-weight: 700; }
      .num { text-align: right; }
      .actions { display: flex; gap: 6px; justify-content: flex-end; }
      .danger { color: var(--danger); }
    `,
  ],
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
