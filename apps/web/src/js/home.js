/* global window, document */
// ShoDumo — shared renderers (window.SD.render) + home feed controller
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

  // ---------------------------------------------------------------- renderers
  // category placeholder cover (ph) for an event view-model
  function coverHtml(e, opts) {
    opts = opts || {};
    var glyphSize = opts.glyphSize || 34;
    if (e.cover) {
      return (
        '<img class="cover-img" src="' + esc(e.cover) + '" alt="' + esc(e.title) +
        '" loading="lazy" decoding="async">'
      );
    }
    return (
      '<div class="ph ' + e.hue + '" style="position:absolute;inset:0;width:100%;height:100%;border-radius:inherit">' +
      '<span class="ph__glyph">' + icon(e.glyph, { size: glyphSize }) + '</span>' +
      '<span class="ph__tag">' + esc(e.catLabel) + '</span>' +
      '</div>'
    );
  }

  function catChip(e, onCover) {
    return (
      '<span class="cat-chip' + (onCover ? ' cat-chip--on-cover' : '') + '">' +
      icon(e.glyph, { size: 14 }) + esc(e.catLabel) + '</span>'
    );
  }

  // full event card (anchor to detail). data-id for delegation.
  function cardHtml(raw) {
    var e = util.normalizeEvent ? util.normalizeEvent(raw) : raw;
    var priceCls = e.isPaid ? '' : ' is-free';
    return (
      '<a class="event-card reveal hoverable" href="' + langBase + '/event/' + esc(e.slug) + '/" data-event-card data-id="' + esc(e.id) + '">' +
      '<div class="event-card__cover">' +
      coverHtml(e) +
      '<span class="event-card__cat">' + catChip(e, true) + '</span>' +
      '<button class="heart-btn heart-btn--on-cover event-card__heart' + (e.isSaved ? ' is-saved' : '') +
      '" type="button" style="width:38px;height:38px" aria-label="' + esc(t('event.save')) + '" data-save data-id="' + esc(e.id) + '">' +
      icon('heart', { size: 18, fill: e.isSaved }) + '</button>' +
      '</div>' +
      '<div class="event-card__body">' +
      '<div class="event-card__top">' +
      '<span class="event-card__date">' + esc(e.dateLabel) + '</span>' +
      '<span class="event-card__price' + priceCls + '">' + esc(e.priceLabel) + '</span>' +
      '</div>' +
      '<h3 class="event-card__title">' + esc(e.title) + '</h3>' +
      '<div class="event-card__meta">' +
      '<span class="event-card__place">' + icon('pin', { size: 15 }) + '<span>' + esc(e.address || (e.city && e.city.name) || (window.SD.city && window.SD.city.nameOf(window.SD.city.getSelected())) || '') + '</span></span>' +
      '<span class="event-card__going">' + icon('users', { size: 15 }) + esc(e.attendeeCount || 0) + '</span>' +
      '</div>' +
      '</div>' +
      '</a>'
    );
  }

  function skeletonCard() {
    return (
      '<div class="skeleton-card">' +
      '<div class="skel" style="height:156px"></div>' +
      '<div class="skeleton-card__body">' +
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
      '<div class="empty-state__icon">' + icon(opts.icon || 'search', { size: 34 }) + '</div>' +
      '<h3>' + esc(opts.title || t('feed.emptyTitle')) + '</h3>' +
      '<p>' + esc(opts.text || t('feed.emptyText')) + '</p>' +
      (opts.actionHtml || '') +
      '</div>'
    );
  }

  function errorState(onRetry) {
    var html =
      '<div class="empty-state">' +
      '<div class="empty-state__icon">' + icon('close', { size: 34 }) + '</div>' +
      '<h3>' + esc(t('feed.errorTitle')) + '</h3>' +
      '<p>' + esc(t('feed.errorText')) + '</p>' +
      '<button class="btn btn--soft" type="button" data-retry>' + esc(t('feed.retry')) + '</button>' +
      '</div>';
    return html;
  }

  window.SD.render = {
    coverHtml: coverHtml,
    catChip: catChip,
    cardHtml: cardHtml,
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
        // revert on failure
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

    window.SD.render.bindSaveButtons(gridEl);

    // react to city switch from the header/sidebar dropdown
    document.addEventListener('sd:city-changed', function (e) {
      state.city = (e.detail && e.detail.slug) || state.city;
      state.page = 1;
      load();
    });

    // wire category chips + sidebar rows (data-cat attribute)
    function wireFilters(scope) {
      if (!scope) return;
      scope.addEventListener('click', function (e) {
        var t = e.target.closest('[data-cat]');
        if (!t) return;
        state.category = t.getAttribute('data-cat') || '';
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

    // retry delegation
    gridEl.addEventListener('click', function (e) {
      if (e.target.closest('[data-retry]')) load();
    });

    function load() {
      gridEl.innerHTML = window.SD.render.skeletonGrid(6);
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
        gridEl.innerHTML = data.map(window.SD.render.cardHtml).join('');
        if (countEl) countEl.textContent = t('feed.count', { n: meta.total || data.length });
      }).catch(function () {
        gridEl.innerHTML = window.SD.render.errorState();
        if (countEl) countEl.textContent = '';
      });
    }

    // populate category sidebar/chips from API (if containers expect dynamic fill)
    if (sidebarEl && sidebarEl.hasAttribute('data-dynamic')) {
      api.getCategories().then(function (cats) {
        var rows = '<button class="sidebar__row is-active" data-cat="">' +
          icon('sparkles', { size: 18 }) + '<span>' + esc(t('sidebar.allEvents')) + '</span></button>';
        (cats || []).forEach(function (c) {
          var meta = window.SD.categoryMeta ? window.SD.categoryMeta(c) : { glyph: 'sparkles', label: c.name };
          rows += '<button class="sidebar__row" data-cat="' + esc(c.slug) + '">' +
            icon(meta.glyph, { size: 18 }) + '<span>' + esc(c.name) + '</span></button>';
        });
        sidebarEl.innerHTML = rows;
      }).catch(function () {});
    }

    updateActive();
    load();
  }

  window.SD.initHome = initHome;
})();
