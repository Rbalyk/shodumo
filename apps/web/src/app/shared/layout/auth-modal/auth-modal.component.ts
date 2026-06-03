import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { IconComponent } from '../../ui/icon/icon.component';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { I18nService } from '../../i18n/i18n.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../ui/toast/toast.service';

type AuthMode = 'login' | 'register';

/**
 * Login / register modal driven by the `?auth=login|register` query param, so any
 * link or guard can open it. Also reconciles the email-confirmation redirect
 * (`?welcome=1` / `?confirm=invalid`). Session lives in httpOnly cookies; on
 * success the profile is already hydrated by the app initializer (login) or
 * re-fetched (confirm).
 */
@Component({
  selector: 'sd-auth-modal',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss',
})
export class AuthModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly i18n = inject(I18nService);

  private readonly qp = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly mode = signal<AuthMode>('login');
  protected readonly sent = signal(false);
  protected readonly sentEmail = signal('');
  protected readonly submitting = signal(false);
  protected readonly formError = signal('');

  protected readonly open = computed(() => {
    const a = this.qp().get('auth');
    return a === 'login' || a === 'register';
  });

  protected readonly isRegister = computed(() => this.mode() === 'register');

  protected readonly form = this.fb.nonNullable.group({
    role: this.fb.nonNullable.control<'attendee' | 'organizer'>('attendee'),
    name: this.fb.nonNullable.control(''),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    password: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(6)]),
  });

  constructor() {
    // Sync local mode + reset transient state whenever the modal opens.
    effect(() => {
      const a = this.qp().get('auth');
      if (a === 'login' || a === 'register') {
        this.mode.set(a);
        this.sent.set(false);
        this.formError.set('');
      }
    });

    // Lock body scroll while open (browser only).
    effect(() => {
      if (!this.isBrowser) return;
      document.body.style.overflow = this.open() ? 'hidden' : '';
    });

    // Reconcile the email-confirmation redirect once, on the client.
    if (this.isBrowser) {
      const map = this.route.snapshot.queryParamMap;
      if (map.get('welcome') != null) {
        this.auth.loadMe().subscribe({ error: () => undefined });
        this.toast.success(this.i18n.t('toast.registered'));
        this.stripParams({ welcome: null });
      } else if (map.get('confirm') === 'invalid') {
        this.toast.error(this.i18n.t('toast.confirmInvalid'));
        this.stripParams({ confirm: null });
      }
    }
  }

  protected setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.sent.set(false);
    this.formError.set('');
  }

  protected close(): void {
    this.stripParams({ auth: null });
  }

  protected submit(): void {
    if (this.submitting()) return;
    this.formError.set('');
    const { email, password, name, role } = this.form.getRawValue();
    if (this.form.invalid) {
      this.formError.set(this.i18n.t('modal.errFields'));
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    if (this.isRegister()) {
      this.auth
        .register({
          email: email.trim(),
          password,
          role: role === 'organizer' ? 'ORGANIZER' : 'ATTENDEE',
          ...(name.trim() ? { name: name.trim() } : {}),
        })
        .subscribe({
          next: () => {
            this.submitting.set(false);
            this.sentEmail.set(email.trim());
            this.sent.set(true);
          },
          error: (err) => {
            this.submitting.set(false);
            this.formError.set(this.friendly(err));
          },
        });
    } else {
      this.auth.login(email.trim(), password).subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.success(this.i18n.t('toast.welcome'));
          this.close();
        },
        error: (err) => {
          this.submitting.set(false);
          this.formError.set(this.friendly(err));
        },
      });
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) this.close();
  }

  private stripParams(params: Record<string, null>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private friendly(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) return this.i18n.t('modal.errCredentials');
      if (err.status === 409) return this.i18n.t('modal.errExists');
    }
    return this.i18n.t('modal.errGeneric');
  }
}
