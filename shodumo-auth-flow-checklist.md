# ShoDumo — cookie auth + role registration: manual-test checklist

Breaking change: bearer-token-in-localStorage → cookie session shared on
`.shodumo.com` (SSO across subdomains) + role-based registration with email
confirmation.

## Env vars

### API (`apps/api/.env` / `deploy/.env.prod`)
| var | dev | prod |
| --- | --- | --- |
| `CORS_ORIGINS` | `http://localhost:3001,http://localhost:4200` | `https://shodumo.com,https://app.shodumo.com` |
| `COOKIE_DOMAIN` | _(empty — host-only cookie)_ | `.shodumo.com` |
| `API_PUBLIC_URL` | `http://localhost:3000` | `https://api.shodumo.com` |
| `WEB_BASE_URL` | `http://localhost:3001` | `https://shodumo.com` |
| `RESEND_API_KEY` | _(empty → link is logged)_ | real Resend key |
| `MAIL_FROM` | `ShoDumo <noreply@shodumo.com>` | verified sender |

### Web build (`apps/web`, gulp-replace at build time)
`API_URL`, `SITE_URL`, `APP_URL`, `DEFAULT_CITY`. Prod:
`API_URL=https://api.shodumo.com SITE_URL=https://shodumo.com APP_URL=https://app.shodumo.com npx gulp build`
(`APP_URL` is where the organizer "Create event" button links → `${APP_URL}/cabinet/dashboard`.)

### Cabinet (`apps/cabinet/src/environments`)
`apiBaseUrl` points at the API (`https://api.shodumo.com` in prod).

## Local-dev prerequisite

Cookies are shared across `localhost` ports, so dev SSO works out of the box
with `COOKIE_DOMAIN` empty. Run: API `:3000`, web `:3001`, cabinet `:4200`.

## Flow A — Attendee registration + confirm

- [ ] Open site `:3001`, click **Реєстрація** → modal shows role radio (Користувач selected), name/email/password.
- [ ] Submit with role **Користувач** → response **202**, modal switches to "Перевірте пошту" panel (no session yet, NOT logged in).
- [ ] No `User` row created yet; one `PendingRegistration` row exists (`email`, `token`, `expiresAt` ~24h).
- [ ] Confirmation link: from the email (Resend) or, if `RESEND_API_KEY` empty, from the API log (`Logger.warn`).
- [ ] Open the link → API creates the `User` (`emailVerifiedAt` set), deletes the pending row, sets cookies, **302** → `${WEB_BASE_URL}/?welcome=1`.
- [ ] After redirect site shows logged-in state (avatar + logout, no login/register buttons), **no** "Створити подію" button (attendee).
- [ ] DevTools → Application → Cookies: `sd_access` + `sd_refresh` are **httpOnly**; `csrf` is readable (not httpOnly). All `SameSite=Lax`; prod has `Secure` + `Domain=.shodumo.com`.

## Flow B — Organizer registration + SSO into cabinet

- [ ] Register with role **Організатор** → 202 + "email sent" panel.
- [ ] Confirm link → `User` + `Organizer` rows created (`Organizer.name` = entered name or email local-part), 302 to site logged in.
- [ ] Site shows **Створити подію** button → href `https://app.shodumo.com/cabinet/dashboard` (dev: `http://localhost:4200/...`).
- [ ] Click it (or open the cabinet directly) → cabinet loads **already authenticated** via the shared cookie (`GET /auth/me` succeeds, no login screen).

## Flow C — Login / logout / refresh

- [ ] Login modal with confirmed creds → **200**, profile returned, logged-in UI.
- [ ] Wrong password → **401**, inline "Невірний email або пароль" (no toast double-error on the login form).
- [ ] Reload page → still logged in (boot `GET /auth/me` resolves the cookie session).
- [ ] Let access token expire (or wait `JWT_ACCESS_TTL`) then hit a protected call → transparent `POST /auth/refresh` rotates the access cookie and the original request retries successfully.
- [ ] Refresh fails (clear `sd_refresh`) on a protected call → `sd:auth-expired` fires, UI drops to logged-out; cabinet redirects to `/login`.
- [ ] **Logout** → `POST /auth/logout` clears all three cookies; UI logged-out on both site and cabinet.

## Flow D — Security

- [ ] CSRF: a mutating request (POST/PUT/PATCH/DELETE) **without** `X-CSRF-Token` header → **403** "Invalid CSRF token".
- [ ] Same request **with** header matching the `csrf` cookie → succeeds.
- [ ] `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout` are CSRF-exempt (work without the header).
- [ ] CORS: a browser request from a non-allowlisted origin is blocked; allowed origins get `Access-Control-Allow-Credentials: true` (never `*` with credentials).
- [ ] Rate limit: 6th `POST /auth/register` within 60s → **429**.
- [ ] Expired/invalid confirm token → 302 → `${WEB_BASE_URL}/?confirm=invalid`; expired pending row is deleted.
- [ ] Logs contain no passwords or raw tokens.

## Builds

- [ ] `apps/api`: `npx tsc --noEmit -p tsconfig.build.json` clean.
- [ ] `apps/cabinet`: `npx tsc --noEmit -p tsconfig.app.json` clean.
- [ ] `apps/web`: `npx gulp build` clean; prod build → `grep -rl localhost dist/ | grep -v .map` is empty.
