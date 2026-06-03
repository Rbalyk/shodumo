/* global window, document */
// ShoDumo — event detail controller: attend toggle, mini-map, similar feed, share
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

  function initEvent() {
    var root = document.querySelector('[data-event-page]');
    if (!root) return;
    var slug = root.getAttribute('data-slug');
    if (!slug) return;

    if (render.bindSaveButtons) render.bindSaveButtons(document);
    wireShare();

    api.getEvent(slug).then(function (raw) {
      var e = util.normalizeEvent ? util.normalizeEvent(raw) : raw;
      hydrate(e);
      mountMiniMap(e);
      loadSimilar(e);
    }).catch(function () {
      // page is pre-rendered, so a fetch failure is non-fatal — just skip live bits
    });
  }

  function hydrate(e) {
    // attendee count
    document.querySelectorAll('[data-going-count]').forEach(function (n) {
      n.textContent = e.attendeeCount || 0;
    });
    // attend buttons (panel + mobile action bar)
    document.querySelectorAll('[data-attend]').forEach(function (btn) {
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
      // optimistic
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

  function mountMiniMap(e) {
    var el = document.querySelector('[data-mini-map]');
    if (!el || !window.SD.map) return;
    if (e.lat == null || e.lng == null) { el.style.display = 'none'; return; }
    window.SD.map.initMiniMap(el, e.lat, e.lng, e.hue);
  }

  function loadSimilar(e) {
    var wrap = document.querySelector('[data-similar-grid]');
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

  function wireShare() {
    document.querySelectorAll('[data-share]').forEach(function (btn) {
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
