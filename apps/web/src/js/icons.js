/* global window */
// ShoDumo — icon set + logo mark + category meta (ported from design)
(function () {
  window.SD = window.SD || {};

  var P = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    pin: '<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    chevDown: '<path d="m6 9 6 6 6-6"/>',
    chevRight: '<path d="m9 6 6 6-6 6"/>',
    back: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    heart: '<path d="M12 20.5 4.2 12.7a4.8 4.8 0 0 1 6.8-6.8l1 1 1-1a4.8 4.8 0 0 1 6.8 6.8Z"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 9h18M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
    map: '<path d="m9 4-6 2.5v13L9 17l6 2.5L21 17V4l-6 2.5Z"/><path d="M9 4v13M15 6.5v13"/>',
    users: '<path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3.2"/><path d="M22 20v-2a4 4 0 0 0-3-3.8M16 4.2A4 4 0 0 1 16 11.8"/>',
    run: '<circle cx="14.5" cy="4.5" r="2"/><path d="M11 21l1.8-4.4-3-2.4-1 4M9.8 14.2 8 9.5l4.4-1.6 2.4 2.6 2.8 1M5 11.5l2-2.2"/>',
    wine: '<path d="M8 22h8M12 16v6M7 3h10l-.6 5.2a4.4 4.4 0 0 1-8.8 0Z"/><path d="M6.5 8.5h11"/>',
    workshop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8M8 9l2.5 2L8 13M14 13h3"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    market: '<path d="M3 9h18l-1 4H4Z"/><path d="M5 13v7h14v-7M4 9l1.5-4h13L20 9"/>',
    feed: '<rect x="3" y="4" width="18" height="5" rx="1.5"/><rect x="3" y="12" width="18" height="8" rx="1.5"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4"/>',
    moon: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10Z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    near: '<path d="M12 12 4 9l16-6-6 16-2-7Z"/>',
    ticket: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z"/><path d="M15 6v2M15 16v2M15 11v2"/>',
    sparkles: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8Z"/><path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z"/>',
  };

  function icon(name, opts) {
    opts = opts || {};
    var size = opts.size || 22;
    var stroke = opts.stroke || 2;
    var fill = opts.fill || false;
    var d = P[name] || '';
    return (
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" ' +
      'fill="' + (fill ? 'currentColor' : 'none') + '" ' +
      'stroke="' + (fill ? 'none' : 'currentColor') + '" ' +
      'stroke-width="' + stroke + '" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' + d + '</svg>'
    );
  }

  // ---- category meta: map API category (slug/name) → design hue + glyph + short label ----
  var CATS = [
    { match: ['run', 'забіг', 'забіги', 'zabig'], hue: 'cat-run', glyph: 'run', label: 'Забіг' },
    { match: ['tasting', 'wine', 'дегуст'], hue: 'cat-tasting', glyph: 'wine', label: 'Дегустація' },
    { match: ['workshop', 'воркшоп', 'майстер'], hue: 'cat-workshop', glyph: 'workshop', label: 'Воркшоп' },
    { match: ['music', 'музик'], hue: 'cat-music', glyph: 'music', label: 'Музика' },
    { match: ['market', 'маркет', 'ярмар'], hue: 'cat-market', glyph: 'market', label: 'Маркет' },
  ];

  function categoryMeta(category) {
    var key = ((category && (category.slug || category.name)) || '').toLowerCase();
    for (var i = 0; i < CATS.length; i++) {
      for (var j = 0; j < CATS[i].match.length; j++) {
        if (key.indexOf(CATS[i].match[j]) !== -1) {
          return {
            hue: CATS[i].hue,
            glyph: CATS[i].glyph,
            label: (category && category.name) || CATS[i].label,
          };
        }
      }
    }
    var fallback = (window.SD.t && window.SD.t('card.notFound')) || 'Подія';
    return { hue: 'cat-music', glyph: 'sparkles', label: (category && category.name) || fallback };
  }

  window.SD.icon = icon;
  window.SD.categoryMeta = categoryMeta;
})();
