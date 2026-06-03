import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../ui/icon/icon.component';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { I18nService } from '../../i18n/i18n.service';

/** Mobile bottom tab bar (feed / map / saved / profile). */
@Component({
  selector: 'sd-tabbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tabbar.component.html',
  styleUrl: './tabbar.component.scss',
})
export class TabbarComponent {
  private readonly i18n = inject(I18nService);

  protected readonly homeHref = computed(() => this.i18n.url('/'));
  protected readonly mapHref = computed(() => this.i18n.url('/map'));
  protected readonly savedHref = computed(() => this.i18n.url('/saved'));
  protected readonly profileHref = computed(() => this.i18n.url('/profile'));
}
