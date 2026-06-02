import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/register'];

/** Attaches the bearer access token to API requests (except the auth endpoints). */
export const bearerInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken;
  const isAuthCall = AUTH_PATHS.some((p) => req.url.includes(p));

  if (token && !isAuthCall) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
  return next(req);
};
