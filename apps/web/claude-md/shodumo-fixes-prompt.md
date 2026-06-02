# ShoDumo Web — промпт правок для Claude Code

> Запусти Claude Code в корені `shodumo-web` і встав це. Проєкт — vanilla JS + SCSS + Gulp (без фреймворків). Після кожного блоку: `npx gulp build` має проходити чисто.

Візуальний еталон поведінки (світла тема, хедер вхід/вихід, дропдаун міста, hero з містом) — у `design/ShoDumo Prototype (fixed).html`. Відкрий його як референс.

---

## 1. Світла тема за замовчуванням
Зараз дефолт береться з `prefers-color-scheme`, тому на темній ОС сайт відкривається темним. Треба: світла, якщо користувач сам не перемкнув.

- `src/js/main.js` → `getTheme()`: прибрати гілку `prefers-color-scheme`; якщо в `localStorage` немає `sd_theme` — повертати `'light'`.
- `src/pages/partials/head.html` → інлайн анти-флеш скрипт: так само, fallback `'light'` (не дивитись на `prefers-color-scheme`).

## 2. Hero «не працює» — БАГ із класом
Причина: у `src/scss/_animations.scss` правило показу — `.reveal.in { opacity:1 }`, а `src/js/main.js` `initReveal()` додає клас **`is-in`**. Назви не збігаються → `.reveal` (зокрема `.hero`) лишається `opacity:0` назавжди.

- Узгодити назву класу: або в CSS замінити `.reveal.in` → `.reveal.is-in` (і в reduced-motion-блоці), або в JS додавати `in` замість `is-in`. Обери одне і застосуй усюди (перевір також картки/`MutationObserver`).
- Додатково: hero — перший екран, не повинен залежати від появи у viewport. Прибери `reveal` з `.hero` в `src/pages/index.html` АБО гарантуй, що hero одразу отримує клас видимості.
- Зроби заголовок hero прив'язаним до міста: «Що думаєш робити **у {loc}** цими днями?», де `{loc}` — місцевий відмінок із `cities.uk.json`. Прийменник: `в` якщо `loc` починається з голосної (а,е,и,і,о,у,я,ю,є,ї), інакше `у`.

## 3. Хедер за станом авторизації — перевірити/доробити
Розмітка вже коректна: `data-auth="out"` (Увійти, Реєстрація) і `data-auth="in"` (Профіль, Вийти) у `src/pages/partials/header.html`, `syncAuthUI()` в `src/js/auth.js`.

- Переконайся, що `syncAuthUI()` викликається на boot (вже є) і після login/logout/refresh, і що при простроченому токені (невдалий refresh у `api.js`) UI повертається у стан «out».
- Бажано: замість загальної іконки `profile` показувати аватар-кружок з ініціалами користувача (ім'я з відповіді auth або з email).

## 4. Міста (без окупованих)
Зараз «Львів» захардкоджено: `header.html` (desktop `topbar__city` + mobile `mobile-header__city`), `index.html` (sidebar «Місто», placeholder пошуку), `home.js` (`'Львів'` fallback).

- Зроби **перемикач міста (дропдаун)** у топ-барі та мобільному хедері. Список тягнути з `GET /cities` (`api.getCities()` уже є); fallback і відмінки — з `cities.uk.json` (поклади поряд або імпортуй у білд).
- Вибране місто: зберігати в `localStorage` (`sd_city`), застосовувати у фільтрі стрічки (`home.js` `state.city` → `GET /events?city=`), оновлювати hero, sidebar, placeholder пошуку.
- Дефолтне місто — з `window.SD.config.defaultCity`.
- НЕ додавати окуповані: Донецьк, Луганськ, Сімферополь, Севастополь, Маріуполь, Мелітополь, Бердянськ (див. `excludedOccupied` у `cities.uk.json`).

## 5. Mobile
- Перевір мобільний хедер і таб-бар (`src/pages/partials/tabbar.html`): дропдаун міста працює і на мобільному; таб-бар (Стрічка/Карта/Збережені/Профіль) веде на коректні маршрути; нічого не обрізається на 390px.

---

Файли-помічники в корені: `cities.uk.json` (міста + відмінки + список окупованих для виключення), `design/ShoDumo Prototype (fixed).html` (еталон). Після правок онови README за потреби.
