/* global window, document, localStorage */
// ShoDumo — bootstrap: theme, header, reveal-on-scroll, route dispatch
(function () {
  window.SD = window.SD || {};
  var icon = window.SD.icon || function () { return ''; };
  var auth = window.SD.auth;

  // ---------- theme ----------
  var THEME_KEY = 'sd_theme';
  function getTheme() {
    // light by default; only follow an explicit user choice
    try {
      var saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) { /* noop */ }
    return 'light';
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* noop */ }
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.innerHTML = icon(t === 'dark' ? 'sun' : 'moon', { size: 20 });
    });
  }
  function toggleTheme() {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }

  // ---------- icon injection ----------
  function injectStatics() {
    document.querySelectorAll('[data-icon]').forEach(function (n) {
      var name = n.getAttribute('data-icon');
      var size = parseInt(n.getAttribute('data-size'), 10) || 22;
      n.innerHTML = icon(name, { size: size });
    });
  }

  // ---------- reveal-on-scroll ----------
  function initReveal() {
    // no IntersectionObserver → reveal everything immediately (now and future)
    if (!('IntersectionObserver' in window)) {
      var revealAll = function () {
        document.querySelectorAll('.reveal:not(.is-in)').forEach(function (n) { n.classList.add('is-in'); });
      };
      revealAll();
      new MutationObserver(revealAll).observe(document.body, { childList: true, subtree: true });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    var observeAll = function (root) {
      (root || document).querySelectorAll('.reveal:not(.is-in)').forEach(function (n) { io.observe(n); });
    };
    observeAll();
    // observe future cards inserted by the feed / organizer / similar grids
    new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        for (var i = 0; i < m.addedNodes.length; i++) {
          var node = m.addedNodes[i];
          if (node.nodeType !== 1) continue;
          if (node.classList && node.classList.contains('reveal') && !node.classList.contains('is-in')) {
            io.observe(node);
          }
          if (node.querySelectorAll) observeAll(node);
        }
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  // ---------- header interactions ----------
  // delegated so controls injected after boot (e.g. sign-in prompts) also work
  function initHeader() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest(
        '[data-theme-toggle],[data-login],[data-register],[data-logout]'
      );
      if (!t) return;
      if (t.hasAttribute('data-theme-toggle')) { toggleTheme(); return; }
      if (!auth) return;
      if (t.hasAttribute('data-login')) auth.open({ mode: 'login' });
      else if (t.hasAttribute('data-register')) auth.open({ mode: 'register' });
      else if (t.hasAttribute('data-logout')) auth.logout();
    });
  }

  // ---------- language switch ----------
  // Static branches: uk → '/', en → '/en/'. Switching maps the current path to
  // its twin in the other language and remembers the choice.
  var LANG_KEY = 'sd_lang';
  function initLangSwitch() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-lang-toggle]');
      if (!btn) return;
      e.preventDefault();
      var cur = window.SD.lang || 'uk';
      var next = cur === 'en' ? 'uk' : 'en';
      try { localStorage.setItem(LANG_KEY, next); } catch (e2) { /* noop */ }
      // strip a leading /en, then re-add for the en branch
      var path = window.location.pathname.replace(/^\/en(\/|$)/, '/');
      var target = (next === 'en' ? '/en' : '') + path;
      window.location.href = target + window.location.search + window.location.hash;
    });
  }

  // ---------- boot ----------
  function boot() {
    applyTheme(getTheme());
    injectStatics();
    initHeader();
    initLangSwitch();
    initReveal();
    if (window.SD.city) window.SD.city.init();
    if (auth) { auth.syncAuthUI(); auth.refreshUser(); }

    if (window.SD.initHome) window.SD.initHome();
    if (window.SD.initEvent) window.SD.initEvent();
    if (window.SD.initOrganizer) window.SD.initOrganizer();
    if (window.SD.initMapPageRoute) window.SD.initMapPageRoute();
    if (window.SD.initSaved) window.SD.initSaved();
    if (window.SD.initProfile) window.SD.initProfile();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.SD.toggleTheme = toggleTheme;
})();
