# ShoDumo — web (Angular 19 SSR)

The single front-end for **shodumo.com**. One Angular 19 standalone app serves:

- **Public site** (feed, event, organizer, map, search) — **server-rendered (SSR)**
  for crawlers and fast first paint, hydrated on the client with no flash
  (`provideClientHydration(withEventReplay())` + HTTP transfer cache).
- **Cabinet** (`/cabinet/*`) and **Admin** (`/admin/*`) — lazy-loaded, role-guarded
  routes in the **same app**, served as a **client-only CSR shell** (no SSR: they
  use Angular Material + Google Maps and browser-only APIs).

The legacy split (`apps/cabinet`, `app.shodumo.com`, the gulp `apps/_web_legacy`)
is retired — everything lives here behind one origin, so auth is same-origin cookie
based (httpOnly session + readable `csrf` echoed on mutations).

## Develop

```bash
npm install
npm start          # ng serve → http://localhost:4200
```

The dev server proxies nothing; the browser talks to the API at
`environment.apiBaseUrl` (default `http://localhost:3000`). Start the API
(`apps/api`) alongside.

## Build

```bash
npm run build      # production build → dist/web/{browser,server}
```

Output:

- `dist/web/browser/` — static assets + `index.csr.html` (the CSR shell for
  cabinet/admin) and `index.server.html` (the SSR template).
- `dist/web/server/server.mjs` — the Express + SSR entry. **Self-contained**
  (esbuild inlines Express and deps), so it runs without `node_modules`.

Run the production server locally:

```bash
PORT=4000 ALLOWED_HOSTS=shodumo.com npm run serve:ssr:web
```

## Runtime env (server)

| Var | Purpose | Example |
| --- | --- | --- |
| `PORT` | Listen port | `4000` |
| `ALLOWED_HOSTS` | Hosts the SSR engine renders for (comma-sep; `localhost` always allowed) | `shodumo.com` |
| `SITE_URL` | Canonical public origin for `robots.txt` / `sitemap.xml` / hreflang | `https://shodumo.com` |
| `API_INTERNAL_URL` | API origin reachable from the server (private docker network) | `http://api:3000` |
| `API_PUBLIC_URL` | Browser-facing API origin (sitemap fallback) | `https://api.shodumo.com` |

> The browser-facing API origin, Google Maps key and `siteUrl` are **baked at
> build time** from `src/environments/environment.production.ts`. `API_INTERNAL_URL`
> only affects SSR-side HttpClient and the sitemap crawl.

## SEO server routes

`src/server.ts` adds, ahead of the SSR catch-all:

- `GET /robots.txt` — allows the public site, disallows `/cabinet`, `/admin`,
  `/*?auth=`, and points at the sitemap.
- `GET /sitemap.xml` — static pages + every published event and its organizer,
  each with `uk` / `en` / `x-default` hreflang alternates. Degrades to static
  pages if the API is unreachable (never 500s).
- **Correct HTTP 404** for missing events/organizers: the component flips a
  per-request `RESPONSE_STATUS` holder during SSR; `server.ts` sends
  `res.status(404)` while still returning the rendered not-found page.

## Deploy

Containerized via `apps/web/Dockerfile` (multi-stage; the runner copies only
`dist/web`). Wired as the `web` service in
[`deploy/docker-compose.prod.yml`](../../deploy/docker-compose.prod.yml) — no
published ports; external traffic reaches it only through the Cloudflare Tunnel
(`shodumo.com` → `web:4000`).

```bash
cd deploy
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Required `.env.prod` keys for web: `WEB_ALLOWED_HOSTS`, `WEB_BASE_URL`,
`API_PUBLIC_URL` (see `.env.prod.example`).
