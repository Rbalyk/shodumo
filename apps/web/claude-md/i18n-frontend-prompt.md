# ShoDumo Web — i18n (англійська) для Claude Code

> Запусти Claude Code в корені `shodumo-web`. Стек: vanilla JS + SCSS + Gulp. Мета: повна англійська версія з окремими /en/ URL та hreflang (для SEO). Бекенд уже віддає локалізований контент через `?lang=uk|en` (див. `../shodumo-api/i18n-backend-prompt.md`).

Готові файли-помічники вже лежать:
- `src/i18n/uk.json`, `src/i18n/en.json` — словники інтерфейсу (ключі однакові). Доповни, якщо знайдеш рядки, яких бракує.
- `src/i18n/taxonomy.en.json` — англ. назви міст/категорій (фолбек).
- `cities.uk.json` — міста + відмінки (uk hero).

## Стратегія
Дві мовні гілки статики, переклад на етапі білду (найкраще для SEO):
- UK → корінь (`/`, `/event/:slug`, `/organizer/:id`, `/lviv` …)
- EN → префікс `/en/` (`/en/`, `/en/event/:slug`, `/en/organizer/:id`, `/en/lviv` …)
Текст інтерфейсу підставляється у шаблони з відповідного словника під час білду (не лише на клієнті), щоб HTML кожної мови був повноцінним.

## 1. Токени перекладу в шаблонах
- У `src/pages/**/*.html` заміни захардкоджені укр. рядки на токени, напр. `@@t.auth.login`, `@@t.hero.sub`. (gulp-file-include уже використовує `@@var` — додай у контекст об'єкт `t` зі словника.)
- Плейсхолдери з підстановкою (`{city}`, `{loc}`, `{prep}`, `{n}`, `{km}`) лиши як є у словнику; статичні — резолвимо на білді, динамічні (`{n}`, `{km}`, `{city}` у стрічці) — у JS через `window.SD.t(key, vars)`.

## 2. Gulp: дві мови
- Винеси `html` і `scripts`/`prerender` у параметризовану по `lang` функцію. Для кожної з `['uk','en']`:
  - завантаж словник, передай як `t` у контекст `fileInclude`;
  - додай у контекст `lang`, `langBase` (`''` для uk, `'/en'` для en), `htmlLang` (`uk`/`en`);
  - виведи UK у `dist/`, EN у `dist/en/`.
- `<html lang="@@htmlLang">` у `head.html` (зараз хардкод `uk`).
- Інжектни в JS-бандл поточну мову на сторінці (через `__LANG__` replace або `<html lang>`), щоб клієнтський `t()` і запити до API знали мову.

## 3. hreflang + canonical (`src/pages/partials/head.html`)
Для кожної сторінки додай:
- `<link rel="alternate" hreflang="uk" href="{uk-url}">`
- `<link rel="alternate" hreflang="en" href="{site}/en{path}">`
- `<link rel="alternate" hreflang="x-default" href="{uk-url}">`
- `canonical` = URL поточної мови.
Передавай ці значення через контекст білду/prerender.

## 4. Клієнтський i18n (`src/js/i18n.js`, новий; додай у bundle ПЕРЕД home/event/...)
- Визнач поточну мову: з `<html lang>` (або `window.SD.config.lang`); fallback `uk`.
- Завантаж відповідний словник (інлайн-імпортом у білд або fetch `/(en/)?i18n.json`). Експонуй `window.SD.t(key, vars)` з підстановкою `{var}`.
- Динамічні рядки в `home.js`, `event.js`, `organizer.js`, `account.js`, `toast.js`, `city.js`, `auth.js`, `map.js` — через `t()` замість захардкоджених укр.

## 5. Мова → API
- Усі запити контенту шлють `lang` поточної мови: додай у `api.js` `request()` дефолтний query `lang` (з `window.SD.config.lang`) для GET, або параметром у `getEvents/getEvent/getOrganizer/getCities/getSaved`.

## 6. Перемикач мови (UA | EN)
- Додай у `header.html` (desktop) і мобільний хедер кнопку-перемикач. Вона веде на URL-двійник іншою мовою: toggle префікса `/en`. Зберігай вибір у `localStorage` `sd_lang` і, за бажанням, м'який редирект на префінтну мову при заході на корінь.

## 7. prerender.js (обидві мови)
- Генеруй event/organizer сторінки для UK і EN: тягни дані з `?lang=`, віддавай у `dist/` та `dist/en/`.
- Локалізуй `<title>`, meta description, OG, JSON-LD `Event` (name/description), canonical і hreflang.
- `sitemap.xml` — включити обидві мови (з hreflang `xhtml:link` alternates). `robots.txt` лишити.

## 8. Hero відмінки
- UK: «у/в {loc}» з `cities.uk.json` (як уже зроблено). EN: просто «in {City}» (англ. назва з taxonomy/`?lang=en`).

Перевірка: `npx gulp build` чисто; існують `dist/index.html` (uk) і `dist/en/index.html` (en); у кожній — правильні `<html lang>`, hreflang, canonical; перемикач водить між мовами; стрічка/подія тягнуться `?lang=`; англ. UI без укр. залишків.
