/* global window, document, L */
// ShoDumo — Leaflet helpers (full map page + mini map on event detail)
(function () {
  window.SD = window.SD || {};
  var icon = window.SD.icon || function () { return ''; };
  var util = window.SD.util || {};
  var t = window.SD.t || function (k) { return k; };
  var langBase = window.SD.langBase || '';

  var LVIV = [49.8419, 24.0315];
  var TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  var ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  function hasLeaflet() { return typeof L !== 'undefined'; }

  function accentIcon(hue) {
    var color = '#7c3aed';
    var html =
      '<span class="sd-pin ' + (hue || 'cat-music') + '" style="background:' + color + '">' +
      icon('pin', { size: 16, fill: false }) + '</span>';
    return L.divIcon({
      className: 'sd-marker',
      html: html,
      iconSize: [30, 30],
      iconAnchor: [15, 28],
      popupAnchor: [0, -26],
    });
  }

  // full map page: render markers from feed events
  function initMapPage(el, events) {
    if (!hasLeaflet() || !el) return null;
    var map = L.map(el, { scrollWheelZoom: true }).setView(LVIV, 13);
    L.tileLayer(TILE, { attribution: ATTR, maxZoom: 19 }).addTo(map);

    var bounds = [];
    (events || []).forEach(function (raw) {
      var e = util.normalizeEvent ? util.normalizeEvent(raw) : raw;
      if (e.lat == null || e.lng == null) return;
      var marker = L.marker([e.lat, e.lng], { icon: accentIcon(e.hue) }).addTo(map);
      marker.bindPopup(popupHtml(e), { closeButton: false, minWidth: 210 });
      bounds.push([e.lat, e.lng]);
    });
    if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    return map;
  }

  function popupHtml(e) {
    var esc = util.escapeHtml || function (s) { return s; };
    return (
      '<div class="map-popup">' +
      '<div class="cover ph ' + e.hue + '">' +
      '<span class="glyph">' + icon(e.glyph, { size: 28 }) + '</span></div>' +
      '<div class="title">' + esc(e.title) + '</div>' +
      '<div class="date">' + esc(e.dateLabel) + '</div>' +
      '<a class="link" href="' + langBase + '/event/' + esc(e.slug) + '/">' + esc(t('event.more')) + ' ' + icon('chevRight', { size: 14 }) + '</a>' +
      '</div>'
    );
  }

  // mini map on event detail page (single marker, no interaction)
  function initMiniMap(el, lat, lng, hue) {
    if (!hasLeaflet() || !el || lat == null || lng == null) return null;
    var map = L.map(el, {
      scrollWheelZoom: false,
      dragging: false,
      zoomControl: false,
      doubleClickZoom: false,
      attributionControl: false,
    }).setView([lat, lng], 15);
    L.tileLayer(TILE, { attribution: ATTR, maxZoom: 19 }).addTo(map);
    L.marker([lat, lng], { icon: accentIcon(hue) }).addTo(map);
    return map;
  }

  // route controller: fetch feed events and render the full map page
  function initMapPageRoute() {
    var el = document.querySelector('.map');
    if (!el) return;
    var api = window.SD.api;
    if (!api) return;
    var city = (window.SD.city && window.SD.city.getSelected()) ||
      (window.SD.config && window.SD.config.defaultCity) || 'lviv';
    var current = null;
    function render(c) {
      api.getEvents({ city: c, limit: 100 }).then(function (res) {
        if (current && current.remove) current.remove();
        current = initMapPage(el, (res && res.data) || []);
      }).catch(function () {
        if (current && current.remove) current.remove();
        current = initMapPage(el, []);
      });
    }
    render(city);
    document.addEventListener('sd:city-changed', function (e) {
      render((e.detail && e.detail.slug) || city);
    });
  }

  window.SD.map = {
    initMapPage: initMapPage,
    initMiniMap: initMiniMap,
    LVIV: LVIV,
  };
  window.SD.initMapPageRoute = initMapPageRoute;
})();
