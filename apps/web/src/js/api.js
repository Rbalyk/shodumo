/* global window, fetch, localStorage */
// ShoDumo — thin REST client with token storage + auto-refresh on 401
(function () {
  window.SD = window.SD || {};
  var cfg = window.SD.config || {};
  var BASE = (cfg.apiBaseUrl || '').replace(/\/+$/, '');

  var KEY_ACCESS = 'sd_access';
  var KEY_REFRESH = 'sd_refresh';

  function getAccess() {
    try { return localStorage.getItem(KEY_ACCESS); } catch (e) { return null; }
  }
  function getRefresh() {
    try { return localStorage.getItem(KEY_REFRESH); } catch (e) { return null; }
  }
  function setTokens(access, refresh) {
    try {
      if (access) localStorage.setItem(KEY_ACCESS, access);
      if (refresh) localStorage.setItem(KEY_REFRESH, refresh);
    } catch (e) { /* storage disabled */ }
  }
  function clearTokens() {
    try {
      localStorage.removeItem(KEY_ACCESS);
      localStorage.removeItem(KEY_REFRESH);
    } catch (e) { /* noop */ }
  }
  function isAuthed() { return !!getAccess(); }

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

  // low-level request with one transparent refresh-retry on 401
  function request(method, path, body, opts) {
    opts = opts || {};
    var url = BASE + (method === 'GET' ? withLang(path) : path);
    var headers = { Accept: 'application/json' };
    if (body !== undefined && body !== null) headers['Content-Type'] = 'application/json';
    var token = getAccess();
    if (token && !opts.noAuth) headers.Authorization = 'Bearer ' + token;

    var init = { method: method, headers: headers };
    if (body !== undefined && body !== null) init.body = JSON.stringify(body);

    return fetch(url, init).then(function (res) {
      if (res.status === 401 && !opts._retried && getRefresh() && !opts.noAuth) {
        return doRefresh().then(function (ok) {
          if (!ok) { clearTokens(); notifyExpired(); throw httpError(res.status, 'Unauthorized'); }
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
    var rt = getRefresh();
    if (!rt) return Promise.resolve(false);
    _refreshing = fetch(BASE + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (data && data.accessToken) {
          setTokens(data.accessToken, data.refreshToken || rt);
          return true;
        }
        return false;
      })
      .catch(function () { return false; })
      .then(function (ok) { _refreshing = null; return ok; });
    return _refreshing;
  }

  var api = {
    // ---- tokens ----
    isAuthed: isAuthed,
    getAccess: getAccess,
    setTokens: setTokens,
    clearTokens: clearTokens,

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
    register: function (payload) {
      return request('POST', '/auth/register', payload, { noAuth: true }).then(saveAuth);
    },
    login: function (payload) {
      return request('POST', '/auth/login', payload, { noAuth: true }).then(saveAuth);
    },
    refresh: doRefresh,
    me: function () { return request('GET', '/auth/me'); },
    logout: function () { clearTokens(); return Promise.resolve(); },

    // ---- attendance ----
    attend: function (eventId, type) {
      return request('POST', '/events/' + encodeURIComponent(eventId) + '/attend', { type: type || 'GOING' });
    },
    unattend: function (eventId, type) {
      return request('DELETE', '/events/' + encodeURIComponent(eventId) + '/attend', { type: type || 'GOING' });
    },
  };

  function saveAuth(data) {
    if (data && data.accessToken) setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  window.SD.api = api;
})();
