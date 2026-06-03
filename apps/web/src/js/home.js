/* global window, document */
// ShoDumo — shared renderers (window.SD.render) + home feed controller.
// Event cards come from ONE source of truth: the <template id="event-card-tpl">
// embedded in the page (src/pages/partials/event-card.html). The template is
// filled on the client here — so there are no card HTML strings living in the
// JS bundle.
(function () {
  window.SD = window.SD || {};
  var api = window.SD.api;
  var icon = window.SD.icon || function () { return ''; };
  var util = window.SD.util || {};
  var auth = window.SD.auth;
  var toast = window.SD.toast || function () {};
  var esc = util.escapeHtml || function (s) { return s; };
  var t = window.SD.t || function (k) { return k; };
  var langBase = window.SD.langBase || '';

  // ---------------------------------------------------------------- icons
  // fill empty [data-icon] placeholders inside a freshly built subtree
  function fillIcons(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('[data-icon]').forEach(function (n) {
      if (n.firstChild) return;
      var name = n.getAttribute('data-icon');
      var size = parseInt(n.getAttribute('data-size'), 10) || 22;
      n.innerHTML = icon(name, { size: size });
    });
  }

  // ---------------------------------------------------------------- card template
  // map an API event → the token set consumed by event-card.html
  function cardData(raw) {
    var e = util.normalizeEvent ? util.normalizeEvent(raw) : raw;
    var iso = '';
    var d = util.parseDate ? util.parseDate(e.startsAt) : null;
    if (d) iso = d.toISOString();
    var place = e.address || (e.city && e.city.name) ||
      (window.SD.city && window.SD.city.nameOf(window.SD.city.getSelected())) || '';
    return {
      id: esc(e.id),
      href: langBase + '/event/' + esc(e.slug) + '/',
      glyph: e.glyph,
      hue: e.hue,
      catLabel: esc(e.catLabel),
      title: esc(e.title),
      place: esc(place),
      going: esc(e.attendeeCount || 0),
      dateLabel: esc(e.dateLabel),
      startsAtIso: esc(iso),
      priceLabel: esc(e.priceLabel),
      coverSrc: esc(e.cover || ''),
      coverImgHide: e.cover ? '' : ' is-hidden',
      coverPhHide: e.cover ? ' is-hidden' : '',
      savedClass: e.isSaved ? ' is-saved' : '',
      freeClass: e.isPaid ? '' : ' is-free',
      saveLabel: esc(t('event.save')),
    };
  }

  var TPL_RE = /\{\{(\w+)\}\}/g;
  // clone the shared template and fill it for one event → a card element
  function cardEl(raw) {
    var tpl = document.getElementById('event-card-tpl');
    if (!tpl) return null;
    var data = cardData(raw);
    var html = tpl.innerHTML.replace(TPL_RE, function (m, k) {
      return data[k] != null ? data[k] : '';
    });
    var wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    var el = wrap.firstElementChild;
    if (el) fillIcons(el);
    return el;
  }

  // clear a grid and (re)render a list of events using the shared template
  function replaceCards(gridEl, list) {
    if (!gridEl) return;
    gridEl.innerHTML = '';
    var frag = document.createDocumentFragment();
    (list || []).forEach(function (raw) {
      var el = cardEl(raw);
      if (el) frag.appendChild(el);
    });
    gridEl.appendChild(frag);
  }

  // ---------------------------------------------------------------- non-card states
  function skeletonCard() {
    return (
      '<div class="skeleton-card">' +
      '<div class="skel" style="height:156px"></div>' +
      '<div class="body">' +
      '<div class="skel" style="height:12px;width:50%"></div>' +
      '<div class="skel" style="height:18px;width:85%"></div>' +
      '<div class="skel" style="height:12px;width:60%"></div>' +
      '</div></div>'
    );
  }

  function skeletonGrid(n) {
    var out = '';
    for (var i = 0; i < (n || 6); i++) out += skeletonCard();
    return out;
  }

  function emptyState(opts) {
    opts = opts || {};
    return (
      '<div class="empty-state">' +
      '<div class="icon">' + icon(opts.icon || 'search', { size: 34 }) + '</div>' +
      '<h3>' + esc(opts.title || t('feed.emptyTitle')) + '</h3>' +
      '<p>' + esc(opts.text || t('feed.emptyText')) + '</p>' +
      (opts.actionHtml || '') +
      '</div>'
    );
  }

  function errorState() {
    return (
      '<div class="empty-state">' +
      '<div class="icon">' + icon('close', { size: 34 }) + '</div>' +
      '<h3>' + esc(t('feed.errorTitle')) + '</h3>' +
      '<p>' + esc(t('feed.errorText')) + '</p>' +
      '<button class="btn btn-soft" type="button" data-retry>' + esc(t('feed.retry')) + '</button>' +
      '</div>'
    );
  }

  window.SD.render = {
    fillIcons: fillIcons,
    cardEl: cardEl,
    replaceCards: replaceCards,
    skeletonCard: skeletonCard,
    skeletonGrid: skeletonGrid,
    emptyState: emptyState,
    errorState: errorState,
  };

  // ---------------------------------------------------------------- save toggle (shared)
  function toggleSave(id, btn) {
    if (!auth) return;
    auth.requireAuth(function () {
      var saved = btn.classList.toggle('is-saved');
      btn.innerHTML = icon('heart', { size: 18, fill: saved });
      var op = saved ? api.attend(id, 'SAVED') : api.unattend(id, 'SAVED');
      op.then(function () {
        toast(saved ? t('toast.saved') : t('toast.unsaved'), { icon: saved ? 'heart' : 'check' });
      }).catch(function () {
        var back = btn.classList.toggle('is-saved');
        btn.innerHTML = icon('heart', { size: 18, fill: back });
        toast(t('toast.updateFailed'), { icon: 'close' });
      });
    });
  }
  window.SD.render.bindSaveButtons = function (root) {
    (root || document).addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-save]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      toggleSave(btn.getAttribute('data-id'), btn);
    });
  };

  // ---------------------------------------------------------------- home controller
  function initHome() {
    var gridEl = document.querySelector('[data-feed-grid]');
    if (!gridEl) return;
    var countEl = document.querySelector('[data-feed-count]');
    var chipsEl = document.querySelector('[data-filter-chips]');
    var sidebarEl = document.querySelector('[data-cat-list]');

    var defaultCity = (window.SD.config && window.SD.config.defaultCity) || 'lviv';
    var state = {
      category: '',
      city: (window.SD.city && window.SD.city.getSelected()) || defaultCity,
      page: 1,
      q: '',
    };

    // the feed is rendered entirely on the client — bind a delegated save
    // handler on the grid before the first load fills it with cards.
    window.SD.render.bindSaveButtons(gridEl);

    document.addEventListener('sd:city-changed', function (e) {
      state.city = (e.detail && e.detail.slug) || state.city;
      state.page = 1;
      load();
    });

    function wireFilters(scope) {
      if (!scope) return;
      scope.addEventListener('click', function (e) {
        var target = e.target.closest('[data-cat]');
        if (!target) return;
        state.category = target.getAttribute('data-cat') || '';
        state.page = 1;
        updateActive();
        load();
      });
    }
    function updateActive() {
      document.querySelectorAll('[data-cat]').forEach(function (n) {
        var on = (n.getAttribute('data-cat') || '') === state.category;
        n.classList.toggle('is-active', on);
      });
    }
    wireFilters(chipsEl);
    wireFilters(sidebarEl);

    gridEl.addEventListener('click', function (e) {
      if (e.target.closest('[data-retry]')) load();
    });

    // storm guard: only one feed request in flight at a time. Rapid triggers
    // (city change, category click, retry) coalesce instead of flooding the API.
    var inflight = false;
    // silent = keep the pre-rendered cards visible until fresh data arrives
    function load(opts) {
      opts = opts || {};
      if (inflight) return;
      inflight = true;
      if (!opts.silent) gridEl.innerHTML = window.SD.render.skeletonGrid(6);
      var params = { city: state.city, page: state.page, limit: 12 };
      if (state.category) params.category = state.category;
      if (state.q) params.q = state.q;
      api.getEvents(params).then(function (res) {
        var data = (res && res.data) || [];
        var meta = (res && res.meta) || {};
        if (!data.length) {
          gridEl.innerHTML = window.SD.render.emptyState({
            title: t('feed.noEventsTitle'),
            text: t('feed.noEventsText'),
          });
          if (countEl) countEl.textContent = '';
          return;
        }
        window.SD.render.replaceCards(gridEl, data);
        if (countEl) countEl.textContent = t('feed.count', { n: meta.total || data.length });
      }).catch(function () {
        // No auto-retry / no polling. A silent freshness pass keeps the existing
        // pre-rendered cards; a user-initiated load shows a manual "Retry" state.
        if (!opts.silent) {
          gridEl.innerHTML = window.SD.render.errorState();
          if (countEl) countEl.textContent = '';
        }
      }).then(function () {
        inflight = false;
      });
    }

    // populate category sidebar from API (if the container expects dynamic fill)
    if (sidebarEl && sidebarEl.hasAttribute('data-dynamic')) {
      api.getCategories().then(function (cats) {
        var rows = '<button class="row is-active" data-cat="">' +
          icon('sparkles', { size: 18 }) + '<span>' + esc(t('sidebar.allEvents')) + '</span></button>';
        (cats || []).forEach(function (c) {
          var meta = window.SD.categoryMeta ? window.SD.categoryMeta(c) : { glyph: 'sparkles', label: c.name };
          rows += '<button class="row" data-cat="' + esc(c.slug) + '">' +
            icon(meta.glyph, { size: 18 }) + '<span>' + esc(c.name) + '</span></button>';
        });
        sidebarEl.innerHTML = rows;
      }).catch(function () {});
    }

    updateActive();
    // initial client-side load — show skeletons, then render cards from the API
    load();
  }

  window.SD.initHome = initHome;
})();
