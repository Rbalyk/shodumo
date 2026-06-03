export const environment = {
  production: false,
  /** Base URL of the ShoDumo NestJS API (no trailing slash) — used by the browser. */
  apiBaseUrl: 'http://localhost:3000',
  /** Google Maps JS API key — used by the event location point picker (cabinet). */
  googleMapsKey: 'AIzaSyA2JZmD01r8C-6TTN5lJhg716BabQA8E0g',
  /** Canonical public site origin — for canonical/hreflang/OG URLs. */
  siteUrl: 'http://localhost:4000',
  /** Default city slug for the feed. */
  defaultCity: 'lviv',
};
