# Shodumo Web

Public site for **ShoDumo** — an API-first afisha of micro-events in Lviv (забіги, дегустації, воркшопи, музика, маркети).

Plain **HTML + SCSS + vanilla JS** (no React/Vue), built with **Gulp**. Consumes the ShoDumo REST API. Event and organizer pages are **pre-rendered at build time** for SEO (server-side HTML, Open Graph, JSON-LD `Event`, canonical URLs, `sitemap.xml`, `robots.txt`).

## Stack

- **Gulp 4** — bundling, minification, autoprefixer, image optimization, sourcemaps, BrowserSync live-reload
- **SCSS** — design system with CSS custom properties (runtime light/dark themes)
- **Vanilla JS** — IIFE modules attached to a global `window.SD` namespace, concatenated into `bundle.js`
- **Leaflet + OpenStreetMap** — map page and per-event mini-maps
- **Node pre-render** — `scripts/prerender.js` generates SEO-critical static pages

## Requirements

- Node.js **18+** (the pre-render script uses the global `fetch`)
- The ShoDumo API running (default `http://localhost:3000`) for live data and pre-rendering.
  Without it, the build still succeeds and pre-render falls back to bundled offline sample data.

## Setup

```bash
npm install
cp .env.example .env   # then edit if needed
```

### Environment (`.env`)

| Variable        | Default                 | Purpose                                            |
| --------------- | ----------------------- | -------------------------------------------------- |
| `API_URL`       | `http://localhost:3000` | REST API base — single source for build, prerender and runtime |
| `SITE_URL`      | `http://localhost:3001` | Canonical/OG/sitemap absolute URLs                 |
| `DEFAULT_CITY`  | `lviv`                  | City slug used for the feed and pre-render         |
| `DEV_PORT`      | `3001`                  | BrowserSync dev server port                        |

`API_URL` is the **single source** of the client API address: the same value
feeds the runtime JS bundle (`gulp build`), the pre-render fetches and injected
markup (`gulp prerender`), and dev. The `http://localhost:3000` default applies
only when `API_URL` is unset (local dev); in a prod build `API_URL` fully
replaces it. Set it for prod, e.g.:

```bash
API_URL=https://api.shodumo.com npm run build
API_URL=https://api.shodumo.com npm run prerender
```

Values are injected at build time by replacing `__API_BASE_URL__`, `__SITE_URL__`, `__DEFAULT_CITY__` tokens in the JS and HTML.

## Scripts

```bash
npm run dev        # gulp: build + BrowserSync live-reload on DEV_PORT
npm run build      # gulp build: clean → html/styles/scripts/images/assets → prerender
npm run prerender  # regenerate SEO pages, sitemap, robots only
npm run clean      # remove dist/
```

## Build output (`dist/`)

```
dist/
  index.html                  # home feed (static cards pre-rendered, then hydrated)
  map.html                    # Leaflet map of events
  saved.html                  # current user's saved events (auth-gated, noindex)
  profile.html                # current user's profile card (auth-gated, noindex)
  about.html
  event/<slug>/index.html     # pre-rendered, OG + JSON-LD Event + canonical
  organizer/<id>/index.html   # pre-rendered organizer profile + events
  css/main.css(.map)
  js/bundle.js(.map)
  sitemap.xml  robots.txt  favicon.svg
```

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
| `event.js`      | `initEvent`                  | Event detail hydration: attend, share, mini-map, similar  |
| `organizer.js`  | `initOrganizer`              | Organizer profile hydration                               |
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

- Skeleton placeholders while loading, empty-state and error-state (with retry) views, optimistic attend/save with rollback on failure.
- Offline-safe pre-render fallback, lazy-loaded cover images, `aria-*` on dialogs/regions, keyboard-dismissable auth modal, reduced-motion-friendly reveal.

## Theming

Light/dark themes are CSS custom properties toggled via `data-theme` on `<html>`. **Light is the default**; only an explicit user choice (stored in `localStorage` as `sd_theme`) switches to dark — `prefers-color-scheme` is intentionally ignored. An inline script in `<head>` applies the saved theme before paint to avoid a flash.

## Feed rendering & freshness

The home feed is **pre-rendered for SEO and first paint**: `gulp prerender` fetches
published events and inlines ready event cards into `dist/index.html` (and
`dist/en/index.html`). The card markup has a **single source of truth** — the
`src/pages/partials/event-card.html` template — which is filled with `{{token}}`
values both by the Node pre-renderer (build time) and by the client (it clones the
embedded `<template id="event-card-tpl">` at runtime). There are **no card HTML
strings in the JS bundle**.

On load the client **hydrates** rather than replacing: it keeps the pre-rendered
cards, attaches interactivity, then silently re-fetches once to reconcile. Filter
and city changes fetch a subset and re-render only the grid.

Because the static cards are a **build-time snapshot**, they only refresh when the
site is rebuilt. To keep the pre-rendered feed current on **Cloudflare Pages**,
configure a **Deploy Hook** (Pages → Settings → Builds & deployments → Deploy hooks)
and have the API call that hook URL whenever events change (publish/update/delete),
or trigger it on a schedule (e.g. an hourly cron). Each hook call re-runs the build,
re-fetches events, and regenerates the inlined feed. _(No code change required —
this is purely deploy configuration.)_

## Notes

- Pre-rendered pages embed `data-icon` / `data-logo-mark` placeholders that the bundle fills on load, so the Node renderer and the browser share one icon source of truth.
- ЧПУ routes (`/event/:slug/`, `/organizer/:id/`) are emitted as directory `index.html` files so they work on any static host.
- The city picker stores the choice in `localStorage` (`sd_city`), filters the feed, and rewrites the hero with the Ukrainian locative case + correct preposition (`у`/`в`). Occupied cities are excluded from the list.
- Auth-gated pages (`saved.html`, `profile.html`) set `<meta name="robots" content="noindex, nofollow">` via a per-page `robots` include variable (default `index, follow`).
