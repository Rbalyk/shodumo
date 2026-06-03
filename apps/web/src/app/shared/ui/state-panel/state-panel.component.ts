import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../i18n/translate.pipe';

export type PanelMode = 'loading' | 'empty' | 'error';

/** Unified loading / empty / error placeholder. */
@Component({
  selector: 'app-state-panel',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './state-panel.component.html',
  styleUrl: './state-panel.component.scss',
})
export class StatePanelComponent {
  readonly mode = input.required<PanelMode>();
  readonly message = input<string>('');
  readonly inline = input<boolean>(false);
  readonly retry = output<void>();
}
