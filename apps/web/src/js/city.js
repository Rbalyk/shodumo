/* global window, document, localStorage */
// ShoDumo — city selector: dropdown pickers, sidebar/search sync, feed dispatch
(function () {
  window.SD = window.SD || {};
  var cfg = window.SD.config || {};
  var icon = window.SD.icon || function () { return ''; };
  var esc = (window.SD.util && window.SD.util.escapeHtml) || function (s) { return s; };
  var t = window.SD.t || function (k) { return k; };
  var lang = window.SD.lang || cfg.lang || 'uk';
  // EN slug→name fallback (injected at build from src/i18n/taxonomy.en.json)
  var TX_CITIES = (window.SD.taxonomy && window.SD.taxonomy.cities) || {};

  // ported from cities.uk.json — big government-controlled cities, locative forms
  var FALLBACK = [
    { name: 'Київ', slug: 'kyiv', loc: 'Києві' },
    { name: 'Львів', slug: 'lviv', loc: 'Львові' },
    { name: 'Дніпро', slug: 'dnipro', loc: 'Дніпрі' },
    { name: 'Одеса', slug: 'odesa', loc: 'Одесі' },
    { name: 'Харків', slug: 'kharkiv', loc: 'Харкові' },
    { name: 'Запоріжжя', slug: 'zaporizhzhia', loc: 'Запоріжжі' },
    { name: 'Вінниця', slug: 'vinnytsia', loc: 'Вінниці' },
    { name: 'Полтава', slug: 'poltava', loc: 'Полтаві' },
    { name: 'Чернігів', slug: 'chernihiv', loc: 'Чернігові' },
    { name: 'Суми', slug: 'sumy', loc: 'Сумах' },
    { name: 'Черкаси', slug: 'cherkasy', loc: 'Черкасах' },
    { name: 'Хмельницький', slug: 'khmelnytskyi', loc: 'Хмельницькому' },
    { name: 'Житомир', slug: 'zhytomyr', loc: 'Житомирі' },
    { name: 'Рівне', slug: 'rivne', loc: 'Рівному' },
    { name: 'Луцьк', slug: 'lutsk', loc: 'Луцьку' },
    { name: 'Тернопіль', slug: 'ternopil', loc: 'Тернополі' },
    { name: 'Івано-Франківськ', slug: 'ivano-frankivsk', loc: 'Івано-Франківську' },
    { name: 'Ужгород', slug: 'uzhhorod', loc: 'Ужгороді' },
    { name: 'Чернівці', slug: 'chernivtsi', loc: 'Чернівцях' },
    { name: 'Кропивницький', slug: 'kropyvnytskyi', loc: 'Кропивницькому' },
    { name: 'Миколаїв', slug: 'mykolaiv', loc: 'Миколаєві' },
    { name: 'Кривий Ріг', slug: 'kryvyi-rih', loc: 'Кривому Розі' },
    { name: 'Кременчук', slug: 'kremenchuk', loc: 'Кременчуці' },
    { name: 'Херсон', slug: 'kherson', loc: 'Херсоні' },
  ];
  var EXCLUDED = ['Донецьк', 'Луганськ', 'Сімферополь', 'Севастополь', 'Маріуполь', 'Мелітополь', 'Бердянськ'];

  var bySlug = {};
  FALLBACK.forEach(function (c) { bySlug[c.slug] = c; });

  var CITY_KEY = 'sd_city';
  var list = FALLBACK.slice();      // active list (API-merged or fallback)
  var selected = null;

  function isExcluded(name) {
    return EXCLUDED.indexOf((name || '').trim()) !== -1;
  }

  function locOf(slug) {
    var c = bySlug[slug];
    return (c && c.loc) || (c && c.name) || '';
  }
  function nameOf(slug) {
    if (lang === 'en' && TX_CITIES[slug]) return TX_CITIES[slug];
    var c = bySlug[slug];
    return (c && c.name) || TX_CITIES[slug] || '';
  }

  function getSelected() {
    if (selected) return selected;
    var saved = null;
    try { saved = localStorage.getItem(CITY_KEY); } catch (e) { /* noop */ }
    selected = (saved && bySlug[saved]) ? saved : (cfg.defaultCity || 'lviv');
    if (!bySlug[selected]) selected = 'lviv';
    return selected;
  }

  function setSelected(slug) {
    if (!bySlug[slug] || slug === selected) {
      if (slug === selected) closeAll();
      return;
    }
    selected = slug;
    try { localStorage.setItem(CITY_KEY, slug); } catch (e) { /* noop */ }
    syncUI();
    closeAll();
    document.dispatchEvent(new CustomEvent('sd:city-changed', { detail: { slug: slug } }));
  }

  function syncUI() {
    var slug = getSelected();
    var name = nameOf(slug);
    var loc = locOf(slug);
    document.querySelectorAll('[data-city-name]').forEach(function (n) { n.textContent = name; });
    document.querySelectorAll('[data-city-search]').forEach(function (n) {
      n.setAttribute('placeholder', t('nav.searchCity', { loc: loc || name, city: name }));
    });
    // refresh open menus' active state
    document.querySelectorAll('[data-city-menu]').forEach(renderMenu);
  }

  function renderMenu(menu) {
    var slug = getSelected();
    menu.innerHTML = list.map(function (c) {
      var on = c.slug === slug;
      return (
        '<button type="button" class="city-select__item' + (on ? ' is-active' : '') + '" role="option"' +
        ' aria-selected="' + on + '" data-city-pick="' + esc(c.slug) + '">' +
        '<span class="city-select__pin" data-icon="pin" data-size="16"></span>' +
        '<span>' + esc(nameOf(c.slug)) + '</span>' +
        (on ? '<span class="city-select__check" data-icon="check" data-size="16"></span>' : '') +
        '</button>'
      );
    }).join('');
    // fill icon placeholders inside the freshly built menu
    menu.querySelectorAll('[data-icon]').forEach(function (el) {
      var nm = el.getAttribute('data-icon');
      var sz = parseInt(el.getAttribute('data-size'), 10) || 16;
      el.innerHTML = icon(nm, { size: sz });
    });
  }

  function closeAll() {
    document.querySelectorAll('[data-city-menu]').forEach(function (m) { m.hidden = true; });
    document.querySelectorAll('[data-city-toggle][aria-expanded="true"]').forEach(function (t) {
      t.setAttribute('aria-expanded', 'false');
    });
  }

  function wirePickers() {
    // toggle open/close on the picker button
    document.addEventListener('click', function (e) {
      var toggle = e.target.closest && e.target.closest('[data-city-toggle]');
      var pick = e.target.closest && e.target.closest('[data-city-pick]');
      if (pick) {
        e.preventDefault();
        setSelected(pick.getAttribute('data-city-pick'));
        return;
      }
      if (toggle) {
        e.preventDefault();
        var wrap = toggle.closest('[data-city-select]');
        var menu = wrap && wrap.querySelector('[data-city-menu]');
        if (!menu) { // sidebar toggle without its own menu → open the first header menu
          var anyMenu = document.querySelector('[data-city-menu]');
          if (anyMenu) {
            var willOpen = anyMenu.hidden;
            closeAll();
            if (willOpen) { renderMenu(anyMenu); anyMenu.hidden = false; }
          }
          return;
        }
        var open = menu.hidden;
        closeAll();
        if (open) {
          renderMenu(menu);
          menu.hidden = false;
          toggle.setAttribute('aria-expanded', 'true');
        }
        return;
      }
      // outside click closes
      if (!e.target.closest('[data-city-menu]')) closeAll();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll();
    });
  }

  function init() {
    getSelected();
    syncUI();
    wirePickers();

    // union real cities from the API with the fallback set (keeps locative
    // forms, drops occupied) — the picker always offers the major cities even
    // when the API has only seeded a few
    var api = window.SD.api;
    if (api && api.getCities) {
      api.getCities().then(function (cities) {
        if (!Array.isArray(cities) || !cities.length) return;
        var added = false;
        cities.forEach(function (c) {
          if (!c || !c.slug || isExcluded(c.name)) return;
          var known = bySlug[c.slug];
          var entry = { name: c.name || (known && known.name) || c.slug, slug: c.slug, loc: (known && known.loc) || c.name };
          bySlug[c.slug] = entry;
          if (!known) { list.push(entry); added = true; }
        });
        if (added) syncUI();
      }).catch(function () { /* keep fallback list */ });
    }
  }

  window.SD.city = {
    init: init,
    getSelected: getSelected,
    setSelected: setSelected,
    nameOf: nameOf,
    locOf: locOf,
    all: function () { return list.slice(); },
  };
})();
