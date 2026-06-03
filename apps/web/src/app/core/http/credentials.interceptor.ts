import { HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { REQUEST_COOKIE } from '../tokens';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function cookieFrom(jar: string, name: string): string | null {
  const match = jar.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Cookie auth. On the browser the httpOnly session cookies ride along via
 * withCredentials, and the readable `csrf` cookie is echoed in X-CSRF-Token on
 * mutations. During SSR there is no document — we forward the inbound request's
 * Cookie header (REQUEST_COOKIE) so the API renders for the logged-in user.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const serverCookie = inject(REQUEST_COOKIE, { optional: true }) ?? '';

  let cloned = req.clone({ withCredentials: true });

  if (!isBrowser && serverCookie) {
    cloned = cloned.clone({ setHeaders: { Cookie: serverCookie } });
  }

  if (MUTATING.has(req.method)) {
    const jar = isBrowser ? document.cookie : serverCookie;
    const csrf = cookieFrom(jar, 'csrf');
    if (csrf) cloned = cloned.clone({ setHeaders: { 'X-CSRF-Token': csrf } });
  }

  return next(cloned);
};
