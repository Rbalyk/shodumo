/* global window, document, fetch */
// ShoDumo — thin REST client over cookie auth (httpOnly session + CSRF double-submit)
(function () {
  window.SD = window.SD || {};
  var cfg = window.SD.config || {};
  var BASE = (cfg.apiBaseUrl || '').replace(/\/+$/, '');

  var CSRF_COOKIE = 'csrf';
  var MUTATING = { POST: 1, PUT: 1, PATCH: 1, DELETE: 1 };
  // auth endpoints are CSRF-exempt server-side and need no prior session
  var AUTH_EXEMPT = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

  function readCookie(name) {
    if (typeof document === 'undefined' || !document.cookie) return null;
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  // The session tokens are httpOnly (unreadable); the readable `csrf` cookie is
  // set alongside them on login/confirm and cleared on logout, so its presence
  // is a reliable client-side hint for "are we logged in".
  function isAuthed() { return !!readCookie(CSRF_COOKIE); }

  function notifyExpired() {
    try {
      if (typeof document !== 'undefined' && document.dispatchEvent) {
        document.dispatchEvent(new CustomEvent('sd:auth-expired'));
      }
    } catch (e) { /* noop */ }
  }

  function buildQuery(params) {
    if (!params) return '';
    var parts = [];
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v === undefined || v === null || v === '') return;
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });
    return parts.length ? '?' + parts.join('&') : '';
  }

  // append the active UI language to content GET requests (?lang=uk|en)
  function withLang(path) {
    var lang = (window.SD.config && window.SD.config.lang) || 'uk';
    var sep = path.indexOf('?') === -1 ? '?' : '&';
    return path + sep + 'lang=' + encodeURIComponent(lang);
  }

  function isAuthExempt(path) {
    for (var i = 0; i < AUTH_EXEMPT.length; i++) {
      if (path.indexOf(AUTH_EXEMPT[i]) === 0) return true;
    }
    return false;
  }

  // low-level request: cookies travel via credentials:'include'; mutations echo
  // the csrf cookie as a header; one transparent refresh-retry on 401
  function request(method, path, body, opts) {
    opts = opts || {};
    var url = BASE + (method === 'GET' ? withLang(path) : path);
    var headers = { Accept: 'application/json' };
    if (body !== undefined && body !== null) headers['Content-Type'] = 'application/json';
    if (MUTATING[method] && !isAuthExempt(path)) {
      var csrf = readCookie(CSRF_COOKIE);
      if (csrf) headers['X-CSRF-Token'] = csrf;
    }

    var init = { method: method, headers: headers, credentials: 'include' };
    if (body !== undefined && body !== null) init.body = JSON.stringify(body);

    return fetch(url, init).then(function (res) {
      if (res.status === 401 && !opts._retried && !opts.noAuth && isAuthed()) {
        return doRefresh().then(function (ok) {
          if (!ok) { notifyExpired(); throw httpError(res.status, 'Unauthorized'); }
          var retryOpts = Object.assign({}, opts, { _retried: true });
          return request(method, path, body, retryOpts);
        });
      }
      return parse(res);
    });
  }

  function parse(res) {
    var ct = res.headers.get('content-type') || '';
    var isJson = ct.indexOf('application/json') !== -1;
    if (res.status === 204) return null;
    return (isJson ? res.json() : res.text()).then(function (data) {
      if (!res.ok) {
        var msg = (data && data.message) || res.statusText || 'Request failed';
        if (Array.isArray(msg)) msg = msg.join(', ');
        throw httpError(res.status, msg, data);
      }
      return data;
    });
  }

  function httpError(status, message, data) {
    var err = new Error(message);
    err.status = status;
    err.data = data;
    return err;
  }

  var _refreshing = null;
  function doRefresh() {
    if (_refreshing) return _refreshing;
    _refreshing = fetch(BASE + '/auth/refresh', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      credentials: 'include',
    })
      .then(function (res) { return res.ok; })
      .catch(function () { return false; })
      .then(function (ok) { _refreshing = null; return ok; });
    return _refreshing;
  }

  var api = {
    // ---- session ----
    isAuthed: isAuthed,

    // ---- events / feed ----
    getEvents: function (params) {
      return request('GET', '/events' + buildQuery(params), null, { noAuth: !isAuthed() });
    },
    getEvent: function (slug) {
      return request('GET', '/events/' + encodeURIComponent(slug), null, { noAuth: !isAuthed() });
    },
    // returns a plain Event[] (not paginated)
    getSaved: function () {
      return request('GET', '/me/saved');
    },

    // ---- taxonomy ----
    getCities: function () { return request('GET', '/cities', null, { noAuth: true }); },
    getCategories: function () { return request('GET', '/categories', null, { noAuth: true }); },

    // ---- organizers ----
    // returns { id, name, bio, avatar, links, events: [...] }
    getOrganizer: function (id) {
      return request('GET', '/organizers/' + encodeURIComponent(id), null, { noAuth: true });
    },

    // ---- auth ----
    // no User is created here: the API saves a pending registration and emails a
    // confirmation link. Resolves with the 202 body { message }.
    register: function (payload) {
      return request('POST', '/auth/register', payload, { noAuth: true });
    },
    // sets the session cookies server-side; resolves with the profile
    login: function (payload) {
      return request('POST', '/auth/login', payload, { noAuth: true });
    },
    refresh: doRefresh,
    me: function () { return request('GET', '/auth/me'); },
    logout: function () {
      return request('POST', '/auth/logout', {}, { noAuth: true }).catch(function () { /* noop */ });
    },

    // ---- attendance ----
    attend: function (eventId, type) {
      return request('POST', '/events/' + encodeURIComponent(eventId) + '/attend', { type: type || 'GOING' });
    },
    unattend: function (eventId, type) {
      return request('DELETE', '/events/' + encodeURIComponent(eventId) + '/attend', { type: type || 'GOING' });
    },
  };

  window.SD.api = api;
})();
