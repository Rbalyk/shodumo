import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminApi } from '../../../core/api/admin.api';
import { EventModel } from '../../../core/models';
import { ConfirmService } from '../../../shared/ui/confirm/confirm.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { StatePanelComponent } from '../../../shared/ui/state-panel/state-panel.component';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-moderation',
  standalone: true,
  imports: [DatePipe, TranslatePipe, StatePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="page-title">{{ 'mod.title' | t }}</h1>

    @switch (state()) {
      @case ('loading') { <app-state-panel mode="loading" /> }
      @case ('error') { <app-state-panel mode="error" (retry)="load()" /> }
      @default {
        @if (queue().length === 0) {
          <app-state-panel mode="empty" [message]="i18n.t('mod.empty')" />
        } @else {
          <div class="grid">
            @for (e of queue(); track e.id) {
              <article class="card item">
                <div class="cover" [class.is-empty]="!e.coverImage">
                  @if (e.coverImage) { <img [src]="e.coverImage" alt="" /> }
                </div>
                <div class="body">
                  <div class="meta">
                    @if (e.category?.name) { <span class="tag">{{ e.category?.name }}</span> }
                    @if (e.city?.name) { <span class="tag tag--soft">{{ e.city?.name }}</span> }
                  </div>
                  <h3 class="item-title">{{ e.title }}</h3>
                  <p class="item-date">{{ e.startsAt | date: 'dd MMM yyyy, HH:mm' }}</p>
                  @if (e.organizer?.name) {
                    <p class="item-by">{{ 'mod.by' | t }}: <strong>{{ e.organizer?.name }}</strong></p>
                  }
                  <p class="item-desc">{{ e.description }}</p>
                  <div class="actions">
                    <button class="btn btn--grad btn--sm" type="button" [disabled]="busyId() === e.id" (click)="approve(e)">
                      {{ 'mod.approve' | t }}
                    </button>
                    <button class="btn btn--soft btn--sm danger" type="button" [disabled]="busyId() === e.id" (click)="reject(e)">
                      {{ 'mod.reject' | t }}
                    </button>
                  </div>
                </div>
              </article>
            }
          </div>
        }
      }
    }
  `,
  styles: [
    `
      :host { display: block; }
      .page-title { font-size: 24px; font-weight: 800; margin-bottom: 18px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
      .item { overflow: hidden; display: flex; flex-direction: column; }
      .cover { aspect-ratio: 16 / 9; background: var(--surface-2); }
      .cover.is-empty { background: var(--grad); opacity: 0.18; }
      .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .body { padding: 16px; display: flex; flex-direction: column; gap: 6px; }
      .meta { display: flex; flex-wrap: wrap; gap: 6px; }
      .tag { padding: 3px 10px; border-radius: var(--r-pill); font-size: 11.5px; font-weight: 700; background: var(--ink); color: #fff; }
      .tag--soft { background: var(--surface-2); color: var(--ink-2); }
      .item-title { font-size: 17px; font-weight: 800; line-height: 1.25; }
      .item-date { font-size: 13px; color: var(--ink-3); }
      .item-by { font-size: 13px; color: var(--ink-2); }
      .item-desc { font-size: 13px; color: var(--ink-2); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      .actions { display: flex; gap: 8px; margin-top: 8px; }
      .danger { color: var(--danger); }
    `,
  ],
})
export class ModerationComponent implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);

  readonly queue = signal<EventModel[]>([]);
  readonly state = signal<LoadState>('loading');
  readonly busyId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.state.set('loading');
    this.api.events('PENDING').subscribe({
      next: (events) => {
        this.queue.set(events);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  approve(e: EventModel): void {
    this.busyId.set(e.id);
    this.api.moderate(e.id, 'PUBLISHED').subscribe({
      next: () => {
        this.removeLocal(e.id);
        this.toast.success(this.i18n.t('mod.approved'));
      },
      error: () => this.busyId.set(null),
    });
  }

  async reject(e: EventModel): Promise<void> {
    const res = await this.confirm.ask({
      message: this.i18n.t('mod.rejectTitle'),
      danger: true,
      confirmLabel: this.i18n.t('mod.reject'),
      withReason: true,
      reasonLabel: this.i18n.t('mod.rejectReason'),
    });
    if (!res.ok) return;
    // Reason is captured for the operator's note only — the API accepts a status change only.
    this.busyId.set(e.id);
    this.api.moderate(e.id, 'ARCHIVED').subscribe({
      next: () => {
        this.removeLocal(e.id);
        this.toast.success(this.i18n.t('mod.rejected'));
      },
      error: () => this.busyId.set(null),
    });
  }

  private removeLocal(id: string): void {
    this.queue.update((list) => list.filter((e) => e.id !== id));
    this.busyId.set(null);
  }
}
