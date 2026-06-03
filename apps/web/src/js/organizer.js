/* global window, document */
// ShoDumo — organizer profile controller: /organizers/:id returns profile + events
(function () {
  window.SD = window.SD || {};
  var api = window.SD.api;
  var util = window.SD.util || {};
  var render = window.SD.render || {};
  var esc = util.escapeHtml || function (s) { return s; };
  var t = window.SD.t || function (k) { return k; };

  function initOrganizer() {
    var root = document.querySelector('[data-organizer-page]');
    if (!root) return;
    var id = root.getAttribute('data-organizer-id');
    if (!id) return;

    var heroEl = root.querySelector('[data-org-hero]');
    var gridEl = root.querySelector('[data-org-grid]');
    var countEl = root.querySelector('[data-org-count]');

    if (render.bindSaveButtons) render.bindSaveButtons(root);
    if (gridEl) gridEl.innerHTML = render.skeletonGrid ? render.skeletonGrid(6) : '';

    api.getOrganizer(id).then(function (org) {
      if (heroEl) heroEl.innerHTML = heroHtml(org);
      document.title = (org.name || t('organizer.fallbackName')) + ' — ShoDumo';

      var events = org.events || [];
      if (gridEl) {
        if (!events.length) {
          gridEl.innerHTML = render.emptyState ? render.emptyState({
            title: t('organizer.emptyTitle'),
            text: t('organizer.emptyText'),
          }) : '';
        } else if (render.replaceCards) {
          render.replaceCards(gridEl, events);
        }
      }
      if (countEl) countEl.textContent = events.length ? t('feed.count', { n: events.length }) : '';
    }).catch(function () {
      if (gridEl) gridEl.innerHTML = render.errorState ? render.errorState() : '';
    });
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
