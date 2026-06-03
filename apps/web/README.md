# Shodumo Web

Public site for **ShoDumo** — an API-first afisha of micro-events in Lviv (забіги, дегустації, воркшопи, музика, маркети).

Plain **HTML + SCSS + vanilla JS** (no React/Vue), built with **Gulp**. Consumes the ShoDumo REST API. The build emits a **static shell** (HTML/CSS/JS/assets); all content — feed, event pages, organizer pages — is fetched and rendered **on the client** from the API. There is **no build-time prerender**: a new event from the cabinet shows up in the feed and at `/event/:slug` immediately, with no rebuild.

## Stack

- **Gulp 4** — bundling, minification, autoprefixer, image optimization, sourcemaps, BrowserSync live-reload
- **SCSS** — design system with CSS custom properties (runtime light/dark themes)
- **Vanilla JS** — IIFE modules attached to a global `window.SD` namespace, concatenated into `bundle.js`
- **Leaflet + OpenStreetMap** — map page and per-event mini-maps

## Requirements

- Node.js **18+**
- The ShoDumo API running (default `http://localhost:3000`) for live data. The
  build does **not** call the API — it only injects the API base URL into the
  bundle — so `gulp build` always succeeds even when the API is down; the page
  then shows its loading / error states at runtime.

## Setup

```bash
npm install
cp .env.example .env   # then edit if needed
```

### Environment (`.env`)

| Variable        | Default                 | Purpose                                            |
| --------------- | ----------------------- | -------------------------------------------------- |
| `API_URL`       | `http://localhost:3000` | REST API base — single source for build and runtime |
| `SITE_URL`      | `http://localhost:3001` | Canonical/OG/sitemap absolute URLs                 |
| `DEFAULT_CITY`  | `lviv`                  | City slug used for the feed                        |
| `DEV_PORT`      | `3001`                  | BrowserSync dev server port                        |

`API_URL` is the **single source** of the client API address: the value is baked
into the JS bundle and HTML at build time so the runtime can fetch all content.
Set it for prod, e.g.:

```bash
API_URL=https://api.shodumo.com npm run build
```

Values are injected at build time by replacing `__API_BASE_URL__`, `__SITE_URL__`, `__APP_URL__`, `__DEFAULT_CITY__` tokens in the JS and HTML.

## Scripts

```bash
npm run dev        # gulp: build + BrowserSync live-reload on DEV_PORT
npm run build      # gulp build: clean → html/styles/scripts/images/assets/static
npm run clean      # remove dist/
```

On **Cloudflare Pages** the build command is `npm ci && npm run build` (no
prerender step). The `dist/_redirects` file rewrites deep links to the right
language shell so refreshing `/event/:slug` works.

## Build output (`dist/`)

```
dist/
  index.html                  # home feed shell (cards rendered on the client)
  map.html                    # Leaflet map of events
  saved.html                  # current user's saved events (auth-gated, noindex)
  profile.html                # current user's profile card (auth-gated, noindex)
  about.html
  event/index.html            # event shell — event.js renders from /events/:slug
  organizer/index.html        # organizer shell — organizer.js renders from /organizers/:id
  en/…                        # full English branch mirroring the above
  css/main.css(.map)
  js/bundle.js(.map)
  _redirects  sitemap.xml  robots.txt  favicon.svg
```

Deep links (`/event/:slug/`, `/organizer/:id/`, plus their `/en/…` twins) are
served by the matching shell via `_redirects` (status-200 rewrites); the client
reads the slug/id from the URL and fetches the content.

## Architecture

### JS modules (`src/js/`, concatenated in this order)

| File            | `window.SD.*`                | Responsibility                                            |
| --------------- | ---------------------------- | --------------------------------------------------------- |
| `config.js`     | `config`                     | Build-injected env (`apiBaseUrl`, `siteUrl`, `defaultCity`) |
| `icons.js`      | `icon`, `mark`, `categoryMeta` | SVG icon set, logo mark, category → hue/glyph mapping      |
| `api.js`        | `api`                        | Thin fetch client; `localStorage` tokens; auto-refresh on 401 |
| `toast.js`      | `toast`, `util`              | Toaster + date/price/view-model helpers (uk-UA)           |
| `auth.js`       | `auth`                       | Login/register modal, `requireAuth`, session UI sync (avatar initials) |
| `city.js`       | `city`                       | City picker dropdown (excludes occupied cities), locative-case hero, `sd:city-changed` |
| `map.js`        | `map`, `initMapPageRoute`    | Leaflet map page + event mini-map                         |
| `home.js`       | `render`, `initHome`         | Shared card/skeleton/empty renderers + feed controller    |
| `event.js`      | `initEvent`                  | Event detail: reads slug from URL, fetches + renders, attend/share/mini-map/similar |
| `organizer.js`  | `initOrganizer`              | Organizer profile: reads id from URL, fetches + renders profile + events |
| `account.js`    | `initSaved`, `initProfile`   | Saved-events list + profile card (auth-gated)             |
| `main.js`       | —                            | Bootstrap: theme, header, reveal-on-scroll, route dispatch |

### API contract consumed

- Feed: `GET /events?city=&category=&page=&limit=` → `{ data, meta }`
- Detail: `GET /events/:slug` (includes `organizer`, `media`)
- Organizer: `GET /organizers/:id` → profile `{ name, bio, avatar, links, events[] }`
- Taxonomy: `GET /categories`, `GET /cities` (merged with a built-in city list; occupied cities excluded)
- Auth: `POST /auth/register` (`{ email, password, name? }`), `POST /auth/login` (`{ email, password }`), `POST /auth/refresh`, `GET /auth/me` → `{ id, email, name, role }`. The display name is stored server-side and also embedded in the JWT; the client reconciles via `/auth/me`.
- Attendance: `POST /events/:id/attend`, `DELETE /events/:id/attend` — both take `{ type: 'GOING' | 'SAVED' }`
- Saved list: `GET /me/saved` → plain `Event[]`

Category slugs are **Cyrillic** (`забіги`, `дегустації`, `воркшопи`, `музика`, `маркети`); `categoryMeta()` matches both Cyrillic and Latin substrings to a colour hue + glyph.

### States & a11y

- Skeleton placeholders while loading, empty-state and error-state (with retry) views, optimistic attend/save with rollback on failure, 404 not-found state on event/organizer pages.
- Lazy-loaded cover images, `aria-*` on dialogs/regions, keyboard-dismissable auth modal, reduced-motion-friendly reveal.

## Theming

Light/dark themes are CSS custom properties toggled via `data-theme` on `<html>`. **Light is the default**; only an explicit user choice (stored in `localStorage` as `sd_theme`) switches to dark — `prefers-color-scheme` is intentionally ignored. An inline script in `<head>` applies the saved theme before paint to avoid a flash.

## Feed rendering

The home feed is rendered **entirely on the client**: `home.js` fetches published
events and builds cards on load (skeletons → cards, with empty/error/retry states).
The card markup has a **single source of truth** — the
`src/pages/partials/event-card.html` template — filled with `{{token}}` values by
the client, which clones the embedded `<template id="event-card-tpl">` at runtime.
There are **no card HTML strings in the JS bundle**.

Because everything is fetched live, the feed and every `/event/:slug` is **always
current**: a new event created in the cabinet appears immediately, with no rebuild
or deploy hook required.

## Notes

- Pages embed `data-icon` / `data-logo-mark` placeholders that the bundle fills on load.
- ЧПУ routes (`/event/:slug/`, `/organizer/:id/`) resolve to per-language shells via `dist/_redirects` (status-200 rewrites); the client reads the slug/id from the URL.
- The city picker stores the choice in `localStorage` (`sd_city`), filters the feed, and rewrites the hero with the Ukrainian locative case + correct preposition (`у`/`в`). Occupied cities are excluded from the list.
- Auth-gated pages (`saved.html`, `profile.html`) set `<meta name="robots" content="noindex, nofollow">` via a per-page `robots` include variable (default `index, follow`).
