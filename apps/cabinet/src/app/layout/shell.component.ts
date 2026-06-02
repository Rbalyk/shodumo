import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { I18nService } from '../shared/i18n/i18n.service';
import { TranslatePipe } from '../shared/i18n/translate.pipe';

interface NavItem {
  path: string;
  labelKey: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <aside class="shell__side">
        <div class="shell__brand">
          <span class="shell__word">Shodumo</span><span class="shell__dot"></span>
        </div>
        <div class="shell__role">{{ (isAdmin() ? 'app.admin' : 'app.cabinet') | t }}</div>

        <nav class="shell__nav">
          @for (item of navItems(); track item.path) {
            <a class="shell__link" [routerLink]="item.path" routerLinkActive="is-active">
              {{ item.labelKey | t }}
            </a>
          }
        </nav>
      </aside>

      <div class="shell__body">
        <header class="shell__top">
          <button class="btn btn--ghost btn--sm" type="button" (click)="i18n.toggle()">{{ 'app.lang' | t }}</button>
          <span class="shell__user muted">{{ auth.profile()?.email }}</span>
          <button class="btn btn--soft btn--sm" type="button" (click)="logout()">{{ 'app.signOut' | t }}</button>
        </header>

        <main class="shell__main">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .shell { display: grid; grid-template-columns: 244px 1fr; min-height: 100vh; }
      .shell__side {
        background: var(--surface);
        border-right: 1px solid var(--line);
        padding: 22px 16px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        position: sticky;
        top: 0;
        height: 100vh;
      }
      .shell__brand { display: inline-flex; align-items: flex-end; gap: 3px; padding: 0 8px 4px; }
      .shell__word { font-size: 21px; font-weight: 800; letter-spacing: -0.03em; color: var(--ink); }
      .shell__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--grad); margin-bottom: 2px; }
      .shell__role { font-size: 12px; font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.04em; padding: 0 8px 14px; }
      .shell__nav { display: flex; flex-direction: column; gap: 2px; }
      .shell__link {
        padding: 10px 12px;
        border-radius: var(--r-md);
        font-weight: 600;
        font-size: 14.5px;
        color: var(--ink-2);
        transition: background 0.15s ease, color 0.15s ease;
      }
      .shell__link:hover { background: var(--surface-2); }
      .shell__link.is-active { background: var(--surface-2); color: var(--ink); box-shadow: inset 3px 0 0 var(--accent); }
      .shell__body { display: flex; flex-direction: column; min-width: 0; }
      .shell__top {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 14px;
        padding: 14px 28px;
        border-bottom: 1px solid var(--line);
        background: var(--surface);
      }
      .shell__user { font-size: 13.5px; }
      .shell__main { padding: 26px 28px 48px; max-width: var(--container); width: 100%; }
      @media (max-width: 760px) {
        .shell { grid-template-columns: 1fr; }
        .shell__side { position: static; height: auto; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 10px; }
        .shell__nav { flex-direction: row; flex-wrap: wrap; }
        .shell__role { display: none; }
      }
    `,
  ],
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
    void this.router.navigate(['/login']);
  }
}
