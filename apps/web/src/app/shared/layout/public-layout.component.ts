import { ChangeDetectionStrategy, Component, afterNextRender, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { TabbarComponent } from './tabbar/tabbar.component';
import { AuthModalComponent } from './auth-modal/auth-modal.component';
import { ThemeService } from '../../core/theme/theme.service';
import { CityService } from '../../core/city/city.service';

/**
 * Public shell: site chrome (header + tabbar + footer) around the routed page.
 * Persisted theme/city are applied after the first browser render so the server
 * render and initial hydration agree (no flash, no DOM mismatch).
 */
@Component({
  selector: 'sd-public-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    TabbarComponent,
    AuthModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-header />
    <router-outlet />
    <sd-tabbar />
    <sd-footer />
    <sd-auth-modal />
  `,
})
export class PublicLayoutComponent {
  private readonly theme = inject(ThemeService);
  private readonly city = inject(CityService);

  constructor() {
    afterNextRender(() => {
      this.theme.init();
      this.city.init();
    });
  }
}
