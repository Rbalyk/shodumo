/* global window, document */
// ShoDumo — auth modal (login / register tabs) + session helpers
(function () {
  window.SD = window.SD || {};
  var api = window.SD.api;
  var icon = window.SD.icon || function () { return ''; };
  var toast = window.SD.toast || function () {};
  var t = window.SD.t || function (k) { return k; };

  var modalEl = null;
  var mode = 'login';
  var pending = null; // callback to run after successful auth

  function buildModal() {
    if (modalEl) return modalEl;
    var el = document.createElement('div');
    el.className = 'modal';
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', t('modal.login.title'));
    el.innerHTML =
      '<div class="modal__dialog">' +
      '  <div class="modal__head">' +
      '    <div>' +
      '      <div class="modal__logo logo"><span class="logo__text">Shodumo</span><span class="logo__dot" aria-hidden="true"></span></div>' +
      '      <h2 class="modal__title" data-title>' + t('modal.login.title') + '</h2>' +
      '      <p class="modal__hint" data-hint>' + t('modal.login.hint') + '</p>' +
      '    </div>' +
      '    <button class="modal__close" type="button" aria-label="' + t('modal.close') + '" data-close>' + icon('close', { size: 20 }) + '</button>' +
      '  </div>' +
      '  <div class="modal__tabs" role="tablist">' +
      '    <button type="button" data-tab="login" class="is-active">' + t('auth.login') + '</button>' +
      '    <button type="button" data-tab="register">' + t('auth.register') + '</button>' +
      '  </div>' +
      '  <form data-form novalidate>' +
      '    <label class="field modal__field" data-field-name hidden>' +
      '      <span class="field__label">' + t('modal.name') + '</span>' +
      '      <span class="field__wrap"><input type="text" name="name" autocomplete="name" placeholder="' + t('modal.namePlaceholder') + '"></span>' +
      '    </label>' +
      '    <label class="field">' +
      '      <span class="field__label">' + t('modal.email') + '</span>' +
      '      <span class="field__wrap"><input type="email" name="email" autocomplete="email" placeholder="you@email.com" required></span>' +
      '    </label>' +
      '    <label class="field">' +
      '      <span class="field__label">' + t('modal.password') + '</span>' +
      '      <span class="field__wrap"><input type="password" name="password" autocomplete="current-password" placeholder="••••••••" required minlength="6"></span>' +
      '    </label>' +
      '    <div class="modal__forgot" data-forgot><button type="button">' + t('modal.forgot') + '</button></div>' +
      '    <p class="form-error" data-error></p>' +
      '    <button type="submit" class="modal__submit" data-submit>' + t('modal.submit.login') + '</button>' +
      '  </form>' +
      '  <p class="modal__legal">' + t('modal.legal') + '</p>' +
      '</div>';
    document.body.appendChild(el);
    modalEl = el;
    wire(el);
    return el;
  }

  function wire(el) {
    el.addEventListener('click', function (e) {
      if (e.target === el) close();
    });
    el.querySelector('[data-close]').addEventListener('click', close);
    el.querySelectorAll('[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () { setMode(btn.getAttribute('data-tab')); });
    });
    el.querySelector('[data-form]').addEventListener('submit', onSubmit);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && el.getAttribute('aria-hidden') === 'false') close();
    });
  }

  function setMode(next) {
    mode = next;
    var el = modalEl;
    el.querySelectorAll('[data-tab]').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-tab') === next);
    });
    var isReg = next === 'register';
    el.querySelector('[data-title]').textContent = isReg ? t('modal.register.title') : t('modal.login.title');
    el.querySelector('[data-hint]').textContent = isReg ? t('modal.register.hint') : t('modal.login.hint');
    el.querySelector('[data-field-name]').hidden = !isReg;
    el.querySelector('[data-forgot]').style.display = isReg ? 'none' : '';
    el.querySelector('[data-submit]').textContent = isReg ? t('modal.submit.register') : t('modal.submit.login');
    el.querySelector('[data-error]').textContent = '';
    var pwd = el.querySelector('input[name="password"]');
    pwd.setAttribute('autocomplete', isReg ? 'new-password' : 'current-password');
  }

  function onSubmit(e) {
    e.preventDefault();
    var el = modalEl;
    var form = el.querySelector('[data-form]');
    var errEl = el.querySelector('[data-error]');
    var submit = el.querySelector('[data-submit]');
    errEl.textContent = '';

    var payload = {
      email: form.email.value.trim(),
      password: form.password.value,
    };
    if (mode === 'register') payload.name = form.name.value.trim();
    if (!payload.email || !payload.password) {
      errEl.textContent = t('modal.errFields');
      return;
    }

    submit.disabled = true;
    var prevText = submit.textContent;
    submit.textContent = t('modal.submitting');

    var creds = { email: payload.email, password: payload.password };
    if (mode === 'register' && payload.name) creds.name = payload.name;
    var op = mode === 'register' ? api.register(creds) : api.login(creds);
    op.then(function () {
      // optimistic local value, then reconcile with the server profile
      saveUser({ name: payload.name || '', email: payload.email });
      toast(mode === 'register' ? t('toast.registered') : t('toast.welcome'), { icon: 'check' });
      close();
      syncAuthUI();
      refreshUser();
      var cb = pending; pending = null;
      if (typeof cb === 'function') cb();
    }).catch(function (err) {
      errEl.textContent = friendly(err);
    }).then(function () {
      submit.disabled = false;
      submit.textContent = prevText;
    });
  }

  function friendly(err) {
    if (!err) return t('modal.errGeneric');
    if (err.status === 401) return t('modal.errCredentials');
    if (err.status === 409) return t('modal.errExists');
    return err.message || t('modal.errGeneric');
  }

  function open(opts) {
    opts = opts || {};
    buildModal();
    pending = opts.onSuccess || null;
    setMode(opts.mode || 'login');
    modalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var first = modalEl.querySelector(mode === 'register' ? 'input[name="name"]' : 'input[name="email"]');
    if (first) setTimeout(function () { first.focus(); }, 60);
  }

  function close() {
    if (!modalEl) return;
    modalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // require auth: run cb if logged in, otherwise open modal then run cb
  function requireAuth(cb) {
    if (api.isAuthed()) { cb(); return; }
    open({ onSuccess: cb });
  }

  // ---- current user (no /me endpoint: derive from form + JWT email) ----
  var USER_KEY = 'sd_user';
  function saveUser(u) {
    try { localStorage.setItem(USER_KEY, JSON.stringify(u || {})); } catch (e) { /* noop */ }
  }
  function getUser() {
    var u = null;
    try { u = JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (e) { u = null; }
    if (!u || !u.email) {
      var fromToken = userFromToken();
      if (fromToken.email) {
        u = { email: fromToken.email, name: (u && u.name) || fromToken.name || '' };
      }
    }
    return u || {};
  }
  function clearUser() {
    try { localStorage.removeItem(USER_KEY); } catch (e) { /* noop */ }
  }
  // decode { email, name } from the access-token payload (no network)
  function userFromToken() {
    var t = api.getAccess && api.getAccess();
    if (!t) return {};
    try {
      var part = t.split('.')[1];
      part = part.replace(/-/g, '+').replace(/_/g, '/');
      var json = decodeURIComponent(escape(atob(part)));
      var payload = JSON.parse(json);
      return { email: payload.email || '', name: payload.name || '' };
    } catch (e) { return {}; }
  }
  // pull the authoritative profile from /auth/me and reflect it in the UI
  function refreshUser() {
    if (!api.me || !api.isAuthed()) return;
    api.me().then(function (u) {
      if (u && u.email) {
        saveUser({ name: u.name || '', email: u.email });
        syncAuthUI();
      }
    }).catch(function () { /* keep cached value */ });
  }
  function initials(u) {
    var src = (u.name || u.email || '?').trim();
    if (u.name) {
      var parts = u.name.trim().split(/\s+/);
      return ((parts[0][0] || '') + (parts[1] ? parts[1][0] : '')).toUpperCase();
    }
    return (src[0] || '?').toUpperCase();
  }
  // deterministic accent hue from a string
  var HUES = ['cat-run', 'cat-tasting', 'cat-workshop', 'cat-music', 'cat-market'];
  function hueFor(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return HUES[h % HUES.length];
  }

  // reflect auth state in [data-auth] toggles across the page
  function syncAuthUI() {
    var authed = api.isAuthed();
    document.querySelectorAll('[data-auth="in"]').forEach(function (n) {
      n.hidden = !authed;
    });
    document.querySelectorAll('[data-auth="out"]').forEach(function (n) {
      n.hidden = authed;
    });
    if (authed) {
      var u = getUser();
      document.querySelectorAll('[data-auth-avatar]').forEach(function (n) {
        n.textContent = initials(u);
        n.classList.add(hueFor(u.email || u.name || 'x'));
        if (u.name || u.email) n.setAttribute('title', u.name || u.email);
      });
    }
    document.dispatchEvent(new CustomEvent('sd:auth-changed', { detail: { authed: authed } }));
  }

  function logout() {
    api.logout();
    clearUser();
    syncAuthUI();
    toast(t('toast.loggedOut'), { icon: 'check' });
  }

  // when a token refresh fails, api.js clears tokens and fires this event
  document.addEventListener('sd:auth-expired', function () {
    clearUser();
    syncAuthUI();
  });

  window.SD.auth = {
    open: open,
    close: close,
    requireAuth: requireAuth,
    syncAuthUI: syncAuthUI,
    logout: logout,
    isAuthed: function () { return api.isAuthed(); },
    getUser: getUser,
    refreshUser: refreshUser,
    initials: initials,
    hueFor: hueFor,
  };
})();
