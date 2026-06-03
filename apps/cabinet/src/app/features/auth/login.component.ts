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
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
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
