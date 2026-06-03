/* global window, document */
// ShoDumo — event detail controller (fully client-rendered).
// Reads the slug from the URL (/event/:slug/ or /en/event/:slug/), fetches
// GET /events/:slug, builds the page into [data-event-root], and wires attend /
// save / share / mini-map / similar. No build-time prerender — works for any
// event without a rebuild and handles 404 with a friendly not-found state.
(function () {
  window.SD = window.SD || {};
  var api = window.SD.api;
  var icon = window.SD.icon || function () { return ''; };
  var util = window.SD.util || {};
  var auth = window.SD.auth;
  var toast = window.SD.toast || function () {};
  var render = window.SD.render || {};
  var esc = util.escapeHtml || function (s) { return s; };
  var t = window.SD.t || function (k) { return k; };
  var langBase = window.SD.langBase || '';

  // slug from the (language-stripped) path: /event/<slug>/
  function slugFromPath() {
    var path = window.location.pathname;
    if (langBase && path.indexOf(langBase) === 0) path = path.slice(langBase.length);
    var m = path.match(/\/event\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function initEvent() {
    var root = document.querySelector('[data-event-root]');
    if (!root) return;
    var slug = slugFromPath();
    if (!slug) { renderNotFound(root); return; }

    root.innerHTML = loadingState();
    render.fillIcons && render.fillIcons(root);

    api.getEvent(slug).then(function (raw) {
      if (!raw || !raw.id) { renderNotFound(root); return; }
      var e = util.normalizeEvent ? util.normalizeEvent(raw) : raw;
      root.innerHTML = eventBody(e);
      render.fillIcons && render.fillIcons(root);
      document.title = (e.title || t('meta.event.title')) + ' — Shodumo';
      if (render.bindSaveButtons) render.bindSaveButtons(root);
      wireShare(root);
      hydrate(root, e);
      mountMiniMap(e);
      loadSimilar(root, e);
    }).catch(function () {
      renderNotFound(root);
    });
  }

  // ---------------------------------------------------------------- markup
  function loadingState() {
    return (
      '<main class="event"><div class="empty-state">' +
      '<div class="icon">' + icon('calendar', { size: 34 }) + '</div>' +
      '<h3>' + esc(t('event.loading')) + '</h3>' +
      '</div></main>'
    );
  }

  function renderNotFound(root) {
    document.title = t('event.notFoundTitle') + ' — Shodumo';
    root.innerHTML =
      '<main class="event"><div class="empty-state">' +
      '<div class="icon">' + icon('close', { size: 34 }) + '</div>' +
      '<h3>' + esc(t('event.notFoundTitle')) + '</h3>' +
      '<p>' + esc(t('event.notFoundText')) + '</p>' +
      '<a class="btn btn-soft" href="' + langBase + '/">' + esc(t('event.toFeed')) + '</a>' +
      '</div></main>';
    render.fillIcons && render.fillIcons(root);
  }

  // build the full event page from the normalized view-model
  function eventBody(e) {
    var free = !e.isPaid;
    var cityName = (e.city && e.city.name) || t('city.lviv');
    var place = e.address || cityName;
    var org = e.organizer || {};
    var lb = langBase;
    var desc = esc(e.description || '').replace(/\n+/g, '</p><p>');
    return '' +
'<main class="event" data-event-page data-slug="' + esc(e.slug) + '">' +
  '<a class="back-btn" href="' + lb + '/"><span data-icon="back" data-size="18"></span><span>' + esc(t('event.back')) + '</span></a>' +
  '<div class="layout">' +
    '<div class="main">' +
      '<div class="hero-cover">' +
        '<div class="ph ' + e.hue + '">' +
          (e.cover
            ? '<img class="cover-img" src="' + esc(e.cover) + '" alt="' + esc(e.title) + '">'
            : '<span class="glyph" data-icon="' + e.glyph + '" data-size="64"></span><span class="tag">' + esc(e.catLabel) + '</span>') +
        '</div>' +
        '<span class="cat cat-chip cat-chip-on-cover"><span data-icon="' + e.glyph + '" data-size="14"></span> ' + esc(e.catLabel) + '</span>' +
        '<button class="share-btn" type="button" data-share><span data-icon="share" data-size="18"></span><span>' + esc(t('event.share')) + '</span></button>' +
      '</div>' +
      '<div class="badges">' +
        '<span class="badge ' + (free ? 'badge-free' : 'badge-paid') + '">' + esc(e.priceLabel) + '</span>' +
        '<span class="cat-chip"><span data-icon="' + e.glyph + '" data-size="14"></span> ' + esc(e.catLabel) + '</span>' +
      '</div>' +
      '<h1 class="heading">' + esc(e.title) + '</h1>' +
      '<div class="info-rows">' +
        '<div class="info-row">' +
          '<span class="icon" data-icon="calendar" data-size="20"></span>' +
          '<div><div class="title">' + esc(e.shortDate) + '</div><div class="sub">' + esc(e.time) + '</div></div>' +
        '</div>' +
        '<div class="info-row">' +
          '<span class="icon" data-icon="pin" data-size="20"></span>' +
          '<div><div class="title">' + esc(place) + '</div><div class="sub">' + esc(cityName) + '</div></div>' +
        '</div>' +
      '</div>' +
      '<h2 class="section-title">' + esc(t('event.about')) + '</h2>' +
      '<div class="desc"><p>' + desc + '</p></div>' +
      '<div class="mini-map" data-mini-map aria-label="' + esc(t('event.mapAria')) + '"></div>' +
      '<section class="similar">' +
        '<h2>' + esc(t('event.similar')) + '</h2>' +
        '<div class="grid" data-similar-grid></div>' +
      '</section>' +
    '</div>' +
    '<aside class="aside">' +
      '<div class="panel">' +
        '<div class="info-row">' +
          '<span class="icon" data-icon="calendar" data-size="20"></span>' +
          '<div><div class="title">' + esc(e.dateLabel) + '</div><div class="sub">' + esc(place) + '</div></div>' +
        '</div>' +
        '<div class="going-box">' +
          '<div><span class="n" data-going-count>' + esc(e.attendeeCount || 0) + '</span><span class="label">' + esc(t('event.going')) + '</span></div>' +
          '<span class="icon" data-icon="users" data-size="26"></span>' +
        '</div>' +
        '<div class="actions">' +
          '<button class="going-btn going-btn-full" type="button" data-attend><span data-icon="plus" data-size="20"></span><span>' + esc(t('event.cta.go')) + '</span></button>' +
          '<button class="heart-btn" type="button" style="width:54px;height:54px" data-save data-id="' + esc(e.id) + '" aria-label="' + esc(t('event.save')) + '"><span data-icon="heart" data-size="20"></span></button>' +
        '</div>' +
        (org.id
          ? '<a class="organizer-card" href="' + lb + '/organizer/' + esc(org.id) + '/">' +
              '<span class="avatar cat-music" style="width:46px;height:46px;font-size:18px">' + esc((org.name || '?').charAt(0).toUpperCase()) + '</span>' +
              '<div><div class="label">' + esc(t('event.organizer')) + '</div><div class="name">' + esc(org.name || '') + '</div></div>' +
              '<span class="chev" data-icon="chevRight" data-size="20"></span>' +
            '</a>'
          : '') +
      '</div>' +
    '</aside>' +
  '</div>' +
  '<div class="action-bar">' +
    '<div class="count"><span class="n" data-going-count>' + esc(e.attendeeCount || 0) + '</span><span class="label">' + esc(t('event.going')) + '</span></div>' +
    '<button class="going-btn going-btn-full" type="button" data-attend><span data-icon="plus" data-size="20"></span><span>' + esc(t('event.cta.go')) + '</span></button>' +
  '</div>' +
'</main>';
  }

  // ---------------------------------------------------------------- attend
  function hydrate(root, e) {
    root.querySelectorAll('[data-going-count]').forEach(function (n) {
      n.textContent = e.attendeeCount || 0;
    });
    root.querySelectorAll('[data-attend]').forEach(function (btn) {
      applyAttendState(btn, e.isAttending);
      btn.addEventListener('click', function () { onAttend(e, btn); });
    });
  }

  function applyAttendState(btn, going) {
    btn.classList.toggle('is-going', !!going);
    var label = going ? t('event.cta.going') : t('event.cta.go');
    btn.innerHTML = icon(going ? 'check' : 'plus', { size: 20 }) + '<span>' + label + '</span>';
  }

  function onAttend(e, btn) {
    if (!auth) return;
    auth.requireAuth(function () {
      var going = !btn.classList.contains('is-going');
      setAllAttend(going);
      bumpCount(going ? 1 : -1);
      var op = going ? api.attend(e.id, 'GOING') : api.unattend(e.id);
      op.then(function () {
        toast(going ? t('toast.going') : t('toast.notGoing'), { icon: going ? 'check' : 'close' });
      }).catch(function () {
        setAllAttend(!going);
        bumpCount(going ? -1 : 1);
        toast(t('toast.updateFailed'), { icon: 'close' });
      });
    });
  }

  function setAllAttend(going) {
    document.querySelectorAll('[data-attend]').forEach(function (b) { applyAttendState(b, going); });
  }

  function bumpCount(delta) {
    document.querySelectorAll('[data-going-count]').forEach(function (n) {
      var v = parseInt(n.textContent, 10) || 0;
      n.textContent = Math.max(0, v + delta);
    });
  }

  // ---------------------------------------------------------------- mini-map
  function mountMiniMap(e) {
    var el = document.querySelector('[data-mini-map]');
    if (!el || !window.SD.map) return;
    if (e.lat == null || e.lng == null) { el.style.display = 'none'; return; }
    window.SD.map.initMiniMap(el, e.lat, e.lng, e.hue);
  }

  // ---------------------------------------------------------------- similar
  function loadSimilar(root, e) {
    var wrap = root.querySelector('[data-similar-grid]');
    if (!wrap) return;
    var catSlug = e.category && e.category.slug;
    wrap.innerHTML = render.skeletonGrid ? render.skeletonGrid(3) : '';
    api.getEvents({ city: (e.city && e.city.slug) || 'lviv', category: catSlug, limit: 4 })
      .then(function (res) {
        var data = ((res && res.data) || []).filter(function (x) { return x.slug !== e.slug; }).slice(0, 3);
        if (!data.length) {
          var sec = wrap.closest('.similar');
          if (sec) sec.style.display = 'none';
          return;
        }
        if (render.replaceCards) render.replaceCards(wrap, data);
      })
      .catch(function () {
        var sec = wrap.closest('.similar');
        if (sec) sec.style.display = 'none';
      });
  }

  // ---------------------------------------------------------------- share
  function wireShare(root) {
    root.querySelectorAll('[data-share]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var url = window.location.href;
        var title = document.title;
        if (navigator.share) {
          navigator.share({ title: title, url: url }).catch(function () {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(function () {
            toast(t('toast.linkCopied'), { icon: 'check' });
          }).catch(function () {});
        }
      });
    });
  }

  window.SD.initEvent = initEvent;
})();
