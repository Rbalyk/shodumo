import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'sd-footer',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  private readonly i18n = inject(I18nService);

  protected readonly homeHref = computed(() => this.i18n.url('/'));
  protected readonly mapHref = computed(() => this.i18n.url('/map'));
  protected readonly aboutHref = computed(() => this.i18n.url('/about'));
}
