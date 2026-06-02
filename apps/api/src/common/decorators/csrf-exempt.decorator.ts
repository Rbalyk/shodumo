import { SetMetadata } from '@nestjs/common';

export const CSRF_EXEMPT_KEY = 'csrfExempt';
// Opt a handler out of the double-submit CSRF check — used by the auth
// bootstrap endpoints (login/register/refresh/logout) where the csrf cookie
// may not exist yet.
export const CsrfExempt = () => SetMetadata(CSRF_EXEMPT_KEY, true);
