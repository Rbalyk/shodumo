import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmService } from './confirm.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (confirm.active(); as req) {
      <div class="overlay" (click)="cancel()">
        <div class="dialog" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <p class="dialog__msg">{{ req.message }}</p>

          @if (req.withReason) {
            <div class="field">
              <label class="field__label">{{ req.reasonLabel || 'Причина' }}</label>
              <textarea class="control" rows="3" [ngModel]="reason()" (ngModelChange)="reason.set($event)"></textarea>
            </div>
          }

          <div class="dialog__actions">
            <button class="btn btn--ghost" type="button" (click)="cancel()">
              {{ req.cancelLabel || ('common.cancel' | t) }}
            </button>
            <button
              class="btn"
              [class.btn--danger]="req.danger"
              [class.btn--grad]="!req.danger"
              type="button"
              (click)="ok()"
            >
              {{ req.confirmLabel || ('common.confirm' | t) }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .overlay {
        position: fixed;
        inset: 0;
        z-index: 1100;
        background: rgba(24, 21, 39, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .dialog {
        width: 100%;
        max-width: 420px;
        background: var(--surface);
        border-radius: var(--r-lg);
        box-shadow: var(--shadow-pop);
        padding: 22px;
      }
      .dialog__msg { font-size: 15.5px; font-weight: 600; margin-bottom: 16px; }
      .dialog__actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
    `,
  ],
})
export class ConfirmDialogComponent {
  readonly confirm = inject(ConfirmService);
  readonly reason = signal('');

  ok(): void {
    this.confirm.resolve({ ok: true, reason: this.reason() });
    this.reason.set('');
  }

  cancel(): void {
    this.confirm.resolve({ ok: false });
    this.reason.set('');
  }
}
