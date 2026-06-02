# ShoDumo Backend — промпт для Claude Code

> Запусти Claude Code в порожній папці `shodumo-api` і встав це.

---

Побудуй бекенд-каркас для ShoDumo — платформи-афіші міні-івентів. API-first: один REST API обслуговує публічний сайт, кабінет/адмінку та майбутню мобілку. Це MVP Фаза 1 — фокус на чистій структурі, не на повноті фіч.

## Стек
- **NestJS** (TypeScript), модульна структура
- **PostgreSQL** + **Prisma** (ORM + міграції)
- **Redis** для кешу стрічки/фільтрів (ioredis)
- **JWT** auth: access + refresh токени
- **bcrypt** (або argon2) для паролів
- **class-validator** / class-transformer для валідації DTO
- **@nestjs/throttler** для rate-limiting
- Docker Compose для Postgres + Redis (локальна розробка)
- `.env` через @nestjs/config

## Структура модулів
```
src/
  auth/         register, login, refresh, JWT strategy + guards
  users/        users + ролі (attendee/organizer/admin)
  organizers/   профіль організатора
  events/       CRUD подій + публічна стрічка з фільтрами
  attendance/   "піду" / "зберегти"
  cities/       довідник міст
  categories/   довідник категорій
  media/        завантаження фото (поки заглушка під Cloudflare R2 / S3)
  admin/        модерація подій, керування містами/категоріями
  common/       guards, decorators, interceptors, pagination
  prisma/       PrismaService + schema
```

## Модель даних (Prisma schema)
- `User` — id, email (unique), passwordHash, role (enum: ATTENDEE/ORGANIZER/ADMIN), createdAt
- `Organizer` — id, userId (1:1), name, bio, avatar, links (Json)
- `Event` — id, organizerId, cityId, categoryId, title, slug (unique), description, startsAt, address, lat, lng, coverImage, isPaid, price (nullable, під монетизацію), status (enum: DRAFT/PENDING/PUBLISHED/ARCHIVED), createdAt
- `City` — id, name, slug (unique)
- `Category` — id, name, slug (unique)
- `EventAttendee` — id, eventId, userId, type (enum: GOING/SAVED), unique(eventId,userId,type)
- `Media` — id, eventId, url, sortOrder

Індекси: `Event.lat,lng` (гео-запити), `Event.status`, `Event.slug`, `Event.cityId`. Seed-скрипт: кілька міст (Львів), категорії (Забіги, Дегустації, Воркшопи, Музика, Маркети), тестовий організатор + 5-6 подій.

## Ендпоінти (Фаза 1 — почни з публічних + auth)
**Публічні**
- `GET /events` — список з фільтрами: city, date, category, isPaid, near=lat,lng (+ пагінація, кеш у Redis)
- `GET /events/:slug` — деталі
- `GET /organizers/:id`
- `GET /cities`, `GET /categories`

**Auth**
- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`

**Організатор (JWT + роль ORGANIZER)**
- `POST /events`, `PATCH /events/:id`, `DELETE /events/:id`
- `GET /me/events`, `PATCH /me/organizer`
- `POST /media` (заглушка завантаження)

**Користувач (JWT)**
- `POST /events/:id/attend` (going/saved), `DELETE /events/:id/attend`
- `GET /me/saved`

**Адмін (JWT + роль ADMIN)**
- `GET /admin/events?status=pending`, `PATCH /admin/events/:id/moderate`
- CRUD `/admin/cities`, `/admin/categories`

## Вимоги до якості
- RolesGuard + @Roles() декоратор для рольового доступу
- Глобальний ValidationPipe (whitelist + transform)
- Уніфікований формат пагінації та помилок
- Swagger (@nestjs/swagger) на `/docs`
- Нові події створюються зі статусом PENDING (модерація перед публікацією)
- README: як підняти (docker compose up, prisma migrate, seed, start:dev)

Почни з: налаштування проєкту → Prisma schema + перша міграція → seed → auth-модуль → events (публічні GET) → решта. Після кожного великого блоку запускай збірку, щоб ловити помилки рано.
