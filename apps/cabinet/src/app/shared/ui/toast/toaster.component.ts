import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toaster',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toaster" aria-live="polite" aria-atomic="true">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast--{{ toast.kind }}" role="status">
          <span class="toast__msg">{{ toast.message }}</span>
          <button class="toast__x" type="button" (click)="toastService.dismiss(toast.id)" aria-label="Закрити">×</button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toaster {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 360px;
      }
      .toast {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border-radius: var(--r-md);
        background: var(--surface);
        box-shadow: var(--shadow-pop);
        border-left: 4px solid var(--ink-3);
        animation: toast-in 0.2s ease;
      }
      .toast--success { border-left-color: var(--ok); }
      .toast--error { border-left-color: var(--danger); }
      .toast--info { border-left-color: var(--accent); }
      .toast__msg { flex: 1; font-size: 14px; font-weight: 500; }
      .toast__x {
        border: 0;
        background: transparent;
        font-size: 20px;
        line-height: 1;
        color: var(--ink-3);
      }
      @keyframes toast-in {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: none; }
      }
    `,
  ],
})
export class ToasterComponent {
  readonly toastService = inject(ToastService);
}
