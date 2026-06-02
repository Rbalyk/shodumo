import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../i18n/translate.pipe';

export type PanelMode = 'loading' | 'empty' | 'error';

/** Unified loading / empty / error placeholder. */
@Component({
  selector: 'app-state-panel',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" [class.panel--inline]="inline()">
      @switch (mode()) {
        @case ('loading') {
          <div class="spin"></div>
          <p class="panel__text">{{ 'common.loading' | t }}</p>
        }
        @case ('empty') {
          <div class="panel__emoji">📭</div>
          <p class="panel__text">{{ message() || ('common.empty' | t) }}</p>
        }
        @case ('error') {
          <div class="panel__emoji">⚠️</div>
          <p class="panel__text">{{ message() || ('common.error' | t) }}</p>
          <button class="btn btn--soft btn--sm" type="button" (click)="retry.emit()">{{ 'common.retry' | t }}</button>
        }
      }
    </div>
  `,
  styles: [
    `
      .panel {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 48px 20px;
        text-align: center;
      }
      .panel--inline { padding: 28px 16px; }
      .panel__emoji { font-size: 34px; }
      .panel__text { color: var(--ink-3); font-weight: 600; }
    `,
  ],
})
export class StatePanelComponent {
  readonly mode = input.required<PanelMode>();
  readonly message = input<string>('');
  readonly inline = input<boolean>(false);
  readonly retry = output<void>();
}
