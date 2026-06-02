import { HttpInterceptorFn } from '@angular/common/http';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Cookie auth: send the httpOnly session cookies with every API request
 * (withCredentials) and echo the double-submit CSRF token in the X-CSRF-Token
 * header on state-changing requests.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  let cloned = req.clone({ withCredentials: true });

  if (MUTATING.has(req.method)) {
    const csrf = readCookie('csrf');
    if (csrf) {
      cloned = cloned.clone({ setHeaders: { 'X-CSRF-Token': csrf } });
    }
  }
  return next(cloned);
};
