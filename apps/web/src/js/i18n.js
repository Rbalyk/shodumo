/* global window, document */
// ShoDumo — client i18n. The build injects the active dictionary + lang inline
// in <head> (window.SD.lang / window.SD.langBase / window.SD.i18nDict) so t()
// is synchronous and matches the server-rendered language with no flash.
(function () {
  window.SD = window.SD || {};

  // current language: inline head script → <html lang> → 'uk'
  var lang = window.SD.lang;
  if (lang !== 'uk' && lang !== 'en') {
    var htmlLang = (document.documentElement.getAttribute('lang') || '').slice(0, 2);
    lang = htmlLang === 'en' ? 'en' : 'uk';
  }
  // path prefix for the active language ('' for uk, '/en' for en)
  var langBase = window.SD.langBase;
  if (typeof langBase !== 'string') langBase = lang === 'en' ? '/en' : '';

  var dict = window.SD.i18nDict || {};

  function t(key, vars) {
    var str = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key;
    if (vars) {
      str = str.replace(/\{(\w+)\}/g, function (m, name) {
        return vars[name] != null ? vars[name] : '';
      });
    }
    return str;
  }

  // prefix an internal absolute path with the language base; pass through
  // external URLs and anchors untouched
  function link(path) {
    if (!path) return langBase + '/';
    if (/^(https?:)?\/\//.test(path) || path.charAt(0) === '#') return path;
    if (path.charAt(0) !== '/') path = '/' + path;
    return langBase + path;
  }

  window.SD.lang = lang;
  window.SD.langBase = langBase;
  window.SD.t = t;
  window.SD.i18n = { lang: lang, langBase: langBase, t: t, link: link, dict: dict };
})();
