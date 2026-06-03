import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { I18nService } from '../../shared/i18n/i18n.service';

const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/register', '/auth/me'];

/** Public, anonymous-safe content endpoints — a 401 here is just "not logged in". */
const PUBLIC_GET = /\/(cities|categories|events|organizers)(\/|\?|$)/;

/** Pull a readable message out of a Nest validation/error response. */
function extractMessage(err: HttpErrorResponse, i18n: I18nService): string {
  const body = err.error;
  if (body) {
    if (Array.isArray(body.message)) return body.message.join(', ');
    if (typeof body.message === 'string') return body.message;
    if (typeof body.error === 'string') return body.error;
  }
  if (err.status === 0) return i18n.t('feed.errorText');
  return `${i18n.t('common.error')} (${err.status})`;
}

/**
 * Central error handling (browser only):
 *  - on 401 for a protected call → one token refresh, then retry once;
 *  - refresh failure → logout (anonymous), surface the original 401;
 *  - other errors → toast.
 * On the server we never toast/navigate/refresh — a 401 just propagates so the
 * page renders anonymously.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  if (!isBrowser) return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const i18n = inject(I18nService);

  const isAuthCall = AUTH_PATHS.some((p) => req.url.includes(p));
  const isPublicGet = req.method === 'GET' && PUBLIC_GET.test(req.url);

  const retryWithRefresh = (
    request: HttpRequest<unknown>,
    handler: HttpHandlerFn,
  ): Observable<HttpEvent<unknown>> =>
    auth.refresh().pipe(
      switchMap(() => handler(request)),
      catchError((refreshErr) => {
        auth.clearSession();
        return throwError(() => refreshErr);
      }),
    );

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // 401 on a protected, non-auth, non-public call → attempt a single refresh.
      if (err.status === 401 && !isAuthCall && !isPublicGet && auth.isAuthenticated()) {
        return retryWithRefresh(req, next);
      }

      // Don't toast: invalid-credentials on auth screens, anonymous 401s on
      // public/auth endpoints — those are surfaced inline by the caller.
      const silent401 = err.status === 401 && (isAuthCall || isPublicGet);
      if (!silent401) toast.error(extractMessage(err, i18n));

      return throwError(() => err);
    }),
  );
};
