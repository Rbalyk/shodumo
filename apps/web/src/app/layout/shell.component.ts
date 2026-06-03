import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { I18nService } from '../shared/i18n/i18n.service';
import { TranslatePipe } from '../shared/i18n/translate.pipe';
import { ConfirmDialogComponent } from '../shared/ui/confirm/confirm-dialog.component';

interface NavItem {
  path: string;
  labelKey: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  readonly isAdmin = computed(() => this.auth.role() === 'ADMIN');

  readonly navItems = computed<NavItem[]>(() =>
    this.isAdmin()
      ? [
          { path: '/admin/moderation', labelKey: 'nav.moderation' },
          { path: '/admin/taxonomy', labelKey: 'nav.taxonomy' },
        ]
      : [
          { path: '/cabinet/dashboard', labelKey: 'nav.dashboard' },
          { path: '/cabinet/events', labelKey: 'nav.events' },
          { path: '/cabinet/profile', labelKey: 'nav.profile' },
        ],
  );

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/']);
  }
}
