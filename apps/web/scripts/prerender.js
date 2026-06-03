/* eslint-disable no-console */
// ShoDumo — SEO pre-render: event + organizer pages (per language), sitemap,
// robots, favicon. Builds a uk branch at the root and an en branch under /en/,
// fetching localized content with ?lang= and emitting hreflang alternates.
const fs = require('fs');
const path = require('path');

// ----------------------------------------------------------------- partials
const PARTIALS_DIR = path.join(__dirname, '..', 'src', 'pages', 'partials');

function readPartial(name) {
  return fs.readFileSync(path.join(PARTIALS_DIR, name), 'utf8');
}

// match @@t.dotted.key translation tokens (kept in sync with gulpfile T_TOKEN)
const T_TOKEN = /@@t\.([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)/g;

// minimal @@include / @@t / @@var resolver compatible with the gulp pipeline
function resolveIncludes(tpl, ctx, dict) {
  ctx = ctx || {};
  dict = dict || {};
  let out = tpl.replace(/@@include\(\s*'([^']+)'\s*(?:,\s*(\{[\s\S]*?\}))?\s*\)/g, function (_, file, json) {
    let childCtx = {};
    if (json) {
      try { childCtx = JSON.parse(json); } catch (e) { childCtx = {}; }
    }
    return resolveIncludes(readPartial(file), Object.assign({}, ctx, childCtx), dict);
  });
  // resolve @@t.* translation tokens from the active dictionary
  out = out.replace(T_TOKEN, function (m, key) {
    return Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : m;
  });
  // replace remaining @@var tokens (langBase, htmlLang, path, title, …)
  out = out.replace(/@@([a-zA-Z0-9_]+)/g, function (m, key) {
    return Object.prototype.hasOwnProperty.call(ctx, key) ? ctx[key] : '';
  });
  return out;
}

// ----------------------------------------------------------------- helpers
function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// translation lookup with {var} substitution, mirrors the client t()
function makeT(dict) {
  dict = dict || {};
  return function t(key, vars) {
    let str = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key;
    if (vars) {
      str = str.replace(/\{(\w+)\}/g, function (m, name) {
        return vars[name] != null ? vars[name] : '';
      });
    }
    return str;
  };
}

const CATS = [
  { match: ['run', 'забіг', 'zabig'], hue: 'cat-run', glyph: 'run' },
  { match: ['tasting', 'wine', 'дегуст'], hue: 'cat-tasting', glyph: 'wine' },
  { match: ['workshop', 'воркшоп', 'майстер'], hue: 'cat-workshop', glyph: 'workshop' },
  { match: ['music', 'музик'], hue: 'cat-music', glyph: 'music' },
  { match: ['market', 'маркет', 'ярмар'], hue: 'cat-market', glyph: 'market' },
];

function categoryMeta(category, t) {
  const key = ((category && (category.slug || category.name)) || '').toLowerCase();
  for (const c of CATS) {
    for (const m of c.match) {
      if (key.indexOf(m) !== -1) return { hue: c.hue, glyph: c.glyph, label: (category && category.name) || t('card.notFound') };
    }
  }
  return { hue: 'cat-music', glyph: 'sparkles', label: (category && category.name) || t('card.notFound') };
}

// per-language date/time formatters
function makeFormatters(code) {
  const locale = code === 'en' ? 'en-GB' : 'uk-UA';
  let DT, DATE, TIME;
  try {
    DT = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    DATE = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' });
    TIME = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  } catch (e) { /* ICU missing */ }
  function fmt(intl, v, iso) {
    const d = v ? new Date(v) : null;
    if (!d || isNaN(d.getTime())) return '';
    return intl ? intl.format(d) : (iso ? d.toISOString() : '');
  }
  return {
    dateTime: function (v) { return fmt(DT, v, true); },
    date: function (v) { return fmt(DATE, v, true); },
    time: function (v) { return fmt(TIME, v, false); },
  };
}

function priceLabel(e, t) {
  if (!e.isPaid) return t('event.free');
  if (e.price == null || e.price === '') return t('event.paid');
  const n = Number(e.price);
  return isNaN(n) ? String(e.price) : t('event.priceUah', { n: Math.round(n) });
}

// ----------------------------------------------------------------- card template
// Single source of the event-card markup: the same partial the client clones
// from <template id="event-card-tpl"> is filled here with {{token}} values.
let CARD_TPL = null;
function cardTemplate() {
  if (CARD_TPL == null) CARD_TPL = readPartial('event-card.html');
  return CARD_TPL;
}
const CARD_TOKEN_RE = /\{\{(\w+)\}\}/g;
// match the (possibly empty) feed grid container in the built index.html so we
// can inline static cards between its open/close tags (non-global on purpose)
const FEED_GRID_RE = /(<div[^>]*\bdata-feed-grid\b[^>]*>)([\s\S]*?)(<\/div>)/;

// map an API event → the token set consumed by event-card.html (mirrors home.js cardData)
function cardHtml(e, lang, t, fmt) {
  const meta = categoryMeta(e.category, t);
  const place = e.address || (e.city && e.city.name) || t('city.lviv');
  let iso = '';
  const d = e.startsAt ? new Date(e.startsAt) : null;
  if (d && !isNaN(d.getTime())) iso = d.toISOString();
  const data = {
    id: esc(e.id),
    href: lang.base + '/event/' + esc(e.slug) + '/',
    glyph: meta.glyph,
    hue: meta.hue,
    catLabel: esc(meta.label),
    title: esc(e.title),
    place: esc(place),
    going: esc(e.attendeeCount || 0),
    dateLabel: esc(fmt.dateTime(e.startsAt)),
    startsAtIso: esc(iso),
    priceLabel: esc(priceLabel(e, t)),
    coverSrc: esc(e.coverImage || ''),
    coverImgHide: e.coverImage ? '' : ' is-hidden',
    coverPhHide: e.coverImage ? ' is-hidden' : '',
    savedClass: e.isSaved ? ' is-saved' : '',
    freeClass: e.isPaid ? '' : ' is-free',
    saveLabel: esc(t('event.save')),
  };
  return cardTemplate().replace(CARD_TOKEN_RE, function (m, k) {
    return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : '';
  });
}

// ----------------------------------------------------------------- api fetch
async function fetchJson(url) {
  if (typeof fetch !== 'function') throw new Error('global fetch unavailable (Node 18+ required)');
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
  return res.json();
}

const OFFLINE_EVENTS = [
  {
    id: 'demo-1', slug: 'rankovyi-zabig-stryiskyi-park', title: 'Ранковий забіг у Стрийському парку',
    description: 'Легкий груповий забіг 5 км парковими алеями. Підходить для всіх рівнів.',
    startsAt: '2026-06-14T07:00:00.000Z', address: 'Стрийський парк, Львів', lat: 49.8228, lng: 24.0232,
    isPaid: false, price: null, city: { name: 'Львів', slug: 'lviv' }, category: { name: 'Забіги', slug: 'забіги' },
    organizer: { id: 'org-1', name: 'Lviv Run Club' }, organizerId: 'org-1', attendeeCount: 42,
  },
];

// ----------------------------------------------------------------- renderers
function eventBody(e, lang, t, fmt) {
  const meta = categoryMeta(e.category, t);
  const free = !e.isPaid;
  const cityName = (e.city && e.city.name) || t('city.lviv');
  const place = e.address || cityName;
  const org = e.organizer || {};
  const lb = lang.base;
  return `
<main class="event" data-event-page data-slug="${esc(e.slug)}">
  <a class="back-btn" href="${lb}/"><span data-icon="back" data-size="18"></span><span>${esc(t('event.back'))}</span></a>
  <div class="layout">
    <div class="main">
      <div class="hero-cover">
        <div class="ph ${meta.hue}">
          ${e.coverImage ? `<img class="cover-img" src="${esc(e.coverImage)}" alt="${esc(e.title)}">` : `<span class="glyph" data-icon="${meta.glyph}" data-size="64"></span><span class="tag">${esc(meta.label)}</span>`}
        </div>
        <span class="cat cat-chip cat-chip-on-cover"><span data-icon="${meta.glyph}" data-size="14"></span> ${esc(meta.label)}</span>
        <button class="share-btn" type="button" data-share><span data-icon="share" data-size="18"></span><span>${esc(t('event.share'))}</span></button>
      </div>

      <div class="badges">
        <span class="badge ${free ? 'badge-free' : 'badge-paid'}">${esc(priceLabel(e, t))}</span>
        <span class="cat-chip"><span data-icon="${meta.glyph}" data-size="14"></span> ${esc(meta.label)}</span>
      </div>

      <h1 class="heading">${esc(e.title)}</h1>

      <div class="info-rows">
        <div class="info-row">
          <span class="icon" data-icon="calendar" data-size="20"></span>
          <div><div class="title">${esc(fmt.date(e.startsAt))}</div><div class="sub">${esc(fmt.time(e.startsAt))}</div></div>
        </div>
        <div class="info-row">
          <span class="icon" data-icon="pin" data-size="20"></span>
          <div><div class="title">${esc(place)}</div><div class="sub">${esc(cityName)}</div></div>
        </div>
      </div>

      <h2 class="section-title">${esc(t('event.about'))}</h2>
      <div class="desc"><p>${esc(e.description || '').replace(/\n+/g, '</p><p>')}</p></div>

      <div class="mini-map" data-mini-map aria-label="${esc(t('event.mapAria'))}"></div>

      <section class="similar">
        <h2>${esc(t('event.similar'))}</h2>
        <div class="grid" data-similar-grid></div>
      </section>
    </div>

    <aside class="aside">
      <div class="panel">
        <div class="info-row">
          <span class="icon" data-icon="calendar" data-size="20"></span>
          <div><div class="title">${esc(fmt.dateTime(e.startsAt))}</div><div class="sub">${esc(place)}</div></div>
        </div>
        <div class="going-box">
          <div><span class="n" data-going-count>${esc(e.attendeeCount || 0)}</span><span class="label">${esc(t('event.going'))}</span></div>
          <span class="icon" data-icon="users" data-size="26"></span>
        </div>
        <div class="actions">
          <button class="going-btn going-btn-full" type="button" data-attend><span data-icon="plus" data-size="20"></span><span>${esc(t('event.cta.go'))}</span></button>
          <button class="heart-btn" type="button" style="width:54px;height:54px" data-save data-id="${esc(e.id)}" aria-label="${esc(t('event.save'))}"><span data-icon="heart" data-size="20"></span></button>
        </div>
        ${org.id ? `<a class="organizer-card" href="${lb}/organizer/${esc(org.id)}/">
          <span class="avatar cat-music" style="width:46px;height:46px;font-size:18px">${esc((org.name || '?').charAt(0).toUpperCase())}</span>
          <div><div class="label">${esc(t('event.organizer'))}</div><div class="name">${esc(org.name || '')}</div></div>
          <span class="chev" data-icon="chevRight" data-size="20"></span>
        </a>` : ''}
      </div>
    </aside>
  </div>

  <div class="action-bar">
    <div class="count"><span class="n" data-going-count>${esc(e.attendeeCount || 0)}</span><span class="label">${esc(t('event.going'))}</span></div>
    <button class="going-btn going-btn-full" type="button" data-attend><span data-icon="plus" data-size="20"></span><span>${esc(t('event.cta.go'))}</span></button>
  </div>
</main>`;
}

function organizerBody(org, events, lang, t, fmt) {
  const lb = lang.base;
  const cards = (events || []).map(function (e) {
    return cardHtml(e, lang, t, fmt);
  }).join('');
  return `
<main class="event" data-organizer-page data-organizer-id="${esc(org.id)}">
  <a class="back-btn" href="${lb}/"><span data-icon="back" data-size="18"></span><span>${esc(t('event.back'))}</span></a>
  <div class="org-hero" data-org-hero>
    <div class="avatar cat-music" style="font-size:32px">${esc((org.name || '?').charAt(0).toUpperCase())}</div>
    <div><h1 class="name">${esc(org.name || t('organizer.fallbackName'))}</h1>${org.bio ? `<p class="bio">${esc(org.bio)}</p>` : ''}</div>
  </div>
  <div class="feed-head" style="margin-top:8px"><h2>${esc(t('organizer.events'))}</h2><span class="feed-count" data-org-count></span></div>
  <div class="grid" data-org-grid>${cards}</div>
</main>`;
}

// ----------------------------------------------------------------- SEO head
function eventHeadExtra(e, site, lang, t) {
  const url = site + lang.base + '/event/' + e.slug + '/';
  const img = e.coverImage || '';
  const cityName = (e.city && e.city.name) || t('city.lviv');
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    description: e.description || '',
    startDate: e.startsAt,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url,
    image: img ? [img] : undefined,
    location: {
      '@type': 'Place',
      name: e.address || cityName,
      address: { '@type': 'PostalAddress', addressLocality: cityName, addressCountry: 'UA' },
      geo: (e.lat != null && e.lng != null) ? { '@type': 'GeoCoordinates', latitude: e.lat, longitude: e.lng } : undefined,
    },
    offers: {
      '@type': 'Offer',
      price: e.isPaid ? Number(e.price || 0) : 0,
      priceCurrency: 'UAH',
      availability: 'https://schema.org/InStock',
      url,
    },
    organizer: e.organizer ? { '@type': 'Organization', name: e.organizer.name } : undefined,
  };
  return (
    (img ? '<meta property="og:image" content="' + esc(img) + '" />\n' : '') +
    '<meta property="og:type" content="event" />\n' +
    '<script type="application/ld+json">' + JSON.stringify(jsonld) + '</script>'
  );
}

// ----------------------------------------------------------------- assembly
// English slug→name fallback for the client city picker (mirrors gulp inject)
let TAXONOMY_EN = null;
function loadTaxonomyEn() {
  if (TAXONOMY_EN) return TAXONOMY_EN;
  try {
    const tx = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'i18n', 'taxonomy.en.json'), 'utf8'));
    TAXONOMY_EN = { cities: tx.cities || {}, categories: tx.categories || {} };
  } catch (e) { TAXONOMY_EN = { cities: {}, categories: {} }; }
  return TAXONOMY_EN;
}

function buildI18nScript(lang) {
  const taxonomy = lang.code === 'en' ? loadTaxonomyEn() : null;
  return '<script>window.SD=window.SD||{};' +
    "window.SD.lang='" + lang.code + "';" +
    "window.SD.langBase='" + lang.base + "';" +
    (taxonomy ? 'window.SD.taxonomy=' + JSON.stringify(taxonomy) + ';' : '') +
    'window.SD.i18nDict=' + JSON.stringify(lang.dict || {}) + ';</script>';
}

function writeFile(distDir, rel, content) {
  const full = path.join(distDir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
}

// ----------------------------------------------------------------- main
module.exports = async function prerender(opts) {
  const { apiBaseUrl, siteUrl, distDir } = opts;
  const base = (apiBaseUrl || '').replace(/\/+$/, '');
  const site = (siteUrl || '').replace(/\/+$/, '');
  const LANGS = (opts.langs && opts.langs.length)
    ? opts.langs.map((l) => ({ code: l.code, base: l.base || '', dict: l.dict || {} }))
    : [{ code: 'uk', base: '', dict: {} }];

  function pageShell(lang, headCtx, bodyHtml, headExtra, tabCtx) {
    const dict = lang.dict;
    const baseCtx = {
      robots: 'index, follow',
      langBase: lang.base,
      htmlLang: lang.code,
      ogLocale: dict['og.locale'] || (lang.code === 'en' ? 'en_US' : 'uk_UA'),
    };
    const head = resolveIncludes(readPartial('head.html'), Object.assign({}, baseCtx, headCtx), dict)
      .replace('<!--HEAD_EXTRA-->', headExtra || '')
      .replace('<!--I18N_DATA-->', buildI18nScript(lang));
    const header = resolveIncludes(readPartial('header.html'), baseCtx, dict);
    const tabbar = resolveIncludes(readPartial('tabbar.html'), Object.assign({}, baseCtx, tabCtx || {}), dict);
    const footer = resolveIncludes(readPartial('footer.html'), baseCtx, dict);
    let out = head + header + bodyHtml + tabbar + footer;
    out = out.split('__SITE_URL__').join(site)
      .split('__API_BASE_URL__').join(base);
    return out;
  }

  // slug/id sets shared across languages → drive the sitemap alternates
  const eventLastmod = new Map(); // slug → lastmod (iso|undefined)
  const orgIdSet = new Set();

  for (const lang of LANGS) {
    const t = makeT(lang.dict);
    const fmt = makeFormatters(lang.code);

    let events = [];
    try {
      const res = await fetchJson(base + '/events?limit=100&lang=' + lang.code);
      events = (res && res.data) || [];
      console.log('[prerender] ' + lang.code + ': fetched ' + events.length + ' events');
    } catch (err) {
      console.warn('[prerender] ' + lang.code + ': API unavailable (' + err.message + ') — using offline fallback');
      events = OFFLINE_EVENTS;
    }

    // event pages
    events.forEach(function (e) {
      if (!e.slug) return;
      const desc = ((e.description || '').slice(0, 160)) || t('event.descFallback');
      const headCtx = { title: e.title + ' — Shodumo', desc: desc, path: '/event/' + e.slug + '/' };
      const html = pageShell(lang, headCtx, eventBody(e, lang, t, fmt), eventHeadExtra(e, site, lang, t), { feedActive: '', mapActive: '' });
      writeFile(distDir, path.join(lang.base, 'event', e.slug, 'index.html'), html);
      if (!eventLastmod.has(e.slug)) eventLastmod.set(e.slug, e.updatedAt);
    });

    // organizer pages — feed only carries organizerId, so fetch each profile
    const orgIds = Array.from(new Set(events.map(function (e) { return e.organizerId; }).filter(Boolean)));
    for (const id of orgIds) {
      let org = null;
      try {
        org = await fetchJson(base + '/organizers/' + encodeURIComponent(id) + '?lang=' + lang.code);
      } catch (err) {
        continue; // skip organizers that fail to load
      }
      const desc = (org.bio || t('organizer.metaDesc', { name: org.name || '' })).slice(0, 160);
      const headCtx = { title: (org.name || t('organizer.fallbackName')) + ' — Shodumo', desc: desc, path: '/organizer/' + id + '/' };
      const html = pageShell(lang, headCtx, organizerBody(org, org.events || [], lang, t, fmt), '', { feedActive: '', mapActive: '' });
      writeFile(distDir, path.join(lang.base, 'organizer', String(id), 'index.html'), html);
      orgIdSet.add(String(id));
    }

    // inline ready feed cards into the already-built index.html (per language)
    try {
      const indexPath = path.join(distDir, lang.base, 'index.html');
      let indexHtml = fs.readFileSync(indexPath, 'utf8');
      const feedCards = events.filter(function (e) { return e.slug; })
        .map(function (e) { return cardHtml(e, lang, t, fmt); }).join('');
      if (feedCards && FEED_GRID_RE.test(indexHtml)) {
        indexHtml = indexHtml.replace(FEED_GRID_RE, '$1' + feedCards + '$3');
        fs.writeFileSync(indexPath, indexHtml, 'utf8');
        console.log('[prerender] ' + lang.code + ': injected ' + events.length + ' feed cards into index.html');
      }
    } catch (err) {
      console.warn('[prerender] ' + lang.code + ': index feed injection skipped (' + err.message + ')');
    }
  }

  // ----------------------------------------------------------------- sitemap
  // one <url> per (path, language) with xhtml:link hreflang alternates
  const groups = [];
  const staticPaths = [
    { p: '/', priority: '1.0' },
    { p: '/map.html', priority: '0.6' },
    { p: '/about.html', priority: '0.4' },
  ];
  staticPaths.forEach(function (s) { groups.push({ path: s.p, priority: s.priority }); });
  Array.from(eventLastmod.keys()).forEach(function (slug) {
    groups.push({ path: '/event/' + slug + '/', priority: '0.8', lastmod: eventLastmod.get(slug) });
  });
  Array.from(orgIdSet).forEach(function (id) {
    groups.push({ path: '/organizer/' + id + '/', priority: '0.5' });
  });

  function altLinks(p) {
    const links = LANGS.map(function (l) {
      return '<xhtml:link rel="alternate" hreflang="' + l.code + '" href="' + esc(site + l.base + p) + '"/>';
    });
    links.push('<xhtml:link rel="alternate" hreflang="x-default" href="' + esc(site + p) + '"/>');
    return links.join('');
  }

  const urls = [];
  groups.forEach(function (g) {
    LANGS.forEach(function (l) {
      urls.push(
        '  <url><loc>' + esc(site + l.base + g.path) + '</loc>' +
        (g.lastmod ? '<lastmod>' + new Date(g.lastmod).toISOString().slice(0, 10) + '</lastmod>' : '') +
        altLinks(g.path) +
        '<priority>' + g.priority + '</priority></url>'
      );
    });
  });

  const sitemap =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    urls.join('\n') +
    '\n</urlset>\n';
  writeFile(distDir, 'sitemap.xml', sitemap);

  // robots.txt
  writeFile(distDir, 'robots.txt', 'User-agent: *\nAllow: /\n\nSitemap: ' + site + '/sitemap.xml\n');

  // favicon (bubble-pin mark)
  writeFile(distDir, 'favicon.svg',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><defs><linearGradient id="g" x1="7" y1="4" x2="52" y2="52" gradientUnits="userSpaceOnUse"><stop stop-color="#7c3aed"/><stop offset=".55" stop-color="#d6259a"/><stop offset="1" stop-color="#ff5436"/></linearGradient></defs><path d="M28 4C16.4 4 7 12.7 7 23.4c0 8.2 5.6 15.2 14 18.6V52l8.8-7.4c.4 0 .8.05 1.2.05 11.6 0 21-8.7 21-19.4C52 12.7 39.6 4 28 4Z" fill="url(#g)"/><circle cx="19.5" cy="23.5" r="3.1" fill="#fff"/><circle cx="28" cy="23.5" r="3.1" fill="#fff"/><circle cx="36.5" cy="23.5" r="3.1" fill="#fff"/></svg>\n');

  console.log('[prerender] wrote pages for ' + LANGS.map(function (l) { return l.code; }).join(', ') + ', sitemap, robots, favicon');
};
