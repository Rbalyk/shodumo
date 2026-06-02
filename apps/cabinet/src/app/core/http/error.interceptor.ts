import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';

const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/register'];

/** Pull a readable message out of a Nest validation/error response. */
function extractMessage(err: HttpErrorResponse): string {
  const body = err.error;
  if (body) {
    if (Array.isArray(body.message)) return body.message.join(', ');
    if (typeof body.message === 'string') return body.message;
    if (typeof body.error === 'string') return body.error;
  }
  if (err.status === 0) return 'Немає з’єднання з сервером';
  return `Помилка ${err.status}`;
}

/**
 * Central error handling:
 *  - on 401 (non-auth call) tries a single token refresh and retries the request;
 *  - surfaces all other errors as toasts.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const retryWithRefresh = (
    request: HttpRequest<unknown>,
    handler: HttpHandlerFn,
  ): Observable<HttpEvent<unknown>> =>
    auth.refresh().pipe(
      switchMap((tokens) =>
        handler(request.clone({ setHeaders: { Authorization: `Bearer ${tokens.accessToken}` } })),
      ),
      catchError((refreshErr) => {
        auth.logout();
        void router.navigate(['/login']);
        return throwError(() => refreshErr);
      }),
    );

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const isAuthCall = AUTH_PATHS.some((p) => req.url.includes(p));

      if (err.status === 401 && !isAuthCall && auth.refreshToken) {
        return retryWithRefresh(req, next);
      }

      // don't double-toast invalid-credentials on the login screen — let the form show it
      if (!(err.status === 401 && isAuthCall)) {
        toast.error(extractMessage(err));
      }
      return throwError(() => err);
    }),
  );
};
