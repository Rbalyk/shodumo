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

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Double-submit CSRF: a state-changing request must carry the X-CSRF-Token
// header matching the (non-httpOnly) csrf cookie. An attacker's cross-site
// request can send the cookie but cannot read it to set the header.
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;

    const exempt = this.reflector.getAllAndOverride<boolean>(CSRF_EXEMPT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (exempt) return true;

    const cookie = readCookie(req, CSRF_COOKIE);
    const header = req.headers[CSRF_HEADER];
    if (!cookie || !header || header !== cookie) {
      throw new ForbiddenException('Invalid CSRF token');
    }
    return true;
  }
}
