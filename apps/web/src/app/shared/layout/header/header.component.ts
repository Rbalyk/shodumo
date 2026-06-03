import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../ui/icon/icon.component';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { CityService } from '../../../core/city/city.service';
import { AuthService } from '../../../core/auth/auth.service';

/** Public site chrome: search, city picker, theme/lang toggles, role-aware auth. */
@Component({
  selector: 'sd-header',
  standalone: true,
  imports: [RouterLink, IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly city = inject(CityService);
  protected readonly auth = inject(AuthService);

  protected readonly cityMenuOpen = signal(false);
  protected readonly adminMenuOpen = signal(false);

  protected readonly homeHref = computed(() => this.i18n.url('/'));
  protected readonly mapHref = computed(() => this.i18n.url('/map'));
  protected readonly profileHref = computed(() => this.i18n.url('/profile'));
  protected readonly createHref = '/cabinet/events/new';

  protected readonly avatarInitial = computed(() => {
    const p = this.auth.profile();
    const src = p?.name || p?.email || '';
    return src.charAt(0).toUpperCase() || '?';
  });

  protected toggleCityMenu(): void {
    this.cityMenuOpen.update((v) => !v);
  }

  protected selectCity(slug: string): void {
    this.city.select(slug);
    this.cityMenuOpen.set(false);
  }

  protected toggleAdminMenu(): void {
    this.adminMenuOpen.update((v) => !v);
  }

  protected onSearch(event: Event, value: string): void {
    event.preventDefault();
    this.router.navigate([this.i18n.url('/')], {
      queryParams: { q: value.trim() || null },
    });
  }

  protected openAuth(mode: 'login' | 'register'): void {
    this.router.navigate([], { queryParams: { auth: mode }, queryParamsHandling: 'merge' });
  }

  protected logout(): void {
    this.auth.logout();
    this.adminMenuOpen.set(false);
    this.router.navigateByUrl(this.i18n.url('/'));
  }

  /** Swap the current URL to its twin in the other language branch. */
  protected switchLang(event: Event): void {
    event.preventDefault();
    const next = this.i18n.lang() === 'en' ? 'uk' : 'en';
    const url = this.router.url.replace(/^\/en(\/|$)/, '/');
    this.router.navigateByUrl((next === 'en' ? '/en' : '') + url);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.cityMenuOpen.set(false);
      this.adminMenuOpen.set(false);
    }
  }
}
