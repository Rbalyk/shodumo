/* global window, document */
// ShoDumo — auth modal (login / register tabs) + session helpers.
// Session lives in httpOnly cookies; the profile comes from GET /auth/me.
(function () {
  window.SD = window.SD || {};
  var api = window.SD.api;
  var cfg = window.SD.config || {};
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
      '<div class="dialog">' +
      '  <div class="head">' +
      '    <div>' +
      '      <div class="logo"><span class="text">Shodumo</span><span class="dot" aria-hidden="true"></span></div>' +
      '      <h2 class="title" data-title>' + t('modal.login.title') + '</h2>' +
      '      <p class="hint" data-hint>' + t('modal.login.hint') + '</p>' +
      '    </div>' +
      '    <button class="close" type="button" aria-label="' + t('modal.close') + '" data-close>' + icon('close', { size: 20 }) + '</button>' +
      '  </div>' +
      '  <div class="tabs" role="tablist" data-tabs>' +
      '    <button type="button" data-tab="login" class="is-active">' + t('auth.login') + '</button>' +
      '    <button type="button" data-tab="register">' + t('auth.register') + '</button>' +
      '  </div>' +
      '  <form data-form novalidate>' +
      '    <fieldset class="roles" data-field-role hidden>' +
      '      <span class="label">' + t('modal.role') + '</span>' +
      '      <label class="role-opt">' +
      '        <input type="radio" name="role" value="attendee" checked>' +
      '        <span class="body"><span class="title">' + t('modal.role.attendee') + '</span>' +
      '        <span class="hint">' + t('modal.role.attendeeHint') + '</span></span>' +
      '      </label>' +
      '      <label class="role-opt">' +
      '        <input type="radio" name="role" value="organizer">' +
      '        <span class="body"><span class="title">' + t('modal.role.organizer') + '</span>' +
      '        <span class="hint">' + t('modal.role.organizerHint') + '</span></span>' +
      '      </label>' +
      '    </fieldset>' +
      '    <label class="field" data-field-name hidden>' +
      '      <span class="label">' + t('modal.name') + '</span>' +
      '      <span class="wrap"><input type="text" name="name" autocomplete="name" placeholder="' + t('modal.namePlaceholder') + '"></span>' +
      '    </label>' +
      '    <label class="field">' +
      '      <span class="label">' + t('modal.email') + '</span>' +
      '      <span class="wrap"><input type="email" name="email" autocomplete="email" placeholder="you@email.com" required></span>' +
      '    </label>' +
      '    <label class="field">' +
      '      <span class="label">' + t('modal.password') + '</span>' +
      '      <span class="wrap"><input type="password" name="password" autocomplete="current-password" placeholder="••••••••" required minlength="6"></span>' +
      '    </label>' +
      '    <div class="forgot" data-forgot><button type="button">' + t('modal.forgot') + '</button></div>' +
      '    <p class="form-error" data-error></p>' +
      '    <button type="submit" class="submit" data-submit>' + t('modal.submit.login') + '</button>' +
      '  </form>' +
      '  <div class="sent" data-sent hidden>' +
      '    <div class="icon">' + icon('mail', { size: 32 }) + '</div>' +
      '    <h3 class="title">' + t('modal.sent.title') + '</h3>' +
      '    <p class="text" data-sent-text></p>' +
      '    <p class="hint">' + t('modal.sent.hint') + '</p>' +
      '    <button type="button" class="submit" data-sent-done>' + t('modal.sent.done') + '</button>' +
      '  </div>' +
      '  <p class="legal" data-legal>' + t('modal.legal') + '</p>' +
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
    el.querySelector('[data-sent-done]').addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && el.getAttribute('aria-hidden') === 'false') close();
    });
  }

  // show the form (login/register) and hide the "email sent" panel
  function showForm() {
    var el = modalEl;
    el.querySelector('[data-form]').hidden = false;
    el.querySelector('[data-tabs]').hidden = false;
    el.querySelector('[data-legal]').hidden = false;
    el.querySelector('[data-sent]').hidden = true;
  }

  function showSent(email) {
    var el = modalEl;
    el.querySelector('[data-form]').hidden = true;
    el.querySelector('[data-tabs]').hidden = true;
    el.querySelector('[data-legal]').hidden = true;
    el.querySelector('[data-sent-text]').textContent = t('modal.sent.text').replace('{email}', email);
    el.querySelector('[data-title]').textContent = t('modal.sent.title');
    el.querySelector('[data-hint]').textContent = '';
    el.querySelector('[data-sent]').hidden = false;
  }

  function setMode(next) {
    mode = next;
    var el = modalEl;
    showForm();
    el.querySelectorAll('[data-tab]').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-tab') === next);
    });
    var isReg = next === 'register';
    el.querySelector('[data-title]').textContent = isReg ? t('modal.register.title') : t('modal.login.title');
    el.querySelector('[data-hint]').textContent = isReg ? t('modal.register.hint') : t('modal.login.hint');
    el.querySelector('[data-field-role]').hidden = !isReg;
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

    var email = form.email.value.trim();
    var password = form.password.value;
    if (!email || !password) {
      errEl.textContent = t('modal.errFields');
      return;
    }

    submit.disabled = true;
    var prevText = submit.textContent;
    submit.textContent = t('modal.submitting');

    var op;
    if (mode === 'register') {
      var roleInput = form.querySelector('input[name="role"]:checked');
      var payload = {
        email: email,
        password: password,
        role: roleInput ? roleInput.value : 'attendee',
      };
      var name = form.name.value.trim();
      if (name) payload.name = name;
      op = api.register(payload).then(function () {
        // no session yet — the user must confirm via the emailed link
        showSent(email);
      });
    } else {
      op = api.login({ email: email, password: password }).then(function (profile) {
        setProfile(profile);
        toast(t('toast.welcome'), { icon: 'check' });
        close();
        syncAuthUI();
        var cb = pending; pending = null;
        if (typeof cb === 'function') cb();
      });
    }

    op.catch(function (err) {
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

  // ---- current profile (cached for instant UI; reconciled via /auth/me) ----
  var USER_KEY = 'sd_user';
  function setProfile(p) {
    try {
      if (p) localStorage.setItem(USER_KEY, JSON.stringify(p));
      else localStorage.removeItem(USER_KEY);
    } catch (e) { /* noop */ }
  }
  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null') || {}; }
    catch (e) { return {}; }
  }
  // pull the authoritative profile from /auth/me and reflect it in the UI
  function refreshUser() {
    if (!api.me || !api.isAuthed()) { setProfile(null); syncAuthUI(); return; }
    api.me().then(function (u) {
      if (u && u.email) { setProfile(u); syncAuthUI(); }
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

  function createEventHref() {
    var base = (cfg.appUrl || '').replace(/\/+$/, '');
    return base + '/cabinet/dashboard';
  }

  // reflect auth state in [data-auth] toggles across the page
  function syncAuthUI() {
    var authed = api.isAuthed();
    var u = authed ? getUser() : {};
    document.querySelectorAll('[data-auth="in"]').forEach(function (n) {
      n.hidden = !authed;
    });
    document.querySelectorAll('[data-auth="out"]').forEach(function (n) {
      n.hidden = authed;
    });
    // organizer-only controls (e.g. "Create event") link into the cabinet app
    var isOrganizer = authed && u.role === 'ORGANIZER';
    document.querySelectorAll('[data-auth-organizer]').forEach(function (n) {
      n.hidden = !isOrganizer;
      if (isOrganizer && n.tagName === 'A') n.setAttribute('href', createEventHref());
    });
    if (authed) {
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
    setProfile(null);
    syncAuthUI();
    toast(t('toast.loggedOut'), { icon: 'check' });
  }

  // when a token refresh fails, api.js fires this event
  document.addEventListener('sd:auth-expired', function () {
    setProfile(null);
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
