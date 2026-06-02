import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Request, Response } from 'express';
import { AuthTokens } from './auth.types';

export const ACCESS_COOKIE = 'sd_access';
export const REFRESH_COOKIE = 'sd_refresh';
// Not httpOnly: the SPA/site reads it and echoes it back in the X-CSRF-Token
// header (double-submit). Pairs with the httpOnly auth cookies.
export const CSRF_COOKIE = 'csrf';
export const CSRF_HEADER = 'x-csrf-token';

// Parse a JWT-style duration ("15m", "7d", "1h", "30s") into milliseconds.
function durationMs(value: string, fallbackMs: number): number {
  const m = /^(\d+)\s*([smhd])$/.exec(value.trim());
  if (!m) return fallbackMs;
  const n = Number(m[1]);
  const unit = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[m[2]] ?? 6e4;
  return n * unit;
}

function baseOptions(config: ConfigService): CookieOptions {
  return {
    domain: config.get<string>('COOKIE_DOMAIN') || undefined,
    secure: config.get<string>('NODE_ENV') === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

export function makeCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

// Sets the httpOnly access + refresh cookies and a readable csrf cookie.
export function setAuthCookies(
  res: Response,
  tokens: AuthTokens,
  config: ConfigService,
): string {
  const base = baseOptions(config);
  const accessMs = durationMs(config.get<string>('JWT_ACCESS_TTL', '15m'), 9e5);
  const refreshMs = durationMs(config.get<string>('JWT_REFRESH_TTL', '7d'), 6048e5);
  const csrf = makeCsrfToken();

  res.cookie(ACCESS_COOKIE, tokens.accessToken, { ...base, httpOnly: true, maxAge: accessMs });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, { ...base, httpOnly: true, maxAge: refreshMs });
  res.cookie(CSRF_COOKIE, csrf, { ...base, httpOnly: false, maxAge: refreshMs });
  return csrf;
}

// Refresh rotates only the access cookie (refresh cookie stays as-is).
export function setAccessCookie(
  res: Response,
  accessToken: string,
  config: ConfigService,
): void {
  const base = baseOptions(config);
  const accessMs = durationMs(config.get<string>('JWT_ACCESS_TTL', '15m'), 9e5);
  res.cookie(ACCESS_COOKIE, accessToken, { ...base, httpOnly: true, maxAge: accessMs });
}

export function clearAuthCookies(res: Response, config: ConfigService): void {
  const base = baseOptions(config);
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
  res.clearCookie(CSRF_COOKIE, base);
}

export function readCookie(req: Request, name: string): string | undefined {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies ? cookies[name] : undefined;
}
