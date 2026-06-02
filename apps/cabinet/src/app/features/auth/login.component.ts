import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../shared/i18n/translate.pipe';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login">
      <form class="login__card card" [formGroup]="form" (ngSubmit)="submit()">
        <div class="login__brand">
          <span class="login__word">Shodumo</span><span class="login__dot"></span>
        </div>
        <h1 class="login__title">{{ 'login.title' | t }}</h1>
        <p class="login__sub muted">{{ 'login.subtitle' | t }}</p>

        <div class="field">
          <label class="field__label" for="email">{{ 'login.email' | t }}</label>
          <input id="email" class="control" type="email" autocomplete="email" formControlName="email" />
        </div>

        <div class="field">
          <label class="field__label" for="password">{{ 'login.password' | t }}</label>
          <input id="password" class="control" type="password" autocomplete="current-password" formControlName="password" />
        </div>

        @if (error()) {
          <p class="field__error login__err">{{ error() }}</p>
        }

        <button class="btn btn--grad btn--block" type="submit" [disabled]="busy() || form.invalid">
          {{ (busy() ? 'login.submitting' : 'login.submit') | t }}
        </button>

        <button class="login__lang btn btn--ghost btn--sm" type="button" (click)="i18n.toggle()">
          {{ 'app.lang' | t }}
        </button>
      </form>
    </div>
  `,
  styles: [
    `
      .login { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
      .login__card { width: 100%; max-width: 400px; padding: 34px 30px; }
      .login__brand { display: inline-flex; align-items: flex-end; gap: 3px; margin-bottom: 18px; }
      .login__word { font-size: 26px; font-weight: 800; letter-spacing: -0.03em; color: var(--ink); }
      .login__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--grad); margin-bottom: 3px; }
      .login__title { font-size: 22px; font-weight: 800; }
      .login__sub { margin-bottom: 22px; font-size: 14px; }
      .login__err { margin: -6px 0 14px; }
      .login__lang { width: 100%; margin-top: 12px; }
    `,
  ],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);

  readonly busy = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();

    this.auth.login(email, password).subscribe({
      next: () => {
        const role = this.auth.role();
        if (role !== 'ORGANIZER' && role !== 'ADMIN') {
          this.auth.logout();
          this.error.set(this.i18n.t('login.errRole'));
          this.busy.set(false);
          return;
        }
        void this.router.navigateByUrl(this.auth.homeRoute());
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          err.status === 401 ? this.i18n.t('login.errCredentials') : this.i18n.t('common.error'),
        );
        this.busy.set(false);
      },
    });
  }
}
