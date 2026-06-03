import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconName } from '../../event/category-meta';
import { iconSvg } from './icon-set';

@Component({
  selector: 'sd-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
})
export class IconComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly name = input.required<IconName>();
  readonly size = input(22);
  readonly stroke = input(2);
  readonly fill = input(false);

  protected readonly svgHtml = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(
      iconSvg(this.name(), { size: this.size(), stroke: this.stroke(), fill: this.fill() }),
    ),
  );
}
