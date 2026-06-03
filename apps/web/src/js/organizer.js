/* global window, document */
// ShoDumo — organizer profile controller (fully client-rendered).
// Reads the id from the URL (/organizer/:id/ or /en/organizer/:id/), fetches
// GET /organizers/:id (profile + events) and builds the page into
// [data-organizer-root]. No build-time prerender.
(function () {
  window.SD = window.SD || {};
  var api = window.SD.api;
  var icon = window.SD.icon || function () { return ''; };
  var util = window.SD.util || {};
  var render = window.SD.render || {};
  var esc = util.escapeHtml || function (s) { return s; };
  var t = window.SD.t || function (k) { return k; };
  var langBase = window.SD.langBase || '';

  // id from the (language-stripped) path: /organizer/<id>/
  function idFromPath() {
    var path = window.location.pathname;
    if (langBase && path.indexOf(langBase) === 0) path = path.slice(langBase.length);
    var m = path.match(/\/organizer\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function initOrganizer() {
    var root = document.querySelector('[data-organizer-root]');
    if (!root) return;
    var id = idFromPath();
    if (!id) { renderNotFound(root); return; }

    root.innerHTML = shell(id);
    render.fillIcons && render.fillIcons(root);
    if (render.bindSaveButtons) render.bindSaveButtons(root);

    var heroEl = root.querySelector('[data-org-hero]');
    var gridEl = root.querySelector('[data-org-grid]');
    var countEl = root.querySelector('[data-org-count]');
    if (gridEl) gridEl.innerHTML = render.skeletonGrid ? render.skeletonGrid(6) : '';

    api.getOrganizer(id).then(function (org) {
      if (!org || !org.id) { renderNotFound(root); return; }
      if (heroEl) {
        heroEl.innerHTML = heroHtml(org);
        render.fillIcons && render.fillIcons(heroEl);
      }
      document.title = (org.name || t('organizer.fallbackName')) + ' — Shodumo';

      var events = org.events || [];
      if (gridEl) {
        if (!events.length) {
          gridEl.innerHTML = render.emptyState ? render.emptyState({
            title: t('organizer.emptyTitle'),
            text: t('organizer.emptyText'),
          }) : '';
          render.fillIcons && render.fillIcons(gridEl);
        } else if (render.replaceCards) {
          render.replaceCards(gridEl, events);
        }
      }
      if (countEl) countEl.textContent = events.length ? t('feed.count', { n: events.length }) : '';
    }).catch(function () {
      if (gridEl) {
        gridEl.innerHTML = render.errorState ? render.errorState() : '';
        render.fillIcons && render.fillIcons(gridEl);
      }
    });
  }

  function shell(id) {
    return '' +
'<main class="event" data-organizer-page data-organizer-id="' + esc(id) + '">' +
  '<a class="back-btn" href="' + langBase + '/"><span data-icon="back" data-size="18"></span><span>' + esc(t('event.back')) + '</span></a>' +
  '<div class="org-hero" data-org-hero></div>' +
  '<div class="feed-head" style="margin-top:8px"><h2>' + esc(t('organizer.events')) + '</h2><span class="feed-count" data-org-count></span></div>' +
  '<div class="grid" data-org-grid></div>' +
'</main>';
  }

  function renderNotFound(root) {
    document.title = t('organizer.fallbackName') + ' — Shodumo';
    root.innerHTML =
      '<main class="event"><div class="empty-state">' +
      '<div class="icon">' + icon('close', { size: 34 }) + '</div>' +
      '<h3>' + esc(t('organizer.emptyTitle')) + '</h3>' +
      '<p>' + esc(t('organizer.emptyText')) + '</p>' +
      '<a class="btn btn-soft" href="' + langBase + '/">' + esc(t('event.toFeed')) + '</a>' +
      '</div></main>';
    render.fillIcons && render.fillIcons(root);
  }

  function heroHtml(org) {
    var initial = (org.name || '?').trim().charAt(0).toUpperCase();
    var avatar = org.avatar
      ? '<img class="avatar" src="' + esc(org.avatar) + '" alt="' + esc(org.name) + '">'
      : '<div class="avatar cat-music" style="font-size:32px">' + esc(initial) + '</div>';
    var links = org.links || {};
    var linkHtml = '';
    if (links.website) linkHtml += '<a href="' + esc(links.website) + '" target="_blank" rel="noopener">' + esc(t('organizer.website')) + '</a>';
    if (links.instagram) linkHtml += '<a href="' + esc(links.instagram) + '" target="_blank" rel="noopener">' + esc(t('organizer.instagram')) + '</a>';
    if (links.telegram) linkHtml += '<a href="' + esc(links.telegram) + '" target="_blank" rel="noopener">' + esc(t('organizer.telegram')) + '</a>';
    return (
      avatar +
      '<div>' +
      '<h1 class="name">' + esc(org.name || t('organizer.fallbackName')) + '</h1>' +
      (org.bio ? '<p class="bio">' + esc(org.bio) + '</p>' : '') +
      (linkHtml ? '<div class="links">' + linkHtml + '</div>' : '') +
      '</div>'
    );
  }

  window.SD.initOrganizer = initOrganizer;
})();
