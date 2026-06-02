/* global window, document */
// Global namespace. Build injects env via gulp-replace; the inline <head>
// script injects the active language (window.SD.lang / langBase / i18nDict).
window.SD = window.SD || {};

(function () {
  var lang = window.SD.lang;
  if (lang !== 'uk' && lang !== 'en') {
    var htmlLang = (document.documentElement.getAttribute('lang') || '').slice(0, 2);
    lang = htmlLang === 'en' ? 'en' : 'uk';
  }
  window.SD.config = {
    apiBaseUrl: '__API_BASE_URL__',
    siteUrl: '__SITE_URL__',
    appUrl: '__APP_URL__',
    defaultCity: '__DEFAULT_CITY__',
    lang: lang,
    langBase: lang === 'en' ? '/en' : '',
  };
})();
