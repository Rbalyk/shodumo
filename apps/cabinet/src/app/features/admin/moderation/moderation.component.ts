import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminApi } from '../../../core/api/admin.api';
import { EventModel } from '../../../core/models';
import { ConfirmService } from '../../../shared/ui/confirm/confirm.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { StatePanelComponent } from '../../../shared/ui/state-panel/state-panel.component';
import { fadeStagger } from '../../../shared/animations';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-moderation',
  standalone: true,
  imports: [DatePipe, TranslatePipe, StatePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './moderation.component.html',
  styleUrl: './moderation.component.scss',
  animations: [fadeStagger],
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
