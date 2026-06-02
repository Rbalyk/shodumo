# ShoDumo — Multi-language (i18n) context

Реалізовано повну двомовність: **українська (uk)** як основна та **англійська (en)**.
Контент локалізується на бекенді (`?lang=`), а UI/SEO — на фронтенді (дві статичні
гілки: `uk → /`, `en → /en/`) з `hreflang` для пошуковиків.

- API: `http://localhost:3000`
- Web (dev): `http://localhost:3001` (uk), `http://localhost:3001/en/` (en)

---

## Backend (`shodumo-api`)

### Підхід
EN-варіанти зберігаються як **nullable колонки `*_en`** у тих самих таблицях.
Публічні GET-ендпоінти приймають `?lang=uk|en` (дефолт `uk`) і повертають **уже
зрезолвлені** поля (EN-значення, з відкатом на UK, якщо EN порожнє). Ключ `*_en`
у відповідь **не потрапляє**. Автоперекладу немає — EN заповнює організатор вручну.

### Зміни в схемі (`prisma/schema.prisma`)
| Модель | Додані поля |
|--------|-------------|
| `Organizer` | `bioEn String?` |
| `City` | `nameEn String?` |
| `Category` | `nameEn String?` |
| `Event` | `titleEn String?`, `descriptionEn String?` |

Міграція: `prisma/migrations/20260602114444_add_i18n_fields/` (застосована).

### Локалізаційний хелпер (`src/common/i18n/`)
- **`localize.ts`** — `Lang = 'uk' | 'en'`; функції `localizeCity / localizeCategory /
  localizeOrganizer / localizeEvent / localizeEvents`. Кожна резолвить `*_en` на місці
  (EN з відкатом на UK) і видаляє `*_en` з payload. `localizeEvent` рекурсивно проходить
  по вкладених `city/category/organizer`; `localizeOrganizer` — по `events[]`.
- **`lang-query.dto.ts`** — `LangQueryDto { @IsOptional() @IsIn(['uk','en']) lang: Lang = 'uk' }`
  з `@ApiPropertyOptional` (Swagger).

### Зачеплені модулі
| Модуль | Зміни |
|--------|-------|
| `events` | `feed()` → `localizeEvents(data, filter.lang)`; `findBySlug(slug, lang)` → `localizeEvent`; `EventFilterDto` отримав `lang`; `create/update` персистять `titleEn/descriptionEn`. Контролер: `@Query() LangQueryDto`. |
| `organizers` | `findPublic(id, lang)` → `localizeOrganizer`; upsert персистить `bioEn`. Контролер: `@Query()`. |
| `cities` | `findAll(lang)` → map `localizeCity`; create/update персистять `nameEn`. |
| `categories` | те саме, що cities (`nameEn`). |
| `attendance` | `listSaved(userId, lang)` → `localizeEvents`. |

> DTO whitelist валідація вмикає `*_en` поля як **optional** у create/update,
> інакше ValidationPipe відхилив би їх (400).

### Сид (`prisma/seed.ts`)
- Місто Львів: `nameEn = 'Lviv'`.
- Категорії як `[uk, en]`: Забіги/Runs, Дегустації/Tastings, Воркшопи/Workshops,
  Музика/Music, Маркети/Markets.
- Організатор: `bioEn`.
- Кожна подія: `titleEn` + `descriptionEn`.

### Перевірено (curl)
- `/cities?lang=en` → `"Lviv"`; `/cities` → `"Львів"`
- `/events?lang=en` → англійські заголовки + категорії `Runs/Tastings`, без ключа `titleEn`
- `/categories?lang=en` → англійські назви
- `npx tsc --noEmit` — чисто; `npm run build` — чисто; сид відпрацював.

---

## Frontend (`shodumo-web`)

### Підхід
Один вихідний код → **дві статичні гілки** збираються gulp-ом:
`uk → dist/`, `en → dist/en/`. Один спільний JS-бандл; активна мова + словник
інлайняться в `<head>` (`window.SD.lang / langBase / i18nDict`) — синхронно, без миготіння.
Українські рядки в шаблонах замінені на `@@t.*` токени, що резолвляться на етапі білда.

### Словники (`src/i18n/`)
- **`uk.json` / `en.json`** — плоскі dotted-ключі (`meta.*`, `nav.*`, `auth.*`, `hero.*`,
  `filter.*`, `feed.*`, `event.*`, `organizer.*`, `about.*`, `modal.*`, `toast.*`,
  `tab.*`, `footer.*`, `saved.*`, `profile.*`, `city.lviv`, …).
- **`taxonomy.en.json`** — slug→EN назви міст/категорій. **Єдине джерело** англійських
  назв міст: використовується і бекендовим сидом (`nameEn`), і фронтендом як fallback
  (інжектиться в `window.SD.taxonomy` для en-гілки).

### Збірка (`gulpfile.js`)
- `LANGS = [{code:'uk', base:'', out:'dist'}, {code:'en', base:'/en', out:'dist/en'}]`.
- `loadDict(lang)`, `loadTaxonomy('en')`.
- `htmlFor(langCfg)` — фабрика таски: `fileInclude` (context: `langBase`, `htmlLang`,
  `ogLocale`), потім `replace(T_TOKEN, …)` резолвить `@@t.*`, потім інжект
  `<!--I18N_DATA-->` (lang + langBase + taxonomy[en] + dict), env-replace, htmlmin → `out`.
- `T_TOKEN = /@@t\.([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)/g`.
- `bundle` містить `src/js/i18n.js` (другим, одразу після `config.js`).

### Клієнтський i18n (`src/js/i18n.js`)
- `window.SD.t(key, vars)` — підстановка `{var}`.
- `window.SD.i18n.link(path)` — префіксує внутрішні шляхи `langBase` (зовнішні/anchor
  пропускає).
- Експортує `window.SD.lang / langBase / t / i18n`.

### Зачеплені шаблони (`src/pages/`)
- **partials**: `head.html` (canonical + hreflang `uk/en/x-default` через
  `@@langBase@@path`, `@@htmlLang`, `@@ogLocale`, плейсхолдер `<!--I18N_DATA-->`),
  `header.html` (+ перемикач мови `[data-lang-toggle]`), `footer.html`, `tabbar.html`.
- **сторінки**: `index / map / about / saved / profile` — внутрішні лінки з `@@langBase`,
  `<head>` тепер передає `@@t.meta.*` title/desc + `path` (замість старого `canonical`).

### Зачеплені JS-модулі
| Файл | Зміни |
|------|-------|
| `config.js` | обчислює `lang` з `window.SD.lang`/`<html lang>`; додає `langBase` у config. |
| `api.js` | `withLang(path)` додає `?lang=` до всіх GET-запитів контенту. |
| `home.js` | `t()` для empty/error/count/"All events"; лінки карток з `langBase`. |
| `event.js` | лейбли attend, тости, share через `t()`. |
| `organizer.js` | hero-лейбли, посилання, empty-стан, `document.title`. |
| `account.js` | sign-in промпти, saved empty, профіль; лінки з `langBase`. |
| `toast.js` | `formatPrice` (Free/Paid/UAH), fallback-лейбл; локаль дат `uk-UA` / `en-GB`. |
| `city.js` | hero-фраза локаль-залежна (uk локатив «у/в {loc}», en «in {city}»); назви міст з `window.SD.taxonomy` для en. |
| `map.js` | popup-лінк "Details" + `langBase`. |
| `icons.js` | fallback-лейбл категорії через `t('card.notFound')`. |
| `auth.js` | повністю локалізована модалка логіну/реєстрації + помилки/тости. |
| `main.js` | хендлер `[data-lang-toggle]`: мапить поточний шлях на двійник іншої мови, зберігає `sd_lang`. |

### SEO pre-render (`scripts/prerender.js`)
- Цикл по обох мовах: фетч `?lang=`, генерація `event/:slug/` та `organizer/:id/`
  у `dist/` (uk) і `dist/en/` (en).
- Локалізовані title/desc/OG/JSON-LD `Event`/canonical; дати по локалі.
- `sitemap.xml` з `xhtml:link` `hreflang`-альтернативами (uk/en/x-default) для кожного URL.
- robots.txt / favicon.svg без змін.

### Перевірено (`npx gulp build` — чисто)
- `dist/index.html` → `lang="uk"`, canonical `/`, укр. UI.
- `dist/en/index.html` → `lang="en"`, canonical `/en/`, повний англ. UI, перемикач «УКР».
- EN event-сторінка: англ. заголовок/лейбли, дата «8 June»; UK — «8 червня».
- `window.SD.taxonomy` інжектиться лише на en-гілці.
- **0** нерезолвлених `@@`-токенів; **0** українських UI-рядків у en-гілці.

---

## Локальний запуск
```bash
# API
cd shodumo-api && npm run start:dev        # :3000

# Web (потрібен запущений API для prerender контенту)
cd shodumo-web && npx gulp                  # build + dev-server :3001
# або разовий білд:
cd shodumo-web && npx gulp build
```

## Як додати новий перекладний рядок
1. Додай ключ у **обидва** `src/i18n/uk.json` та `src/i18n/en.json`.
2. У HTML — `@@t.твій.ключ`; у JS — `window.SD.t('твій.ключ', { vars })`.
3. Перебілди (`npx gulp build`).

## Як додати нову локалізовану модель-поле (BE)
1. Додай `*_en String?` у `schema.prisma` → `npx prisma migrate dev -n add_x_en`.
2. Розшир відповідний `localize*` хелпер у `src/common/i18n/localize.ts`.
3. Додай `*_en` як **optional** у create/update DTO.
4. Онови сид за потреби.
