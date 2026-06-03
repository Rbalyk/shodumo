import { InjectionToken } from '@angular/core';

/**
 * API base URL (no trailing slash). The value differs per platform:
 *  - browser → the public API origin (environment.apiBaseUrl);
 *  - server (SSR) → an internal origin (process.env.API_INTERNAL_URL) so the
 *    container talks to the API over the private network, never the public edge.
 * Provided in app.config.ts (browser) and app.config.server.ts (server).
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

/** The current request's cookie header — forwarded into SSR HttpClient calls. */
export const REQUEST_COOKIE = new InjectionToken<string>('REQUEST_COOKIE');

/**
 * Mutable holder for the HTTP status the SSR response should carry. Components
 * (e.g. a missing event/organizer) set `code = 404` during render; `server.ts`
 * reads it after `CommonEngine.render()` resolves and calls `res.status(code)`.
 * Provided per-request on the server; a harmless default holder exists in the
 * browser so injection never fails there.
 */
export interface ResponseStatus {
  code: number;
}

export const RESPONSE_STATUS = new InjectionToken<ResponseStatus>('RESPONSE_STATUS');
