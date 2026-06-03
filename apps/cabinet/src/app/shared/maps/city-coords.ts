import { LatLng } from './map-picker.component';

/**
 * Frontend-only city → coordinates lookup, keyed by the city `slug`.
 *
 * RATIONALE (§6): the API `City` model has no `lat`/`lng` columns and we must not
 * run a schema migration in this change. This dictionary lets the map recenter
 * when the City select changes, without touching `apps/api`. If/when the API
 * adds coordinates to `City`, delete this file and read them from the model.
 */
export const CITY_COORDS: Record<string, LatLng> = {
  lviv: { lat: 49.8397, lng: 24.0297 },
  kyiv: { lat: 50.4501, lng: 30.5234 },
  kharkiv: { lat: 49.9935, lng: 36.2304 },
  odesa: { lat: 46.4825, lng: 30.7233 },
  dnipro: { lat: 48.4647, lng: 35.0462 },
  'ivano-frankivsk': { lat: 48.9226, lng: 24.7111 },
  ternopil: { lat: 49.5535, lng: 25.5948 },
  uzhhorod: { lat: 48.6208, lng: 22.2879 },
  chernivtsi: { lat: 48.2921, lng: 25.9358 },
  rivne: { lat: 50.6199, lng: 26.2516 },
  lutsk: { lat: 50.7472, lng: 25.3254 },
  vinnytsia: { lat: 49.2331, lng: 28.4682 },
  zhytomyr: { lat: 50.2547, lng: 28.6587 },
  poltava: { lat: 49.5883, lng: 34.5514 },
  zaporizhzhia: { lat: 47.8388, lng: 35.1396 },
};

/** Best-effort coords for a city slug; `null` when unknown (caller keeps current center). */
export function cityCoords(slug?: string | null): LatLng | null {
  if (!slug) return null;
  return CITY_COORDS[slug.toLowerCase()] ?? null;
}
