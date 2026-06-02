import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CSRF_COOKIE, CSRF_HEADER, readCookie } from '../../auth/auth.cookies';
import { CSRF_EXEMPT_KEY } from '../decorators/csrf-exempt.decorator';

// Only state-changing verbs are guarded. Safe/idempotent reads (GET, HEAD) and
// preflight (OPTIONS) are NEVER checked — a logged-in user's GET carries the
// csrf cookie automatically but the browser sends no X-CSRF-Token header on
// reads, and that must not be treated as a CSRF failure.
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Double-submit CSRF: a state-changing request must carry the X-CSRF-Token
// header matching the (non-httpOnly) csrf cookie. An attacker's cross-site
// request can send the cookie but cannot read it to set the header.
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    // Exempt everything that isn't a mutation (GET/HEAD/OPTIONS and anything
    // non-standard). Reads are safe and must work with only the session cookie.
    if (!MUTATING_METHODS.has(req.method?.toUpperCase())) return true;

    const exempt = this.reflector.getAllAndOverride<boolean>(CSRF_EXEMPT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (exempt) return true;

    const cookie = readCookie(req, CSRF_COOKIE);
    const raw = req.headers[CSRF_HEADER];
    const header = Array.isArray(raw) ? raw[0] : raw;
    if (!cookie || !header || header !== cookie) {
      throw new ForbiddenException('Invalid CSRF token');
    }
    return true;
  }
}
