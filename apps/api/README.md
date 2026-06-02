# ShoDumo API

API-first бекенд для **ShoDumo** — платформи-афіші міні-івентів. Один REST API
обслуговує публічний сайт, кабінет організатора/адмінку та майбутню мобілку.
Це **Фаза 1 (MVP)** — чиста модульна структура NestJS, без зайвих фіч.

## Стек

- **NestJS** + TypeScript (strict)
- **PostgreSQL** + **Prisma** (ORM + міграції)
- **Redis** (ioredis) — кеш публічної стрічки
- **JWT** auth (access + refresh), **bcrypt** для паролів
- **class-validator** / class-transformer — валідація DTO
- **@nestjs/throttler** — rate-limiting
- **Swagger** на `/docs`
- Docker Compose для Postgres + Redis

## Структура

```
src/
  auth/         register / login / refresh, JWT + refresh strategy, guards
  users/        users + ролі (ATTENDEE / ORGANIZER / ADMIN)
  organizers/   профіль організатора
  events/       CRUD подій + публічна стрічка з фільтрами (Redis-кеш)
  attendance/   "піду" / "зберегти"
  cities/       довідник міст
  categories/   довідник категорій
  media/        завантаження фото (заглушка під Cloudflare R2 / S3)
  admin/        модерація подій, керування містами / категоріями
  common/       guards, decorators, pagination, error filter, utils
  redis/        RedisService (кеш)
  prisma/       PrismaService
prisma/         schema.prisma + seed.ts
```

## Швидкий старт

### 1. Залежності та env

```bash
npm install
cp .env.example .env   # за потреби відредагуй секрети
```

### 2. Підняти інфраструктуру (Postgres + Redis)

```bash
docker compose up -d
```

### 3. Міграція + генерація клієнта

```bash
npm run prisma:migrate    # створює БД-схему (інтерактивно назве міграцію, напр. init)
npm run prisma:generate   # генерує Prisma Client (виконується і під час migrate)
```

### 4. Seed

```bash
npm run seed
```

Створює: місто Львів, 5 категорій (Забіги, Дегустації, Воркшопи, Музика,
Маркети), тестового організатора, адміна та 6 опублікованих подій.

Тестові акаунти (пароль `Password123!`):
- `organizer@shodumo.dev` — роль ORGANIZER
- `admin@shodumo.dev` — роль ADMIN

### 5. Запуск

```bash
npm run start:dev
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`

## Ендпоінти (Фаза 1)

**Публічні**
- `GET /events` — стрічка з фільтрами `city`, `category`, `date`, `isPaid`,
  `near=lat,lng` (+ `radiusKm`), пагінація `page`/`limit` (кеш у Redis)
- `GET /events/:slug` — деталі події
- `GET /organizers/:id`
- `GET /cities`, `GET /categories`

**Auth**
- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`

**Організатор** (JWT, роль ORGANIZER)
- `POST /events`, `PATCH /events/:id`, `DELETE /events/:id`
- `GET /me/events`, `PATCH /me/organizer`
- `POST /media` (заглушка завантаження)

**Користувач** (JWT)
- `POST /events/:id/attend` (`{ "type": "GOING" | "SAVED" }`)
- `DELETE /events/:id/attend` (`{ "type": "GOING" | "SAVED" }`)
- `GET /me/saved`

**Адмін** (JWT, роль ADMIN)
- `GET /admin/events?status=PENDING`, `PATCH /admin/events/:id/moderate`
- CRUD `/admin/cities`, `/admin/categories`

## Домовленості

- Нові події створюються зі статусом **PENDING** — публікуються лише після
  модерації адміном (`PATCH /admin/events/:id/moderate`).
- Рольовий доступ — глобальні `JwtAuthGuard` + `RolesGuard`; публічні роути
  позначені `@Public()`, рольові — `@Roles(...)`.
- Уніфікована пагінація: `{ data, meta: { total, page, limit, pageCount } }`.
- Уніфікований формат помилок: `{ statusCode, error, message, path, timestamp }`.
- Кеш стрічки інвалідовується при create / update / delete / moderate події.
- Перший `PATCH /me/organizer` створює профіль організатора (потрібен для
  створення подій).

## Корисні скрипти

```bash
npm run build          # nest build
npm run start:dev      # watch-режим
npm run prisma:studio  # GUI до БД
npm run lint
```
