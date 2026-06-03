import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon.component';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { EventViewService } from '../../event/event-view.service';
import { EventModel } from '../../../core/models';
import { AuthService } from '../../../core/auth/auth.service';
import { EventsApi } from '../../../core/api/events.api';
import { ToastService } from '../toast/toast.service';
import { I18nService } from '../../i18n/i18n.service';
import { Router } from '@angular/router';

/** Public event card — single source of truth for the feed/organizer/saved grids. */
@Component({
  selector: 'sd-event-card',
  standalone: true,
  imports: [RouterLink, IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.scss',
})
export class EventCardComponent {
  private readonly view = inject(EventViewService);
  private readonly auth = inject(AuthService);
  private readonly events = inject(EventsApi);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  readonly event = input.required<EventModel>();

  protected readonly vm = computed(() => this.view.normalize(this.event()));

  /** User toggle overlay: null → follow the server VM; true/false → optimistic. */
  private readonly override = signal<boolean | null>(null);

  /** Saved state without writing during template read (no NG0600). */
  protected readonly isSaved = computed(() => this.override() ?? this.vm().isSaved);

  protected toggleSave(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();

    if (!this.auth.isAuthenticated()) {
      this.router.navigate([], { queryParams: { auth: 'login' }, queryParamsHandling: 'merge' });
      return;
    }

    const next = !this.isSaved();
    this.override.set(next);
    const op = next
      ? this.events.attend(this.vm().id, 'SAVED')
      : this.events.unattend(this.vm().id, 'SAVED');
    op.subscribe({
      next: () => this.toast.success(this.i18n.t(next ? 'toast.saved' : 'toast.unsaved')),
      error: () => {
        this.override.set(!next); // revert
        this.toast.error(this.i18n.t('toast.updateFailed'));
      },
    });
  }
}
