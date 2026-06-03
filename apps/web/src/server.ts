import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './main.server';
import { REQUEST_COOKIE, RESPONSE_STATUS } from './app/core/tokens';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');

/**
 * The browser CSR shell — used for client-only routes (cabinet/admin). The
 * `application` builder emits `index.csr.html` when SSR is on; fall back to
 * `index.html` for safety.
 */
const csrShell =
  [join(browserDistFolder, 'index.csr.html'), join(browserDistFolder, 'index.html')].find(
    (p) => existsSync(p),
  ) ?? join(browserDistFolder, 'index.html');

const app = express();

/**
 * Hostnames the SSR engine will render for. The public domain is supplied at
 * runtime via `ALLOWED_HOSTS` (comma-separated); `localhost` is always allowed
 * for local dev and container health checks.
 */
const allowedHosts = [
  'localhost',
  ...(process.env['ALLOWED_HOSTS'] ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean),
];

const commonEngine = new CommonEngine({ allowedHosts });

/**
 * Canonical public origin (no trailing slash) for robots/sitemap URLs. Prefers
 * the configured `SITE_URL`; otherwise derives it from the inbound request so
 * local dev and previews still produce correct absolute links.
 */
function siteOrigin(req: express.Request): string {
  const configured = (process.env['SITE_URL'] ?? '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  return `${req.protocol}://${req.headers.host}`;
}

/** API origin reachable from the server (private network in prod). */
const apiBase = (
  process.env['API_INTERNAL_URL'] ||
  process.env['API_PUBLIC_URL'] ||
  'http://localhost:3000'
).replace(/\/+$/, '');

/** Escape a string for safe inclusion in XML text/attribute content. */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface SitemapPath {
  /** Language-agnostic app path, e.g. '/' or '/event/slug'. */
  path: string;
  changefreq?: string;
  priority?: string;
}

/** Build a `<url>` block with uk/en/x-default hreflang alternates. */
function sitemapUrl(origin: string, entry: SitemapPath): string {
  const uk = `${origin}${entry.path}`;
  const en = `${origin}/en${entry.path === '/' ? '' : entry.path}`;
  const links = [
    `    <xhtml:link rel="alternate" hreflang="uk" href="${xmlEscape(uk)}"/>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${xmlEscape(en)}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(uk)}"/>`,
  ].join('\n');
  const extra = [
    entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : '',
    entry.priority ? `    <priority>${entry.priority}</priority>` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return `  <url>\n    <loc>${xmlEscape(uk)}</loc>\n${links}${extra ? `\n${extra}` : ''}\n  </url>`;
}

/**
 * robots.txt — allow the public site, keep crawlers out of the private SPA
 * routes and auth-modal query URLs, and point at the sitemap.
 */
app.get('/robots.txt', (req, res) => {
  const origin = siteOrigin(req);
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /cabinet',
    'Disallow: /admin',
    'Disallow: /*?auth=',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
  res.type('text/plain').send(body);
});

/**
 * sitemap.xml — static public pages plus every published event and its
 * organizer, each with uk/en/x-default hreflang alternates. Degrades to the
 * static pages if the API is unreachable (never 500s).
 */
app.get('/sitemap.xml', async (req, res) => {
  const origin = siteOrigin(req);
  const entries: SitemapPath[] = [
    { path: '/', changefreq: 'hourly', priority: '1.0' },
    { path: '/map', changefreq: 'daily', priority: '0.6' },
  ];

  try {
    const r = await fetch(`${apiBase}/events?lang=uk&limit=1000`, {
      headers: { accept: 'application/json' },
    });
    if (r.ok) {
      const json = (await r.json()) as { data?: Array<{ slug?: string; organizer?: { id?: string } }> };
      const events = Array.isArray(json?.data) ? json.data : [];
      const organizerIds = new Set<string>();
      for (const e of events) {
        if (e?.slug) {
          entries.push({ path: `/event/${e.slug}`, changefreq: 'daily', priority: '0.8' });
        }
        if (e?.organizer?.id) organizerIds.add(e.organizer.id);
      }
      for (const id of organizerIds) {
        entries.push({ path: `/organizer/${id}`, changefreq: 'weekly', priority: '0.5' });
      }
    }
  } catch {
    // API unreachable — emit the static pages only.
  }

  const urls = entries.map((e) => sitemapUrl(origin, e)).join('\n');
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
    'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    `${urls}\n</urlset>\n`;
  res.type('application/xml').send(xml);
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/**', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Cabinet + admin are client-only: heavy interactive UI (Angular Material,
 * Google Maps) on private pages with no SEO value, and they touch browser-only
 * APIs that would crash during SSR. Serve the CSR shell so Angular bootstraps in
 * the browser and skips the SSR engine for these routes.
 */
app.get(['/cabinet', '/cabinet/*', '/admin', '/admin/*'], (_req, res) => {
  res.sendFile(csrShell);
});

/**
 * Serve static files from /browser
 */
app.get(
  '**',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html'
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.get('**', (req, res, next) => {
  const { protocol, originalUrl, baseUrl, headers } = req;

  // Per-request holder a component may flip to 404 (missing event/organizer);
  // read after render resolves so the response carries the right HTTP status.
  const responseStatus = { code: 200 };

  commonEngine
    .render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [
        { provide: APP_BASE_HREF, useValue: baseUrl },
        // Forward the visitor's cookies so SSR HttpClient calls are authenticated.
        { provide: REQUEST_COOKIE, useValue: headers.cookie ?? '' },
        { provide: RESPONSE_STATUS, useValue: responseStatus },
      ],
    })
    .then((html) => res.status(responseStatus.code).send(html))
    .catch((err) => next(err));
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export default app;
