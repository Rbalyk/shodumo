# ShoDumo — Реєстрація з ролями + email-підтвердження + SSO (промпт для Claude Code)

> Запусти Claude Code в корені monorepo `shodumo` і встав це.
> Зачіпає **всі три** застосунки: `apps/api`, `apps/web`, `apps/cabinet`.
> Це авторизаційний рефакторинг — спершу прочитай розділ «Що змінюється і чому», бо ламаємо поточну bearer/localStorage-схему.

---

## Мета (флоу очима користувача)
1. На публічному сайті (`shodumo.com`) користувач відкриває модалку **Реєстрація**.
2. Обирає **роль** (radio): **Користувач** або **Організатор**. Вводить ім'я, email, пароль.
3. Натискає «Створити акаунт» → ми **НЕ створюємо User одразу**, а зберігаємо заявку й шлемо **лист із підтвердженням** на email (через Resend).
4. Користувач тисне посилання в листі → **аж тепер створюється User** (і `Organizer`, якщо роль організатор) → йому виставляється **сесійна cookie** на `.shodumo.com` → редірект на публічний сайт уже **залогіненим**.
5. На сайті залежно від ролі з'являється кнопка **«Створити подію»** (лише для організатора).
6. Клік на «Створити подію» → перехід на `app.shodumo.com/cabinet/dashboard`. Оскільки cookie спільна для всього `.shodumo.com`, кабінет **уже автентифікований** — користувач одразу в дашборді, без повторного входу.

---

## Що змінюється і чому (важливо)
Зараз auth працює на **bearer-токенах у localStorage**. `localStorage` прив'язаний до origin, тож `shodumo.com` і `app.shodumo.com` **не бачать** токени одне одного — SSO неможливий.

Рішення: перейти на **cookie-автентифікацію на спільному батьківському домені**. API ставить `httpOnly` `Secure` cookie з `Domain=.shodumo.com`; її автоматично надсилають і сайт, і кабінет, і запити до `api.shodumo.com`. Це дає справжній автологін між піддоменами.

Наслідки, які треба зробити акуратно:
- **CORS** на API: дозволити конкретні origin (`https://shodumo.com`, `https://app.shodumo.com`) **з `credentials: true`** (не `*`).
- **Fetch/HTTP** на фронтах: усі запити до API з `credentials: 'include'` (web) та `withCredentials: true` (Angular HttpClient — через інтерсептор).
- **CSRF**: оскільки auth тепер у cookie, додати захист (double-submit CSRF-токен: невелика не-httpOnly cookie `csrf` + заголовок `X-CSRF-Token`, який бек звіряє на мутаційних запитах).
- **SameSite**: `app↔api` — same-site (спільний `shodumo.com`), тож `SameSite=Lax` достатньо й безпечніше. `Secure` обов'язково (HTTPS скрізь є).
- Прибрати збереження токенів у localStorage у кабінеті; стан логіну визначати через `GET /auth/me`.

---

## Backend (`apps/api`)

### Схема (Prisma)
- Нова модель `PendingRegistration`: `id`, `email` (unique), `passwordHash`, `name`, `role` (ATTENDEE|ORGANIZER), `token` (unique, для лінку), `expiresAt` (напр. +24h), `createdAt`.
- (Опційно) у `User` додати `emailVerifiedAt DateTime?` — для повноти; за цим флоу всі створені User вже підтверджені.
- Міграція: `npx prisma migrate dev -n add_pending_registration`.

### Ендпоінти
- `POST /auth/register` — body `{ name, email, password, role: 'attendee'|'organizer' }`.
  - Якщо email уже є серед `User` → `409`. Якщо є активна `PendingRegistration` → перезаписати/оновити токен.
  - Хешувати пароль, створити `PendingRegistration`, згенерувати `token`, **надіслати лист** через Resend із посиланням `https://shodumo.com/auth/confirm?token=...` (або на API — див. нижче).
  - Відповідь: `202 Accepted` з повідомленням «перевірте пошту». **User ще не створено.**
- `GET /auth/confirm?token=...` — підтвердження:
  - Знайти `PendingRegistration` за токеном, перевірити `expiresAt`.
  - Створити `User` (role з заявки) + якщо `organizer` → `Organizer { name }`.
  - Видалити `PendingRegistration`.
  - **Виставити auth-cookie** (`access` + `refresh`, httpOnly, Secure, Domain=`.shodumo.com`, SameSite=Lax) і `csrf`-cookie.
  - **Редірект** (302) на `https://shodumo.com/?welcome=1` (уже залогінений).
- `GET /auth/me` — за cookie повертає `{ id, name, email, role }` або `401`. Потрібен сайту й кабінету, щоб знати стан логіну та роль (httpOnly cookie з JS не читається).
- `POST /auth/login` — як раніше, але замість токенів у body **ставить cookie** (+csrf). Body-відповідь: профіль.
- `POST /auth/refresh` — читає refresh-cookie, оновлює access-cookie.
- `POST /auth/logout` — чистить cookie.

### Інтеграція Resend
- Залежність `resend` (npm). Env: `RESEND_API_KEY`, `MAIL_FROM=ShoDumo <noreply@shodumo.com>`, `WEB_BASE_URL=https://shodumo.com`, `COOKIE_DOMAIN=.shodumo.com`.
- Простий шаблон листа (uk/en за бажанням): заголовок, кнопка «Підтвердити email» → лінк, fallback-URL текстом, термін дії 24 год.
- Винести в `mail` модуль/сервіс (щоб потім легко слати й інші листи).

### Guards/ролі
- `RolesGuard` тепер читає користувача з cookie-сесії (JWT у httpOnly cookie) замість `Authorization` заголовка. Онови JWT-стратегію (passport) на витяг токена з cookie.

---

## Public site (`apps/web`)

### Модалка реєстрації (вже частково є)
- Додати **radio-перемикач ролі**: «Користувач» / «Організатор» (дефолт — Користувач).
- Поля: ім'я, email, пароль (вже є). Сабміт → `POST /auth/register` (`credentials: 'include'`).
- Після `202` — показати екран-стан «Ми надіслали лист на {email}, підтвердьте реєстрацію» (замість миттєвого входу).
- Помилки: 409 → «Цей email уже зареєстрований»; інше → тост.

### Сторінка підтвердження
- Маршрут `/auth/confirm` обробляється **бекендом** (він робить редірект після створення User). Якщо хочеш проміжну сторінку на сайті — зроби `/auth/confirm`, що показує спінер і викликає API; але простіше лишити підтвердження повністю на API з фінальним 302 на сайт.

### Стан логіну на сайті
- На завантаженні сайт викликає `GET /auth/me` (`credentials: 'include'`).
- Якщо залогінений і `role === 'ORGANIZER'` → показати в хедері кнопку **«Створити подію»** → лінк на `https://app.shodumo.com/cabinet/dashboard`.
- Якщо `ATTENDEE` → кнопки немає; працюють дії, що потребують акаунта («Піду»/«Зберегти») без повторного логіну.
- Кнопки «Вхід»/«Реєстрація» ховати, коли є сесія; показати «Вийти» (`POST /auth/logout`).
- i18n: усі нові рядки в `uk`/`en`.

---

## Cabinet (`apps/cabinet`)

- **Прибрати** збереження/читання токенів із localStorage.
- HTTP-інтерсептор: усі запити з `withCredentials: true`.
- На старті/guard — `GET /auth/me`; якщо `401` → редірект на `app.shodumo.com` логін (або на публічний сайт). Якщо `role !== ORGANIZER` для `/cabinet/**` → відмова.
- CSRF: інтерсептор додає `X-CSRF-Token` із `csrf`-cookie на мутаційні запити.
- Логін-форма в кабінеті лишається (прямий вхід), але теж через cookie.
- Завдяки спільній cookie перехід із сайту вже автентифікований — окремий код «прийняти токен» не потрібен.

---

## DNS / інфраструктура (поза кодом — зроблю в Cloudflare)
- Верифікувати домен у Resend → додати в Cloudflare DNS записи **SPF/DKIM** (і DMARC) для `shodumo.com`, інакше листи в спам.
- Env на сервері (`deploy/.env.prod`): `RESEND_API_KEY`, `MAIL_FROM`, `WEB_BASE_URL`, `COOKIE_DOMAIN=.shodumo.com`, оновити `CORS_ORIGINS`.
- Прокинути ці env у `docker-compose.prod.yml` (секція `api.environment`).

---

## Порядок реалізації
1. **API:** Prisma `PendingRegistration` + міграція → cookie-auth (JWT-cookie, login/refresh/logout/me) + CORS credentials + CSRF → register/confirm + Resend mail. Білд.
2. **Cabinet:** перевід на cookie (`withCredentials`, прибрати localStorage, `/auth/me` guard, CSRF). Білд, перевір що логін і дашборд працюють.
3. **Web:** radio роль у модалці + стан «лист надіслано» + `GET /auth/me` + role-based кнопка «Створити подію» + logout. Білд.
4. Після кожного застосунку — `npm run build`/`ng build`. Наприкінці — короткий чекліст ручного тесту флоу (реєстрація → лист → підтвердження → сайт → кнопка → кабінет).

## Безпека (не забути)
- Cookie: `httpOnly`, `Secure`, `SameSite=Lax`, `Domain=.shodumo.com`, розумний `Max-Age`.
- CORS: точні origin + `credentials: true`, **без** `*`.
- CSRF double-submit на мутаціях.
- `PendingRegistration` із терміном дії; rate-limit на `/auth/register` (захист від спаму листами) — використай наявний throttler.
- Не логувати паролі/токени.
