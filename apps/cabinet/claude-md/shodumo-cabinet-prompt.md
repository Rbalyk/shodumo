# ShoDumo Cabinet & Admin — промпт для Claude Code

> Запусти Claude Code в порожній папці `shodumo-cabinet` і встав це.

---

Побудуй **єдиний Angular-застосунок** для ShoDumo (платформа-афіша міні-івентів), що обслуговує дві ролі через рольовий доступ: **кабінет організатора** і **адмін-панель**. Це Фаза 2 — публічний сайт (vanilla/Gulp) і REST API (NestJS) уже готові. Цей застосунок споживає той самий API (base URL з `environment`). Фокус на чистій структурі та робочих CRUD-флоу, не на повноті фіч.

## Стек
- **Angular** (остання LTS), standalone components, TypeScript strict
- **Angular Router** з lazy-loaded feature-модулями + `canActivate` guards за роллю
- **HttpClient** + інтерсептори (auth bearer, авто-refresh при 401, обробка помилок)
- **Reactive Forms** для всіх форм + валідація
- State: сервіси + RxJS (`BehaviorSubject`/signals) — без NgRx для MVP
- UI: Angular Material **або** легка власна SCSS-система (на твій вибір, але консистентно)
- Карта для вибору точки події: Google Maps (`@angular/google-maps`), ключ з `environment`
- i18n: API віддає контент за `?lang=uk|en`; UI — `@angular/localize` або простий словниковий сервіс (uk дефолт, en додатково)

## Авторизація і ролі
- Логін через `POST /auth/login` → зберегти access/refresh токени; авто-`POST /auth/refresh` при 401
- Декодувати роль із JWT (`ORGANIZER` / `ADMIN`); `ATTENDEE` не має доступу до кабінету
- `RoleGuard`: організатор → `/cabinet/**`, адмін → `/admin/**`; невідповідна роль → редірект/403
- Гард на весь застосунок: неавторизований → екран логіну

## Структура
```
src/app/
  core/        auth service, interceptors, guards, api clients, models
  shared/      ui-компоненти (таблиця, бейдж статусу, тостер, confirm-діалог, empty/loading стани)
  auth/        login
  cabinet/     (роль ORGANIZER)
    dashboard/        B1
    events-list/      B2
    event-form/       B3 (create + edit, один компонент)
    organizer-profile/B4
  admin/       (роль ADMIN)
    moderation/       D1
    taxonomy/         D2 (міста + категорії)
  i18n/
environments/
```

## Екрани

### Кабінет організатора (роль ORGANIZER)
**B1. Дашборд** — зведення (всього подій, опубліковано, на модерації, сума «піду»); список найближчих подій; кнопка «+ Створити подію». `GET /me/events`.

**B2. Список моїх подій** — таблиця/картки з фільтром за статусом (DRAFT / PENDING / PUBLISHED / ARCHIVED); по кожній: бейдж статусу, дата, зацікавлені. Дії: редагувати → B3, видалити (confirm), відкрити публічну сторінку. `GET /me/events`, `DELETE /events/:id`.

**B3. Створення / редагування події** — один компонент на create і edit. Секції форми:
- Основне: назва, категорія (з `GET /categories`), опис; **+ EN-поля** `titleEn`, `descriptionEn` (optional, бо API так локалізує)
- Коли: дата/час
- Де: адреса + вибір точки на карті → `lat`/`lng`
- Ціна: безкоштовно / платно (`isPaid`, `price` nullable)
- Медіа: завантаження cover + галереї через `POST /media` (drag-n-drop)
- Прев'ю публічного вигляду
- Дії: зберегти чернетку (DRAFT); відправити на публікацію (→ status стає PENDING, модерація). `POST /events`, `PATCH /events/:id`, `POST /media`.

**B4. Профіль організатора** — ім'я, bio (+ `bioEn` optional), avatar, посилання (Json). `PATCH /me/organizer`, `POST /media`. Прев'ю публічного профілю.

### Адмін-панель (роль ADMIN)
**D1. Черга модерації** — список подій `status=PENDING`; прев'ю події + дані організатора. Дії: схвалити (→ PUBLISHED), відхилити з причиною. `GET /admin/events?status=pending`, `PATCH /admin/events/:id/moderate`.

**D2. Керування містами та категоріями** — дві таблиці (name, slug, к-сть подій, + EN-назва `nameEn`). CRUD + деактивація без видалення. `CRUD /admin/cities`, `/admin/categories`.

## Інтеграція з API (нагадування)
- Auth: `POST /auth/login`, `POST /auth/refresh`
- Організатор: `GET /me/events`, `POST /events`, `PATCH /events/:id`, `DELETE /events/:id`, `PATCH /me/organizer`, `POST /media`
- Довідники: `GET /cities`, `GET /categories`
- Адмін: `GET /admin/events?status=pending`, `PATCH /admin/events/:id/moderate`, CRUD `/admin/cities`, `/admin/categories`
- Контент-ендпоінти приймають `?lang=uk|en`; create/update приймають `*_en` поля як optional. Ключ `*_en` у GET-відповіді не повертається (приходить уже зрезолвлене поле) — для редагування EN тягни значення з форми, а не з GET-відповіді, або додай адмінський режим, що віддає raw (узгодь з API за потреби).

## Якість / UX
- Наскрізні стани: skeleton-завантаження, порожньо, помилка
- Адаптив (десктоп-first для кабінету, але юзабельно на планшеті)
- Уніфікований обробник помилок API → тостери
- Тостери підтверджень («Подію відправлено на модерацію», «Збережено»)
- Confirm-діалог на деструктивні дії (видалення, відхилення)
- Доступність: семантика, фокус-стани, aria для діалогів
- README: як підняти (`npm i`, `ng serve`), налаштування `environment` (API URL + Google Maps key), тестові акаунти

Почни з: scaffold + core (auth, interceptors, guards, моделі) → login → cabinet shell з роутингом і гардом → B2 список + B3 форма (центральний флоу) → B1 дашборд → B4 профіль → admin shell → D1 модерація → D2 таксономія. Після кожного блоку — `ng build`, щоб ловити помилки рано.
