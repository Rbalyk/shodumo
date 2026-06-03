import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private seq = 0;
  readonly toasts = signal<Toast[]>([]);

  show(message: string, kind: ToastKind = 'info', ttl = 3500): void {
    if (!this.isBrowser) return; // toasts are a browser-only concern
    const id = ++this.seq;
    this.toasts.update((list) => [...list, { id, kind, message }]);
    if (ttl > 0) setTimeout(() => this.dismiss(id), ttl);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error', 5000);
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
