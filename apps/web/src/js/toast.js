/* global window, document */
// ShoDumo — toaster + shared view-model helpers (date/price/cover normalization)
(function () {
  window.SD = window.SD || {};
  var icon = (window.SD.icon) || function () { return ''; };
  var t = window.SD.t || function (k) { return k; };
  var lang = window.SD.lang || 'uk';
  var LOCALE = lang === 'en' ? 'en-GB' : 'uk-UA';

  // ---------- toaster ----------
  function ensureHost() {
    var host = document.querySelector('.toaster');
    if (!host) {
      host = document.createElement('div');
      host.className = 'toaster';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    return host;
  }

  function toast(message, opts) {
    opts = opts || {};
    var host = ensureHost();
    var el = document.createElement('div');
    el.className = 'toast';
    var glyph = opts.icon || 'check';
    el.innerHTML =
      '<span class="icon">' + icon(glyph, { size: 18 }) + '</span>' +
      '<span class="msg"></span>';
    el.querySelector('.msg').textContent = message;
    host.appendChild(el);
    var ttl = opts.duration || 2600;
    setTimeout(function () {
      el.style.transition = 'opacity .3s ease, transform .3s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
    }, ttl);
    return el;
  }

  toast.success = function (m, o) { return toast(m, Object.assign({ icon: 'check' }, o)); };
  toast.error = function (m, o) { return toast(m, Object.assign({ icon: 'close' }, o)); };
  toast.info = function (m, o) { return toast(m, Object.assign({ icon: 'sparkles' }, o)); };

  // ---------- date / price helpers (uk-UA) ----------
  var DATE_FMT = null;
  var TIME_FMT = null;
  var DAY_FMT = null;
  try {
    DATE_FMT = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long' });
    TIME_FMT = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' });
    DAY_FMT = new Intl.DateTimeFormat(LOCALE, { weekday: 'short' });
  } catch (e) { /* Intl missing */ }

  function parseDate(value) {
    if (!value) return null;
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDate(value) {
    var d = parseDate(value);
    if (!d) return '';
    if (DATE_FMT) return DATE_FMT.format(d);
    return d.toLocaleDateString();
  }

  function formatTime(value) {
    var d = parseDate(value);
    if (!d) return '';
    if (TIME_FMT) return TIME_FMT.format(d);
    return d.toLocaleTimeString();
  }

  // "сб, 14 червня · 18:00"
  function formatDateTime(value) {
    var d = parseDate(value);
    if (!d) return '';
    var wd = DAY_FMT ? DAY_FMT.format(d).replace('.', '') : '';
    var parts = [];
    if (wd) parts.push(wd + ',');
    parts.push(formatDate(d));
    return parts.join(' ') + ' · ' + formatTime(d);
  }

  function formatPrice(event) {
    if (!event) return '';
    if (!event.isPaid) return t('event.free');
    var p = event.price;
    if (p === null || p === undefined || p === '') return t('event.paid');
    var n = Number(p);
    if (isNaN(n)) return String(p);
    return t('event.priceUah', { n: Math.round(n) });
  }

  // map API event → card/detail view-model used by renderers
  function normalizeEvent(e) {
    if (!e) return null;
    var cat = window.SD.categoryMeta ? window.SD.categoryMeta(e.category) : { hue: 'cat-music', glyph: 'sparkles', label: t('card.notFound') };
    return {
      id: e.id,
      slug: e.slug,
      title: e.title,
      description: e.description || '',
      startsAt: e.startsAt,
      dateLabel: formatDateTime(e.startsAt),
      shortDate: formatDate(e.startsAt),
      time: formatTime(e.startsAt),
      address: e.address || '',
      lat: e.lat,
      lng: e.lng,
      cover: e.coverImage || '',
      isPaid: !!e.isPaid,
      priceLabel: formatPrice(e),
      city: e.city || null,
      category: e.category || null,
      organizer: e.organizer || null,
      attendeeCount: e.attendeeCount || (e._count && e._count.attendees) || 0,
      isAttending: !!e.isAttending,
      isSaved: !!e.isSaved,
      hue: cat.hue,
      glyph: cat.glyph,
      catLabel: cat.label,
    };
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.SD.toast = toast;
  window.SD.util = {
    formatDate: formatDate,
    formatTime: formatTime,
    formatDateTime: formatDateTime,
    formatPrice: formatPrice,
    normalizeEvent: normalizeEvent,
    escapeHtml: escapeHtml,
    parseDate: parseDate,
  };
})();
