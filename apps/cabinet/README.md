# ShoDumo Cabinet

Single Angular app serving two roles against the ShoDumo NestJS API:

- **Organizer cabinet** (`ORGANIZER`) — dashboard, events CRUD, profile.
- **Admin panel** (`ADMIN`) — moderation queue, cities & categories.

Role is read from the JWT and enforced with route guards; each role lands on its own shell.

## Stack

- Angular 19.2, standalone components, **signals + OnPush** everywhere.
- TypeScript strict.
- Reactive Forms, lazy-loaded routes with `canActivate` role guards.
- `provideHttpClient(withInterceptors(...))`: bearer token + 401 auto-refresh + error toasts.
- `@angular/google-maps` location picker (degrades gracefully without a key).
- Dictionary i18n (uk default + en) via an impure `| t` pipe and a `lang` signal.
- No NgRx — state lives in small signal stores.

## Getting started

```bash
npm install
npm start          # ng serve → http://localhost:4200
npm run build      # production bundle → dist/shodumo-cabinet
```

Requires Node ≥ 20.18 (Angular 19). The API must be running for login to work.

## Configuration

Edit `src/environments/environment.ts` (dev) and `environment.production.ts` (prod):

| Key             | Purpose                                                        |
| --------------- | ------------------------------------------------------------- |
| `apiBaseUrl`    | ShoDumo NestJS API base URL, no trailing slash.               |
| `googleMapsKey` | Google Maps JS API key for the location picker (optional).    |
| `publicSiteUrl` | Public site (shodumo-web) base, used for "open public page".  |

Leave `googleMapsKey` empty to fall back to manual lat/lng entry — the map shows a notice instead of failing.

## Routes

| Path                       | Role      | Screen                          |
| -------------------------- | --------- | ------------------------------- |
| `/login`                   | guest     | Login                           |
| `/cabinet/dashboard`       | ORGANIZER | B1 — summary tiles + upcoming   |
| `/cabinet/events`          | ORGANIZER | B2 — events list                |
| `/cabinet/events/new`      | ORGANIZER | B3 — create event               |
| `/cabinet/events/:id/edit` | ORGANIZER | B3 — edit event                 |
| `/cabinet/profile`         | ORGANIZER | B4 — organizer profile          |
| `/admin/moderation`        | ADMIN     | D1 — moderation queue           |
| `/admin/taxonomy`          | ADMIN     | D2 — cities & categories        |

## Test accounts

Use the credentials seeded by the API (`shodumo-api` seed). Any account whose role is
`ORGANIZER` or `ADMIN` can sign in; an `ATTENDEE` is rejected with "no cabinet access".

## Documented API gaps

The UI honors the intended UX while staying faithful to the current API contract:

- **Draft vs Submit** — both buttons persist the event. The API forces `PENDING` on create
  and the write DTO has no `status` field, so "Save draft" and "Submit for review" differ in
  copy/toast only.
- **Reject reason** — moderation reject sets status to `ARCHIVED`. The `moderate` endpoint
  accepts `{ status: PUBLISHED | ARCHIVED }` only; the typed reason is kept for the operator's
  note and not sent.
- **Cover upload** — `POST /media` needs an `eventId`, so the file picker is enabled only after
  the first save. A cover URL field works at any time.
- **Taxonomy deactivation** — the API has no soft-disable, so cities/categories support delete
  only (surfaced with a note on the screen).
- **Organizer profile load** — there is no `GET /me/organizer`; the form seeds the name from the
  authenticated profile and upserts via `PATCH /me/organizer`.
