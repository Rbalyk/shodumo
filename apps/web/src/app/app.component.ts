import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ToasterComponent } from './shared/ui/toast/toaster.component';
import { I18nService, langFromPath } from './shared/i18n/i18n.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToasterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<router-outlet />
<sd-toaster />`,
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  constructor() {
    // Keep the active language in sync with the URL on every navigation so
    // client-side moves between the uk and /en branches re-translate the UI.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.i18n.setLang(langFromPath(e.urlAfterRedirects)));
  }
}
