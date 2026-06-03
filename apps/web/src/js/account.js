/* global window, document */
// ShoDumo — account routes: saved events list + profile card
(function () {
  window.SD = window.SD || {};
  var api = window.SD.api;
  var auth = window.SD.auth;
  var icon = window.SD.icon || function () { return ''; };
  var render = window.SD.render || {};
  var esc = (window.SD.util && window.SD.util.escapeHtml) || function (s) { return s; };
  var t = window.SD.t || function (k) { return k; };
  var langBase = window.SD.langBase || '';

  // shared "please sign in" prompt for gated pages
  function signInPrompt(title, text) {
    return (
      '<div class="empty-state">' +
      '<div class="icon">' + icon('profile', { size: 34 }) + '</div>' +
      '<h3>' + esc(title) + '</h3>' +
      '<p>' + esc(text) + '</p>' +
      '<div class="actions">' +
      '<button class="btn btn-accent" type="button" data-login>' + esc(t('auth.login')) + '</button>' +
      '<button class="btn btn-soft" type="button" data-register>' + esc(t('auth.register')) + '</button>' +
      '</div></div>'
    );
  }

  // ---------------------------------------------------------------- saved page
  function initSaved() {
    var gridEl = document.querySelector('[data-saved-grid]');
    if (!gridEl) return;
    var countEl = document.querySelector('[data-saved-count]');

    render.bindSaveButtons && render.bindSaveButtons(gridEl);

    function showGate() {
      gridEl.innerHTML = signInPrompt(t('saved.gateTitle'), t('saved.gateText'));
      if (countEl) countEl.textContent = '';
    }

    function load() {
      if (!api.isAuthed()) { showGate(); return; }
      gridEl.innerHTML = render.skeletonGrid(6);
      api.getSaved().then(function (res) {
        var data = Array.isArray(res) ? res : ((res && res.data) || []);
        if (!data.length) {
          gridEl.innerHTML = render.emptyState({
            icon: 'heart',
            title: t('saved.emptyTitle'),
            text: t('saved.emptyText'),
            actionHtml: '<a class="btn btn-accent" href="' + langBase + '/">' + esc(t('saved.toEvents')) + '</a>',
          });
          if (countEl) countEl.textContent = '';
          return;
        }
        if (render.replaceCards) render.replaceCards(gridEl, data);
        if (countEl) countEl.textContent = t('feed.count', { n: data.length });
      }).catch(function () {
        gridEl.innerHTML = render.errorState();
        if (countEl) countEl.textContent = '';
      });
    }

    gridEl.addEventListener('click', function (e) {
      if (e.target.closest('[data-retry]')) load();
    });

    document.addEventListener('sd:auth-expired', showGate);
    document.addEventListener('sd:auth-changed', load);
    load();
  }

  // ---------------------------------------------------------------- profile page
  function initProfile() {
    var host = document.querySelector('[data-profile]');
    if (!host) return;

    function render_() {
      if (!api.isAuthed()) {
        host.innerHTML = signInPrompt(t('profile.gateTitle'), t('profile.gateText'));
        return;
      }
      var u = (auth && auth.getUser && auth.getUser()) || {};
      var hue = (auth && auth.hueFor) ? auth.hueFor(u.email || u.name || 'x') : 'cat-music';
      var initials = (auth && auth.initials) ? auth.initials(u) : '?';
      host.innerHTML =
        '<div class="profile-card">' +
        '<div class="avatar avatar-lg ' + esc(hue) + '">' + esc(initials) + '</div>' +
        '<h1 class="name">' + esc(u.name || t('profile.guest')) + '</h1>' +
        (u.email ? '<p class="email">' + esc(u.email) + '</p>' : '') +
        '<div class="links">' +
        '<a class="btn btn-soft" href="' + langBase + '/saved.html">' + icon('heart', { size: 18 }) + '<span>' + esc(t('profile.savedLink')) + '</span></a>' +
        '<button class="btn btn-soft" type="button" data-logout><span>' + esc(t('profile.logout')) + '</span></button>' +
        '</div></div>';
    }

    document.addEventListener('sd:auth-expired', render_);
    document.addEventListener('sd:auth-changed', render_);
    render_();
  }

  window.SD.initSaved = initSaved;
  window.SD.initProfile = initProfile;
})();
