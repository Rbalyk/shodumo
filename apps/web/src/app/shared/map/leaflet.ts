import type * as Leaflet from 'leaflet';

/** Default map centre (Lviv) when no bounds are available. */
export const LVIV: [number, number] = [49.8419, 24.0315];
export const TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const PIN_SVG =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/>' +
  '<circle cx="12" cy="10" r="2.5"/></svg>';

/** Lazy-load the Leaflet runtime (browser only). */
export async function loadLeaflet(): Promise<typeof Leaflet> {
  const mod = await import('leaflet');
  return ((mod as unknown as { default?: typeof Leaflet }).default ?? mod) as typeof Leaflet;
}

/** Teardrop accent pin used for every marker. */
export function accentIcon(L: typeof Leaflet, hue: string): Leaflet.DivIcon {
  const html = `<span class="sd-pin ${hue || 'cat-music'}" style="background:#7c3aed">${PIN_SVG}</span>`;
  return L.divIcon({
    className: 'sd-marker',
    html,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
    popupAnchor: [0, -26],
  });
}
