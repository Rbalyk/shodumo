import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Optional free-text input (e.g. rejection reason). */
  withReason?: boolean;
  reasonLabel?: string;
}

export interface ConfirmResult {
  ok: boolean;
  reason?: string;
}

interface ActiveConfirm extends ConfirmRequest {
  resolve: (result: ConfirmResult) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly active = signal<ActiveConfirm | null>(null);

  ask(request: ConfirmRequest): Promise<ConfirmResult> {
    return new Promise<ConfirmResult>((resolve) => {
      this.active.set({ ...request, resolve });
    });
  }

  resolve(result: ConfirmResult): void {
    const current = this.active();
    if (current) {
      current.resolve(result);
      this.active.set(null);
    }
  }
}
