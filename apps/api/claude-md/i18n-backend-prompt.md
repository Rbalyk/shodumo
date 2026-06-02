# ShoDumo API — i18n (англійська) для Claude Code

> Запусти Claude Code в корені `shodumo-api`. Мета: додати англійську локалізацію контенту (Фаза i18n). Стек уже: NestJS + Prisma + Postgres. Після змін: `npm run build` має проходити, міграція застосовуватись.

Стратегія: зберігаємо англійські варіанти у тих самих таблицях окремими полями (`*_en`, nullable). Публічні GET-ендпоінти приймають `?lang=uk|en` (дефолт `uk`) і повертають уже **резолвнуті** поля (en із фолбеком на uk, якщо en порожнє). Так фронт лишається простим.

## 1. Prisma schema (`prisma/schema.prisma`)
Додати nullable-поля (існуючі рядки не ламаються):
- `Event`: `titleEn String?`, `descriptionEn String?`
- `Category`: `nameEn String?`
- `City`: `nameEn String?`
- `Organizer`: `bioEn String?` (опційно, але додай)
Адреси/назви місць (`address`, `place`) НЕ дублюємо — це власні назви.
Створити міграцію (`npx prisma migrate dev -n add_i18n_fields`).

## 2. Локалізація відповіді
- Додати спільний хелпер/`lang` query-DTO (валідація: `uk` | `en`, дефолт `uk`).
- На публічних читаннях резолвити перед віддачею:
  - `event.title = lang==='en' ? (titleEn || title) : title` (так само `description`)
  - `category.name`, `city.name`, `organizer.bio` — за тим самим правилом через `*_en`
- Стосується: `GET /events`, `GET /events/:slug`, `GET /organizers/:id`, `GET /cities`, `GET /categories`, `GET /me/saved`.
- Внутрішні/організаторські відповіді (де редагують) можуть лишати сирі поля.

## 3. DTO (створення/редагування)
ВАЖЛИВО: англійські поля — **опційні** й заповнюються вручну організатором у формі створення події. БЕЗ авто-перекладу/авто-генерації. Якщо організатор лишив їх порожніми — зберігаємо `null`, а на видачі спрацьовує фолбек на українську (розділ 2).
- `CreateEventDto`/`UpdateEventDto`: додати опційні `titleEn?`, `descriptionEn?` (`@IsOptional()`, `@IsString()`, без `@IsNotEmpty`). НЕ робити обов'язковими.
- Admin CRUD міст/категорій: опційний `nameEn?`.
- `PATCH /me/organizer`: опційний `bioEn?`.
- Пам'ятай про whitelist ValidationPipe — нові поля мають бути в DTO, інакше 400.
- (UI-форма з полями «Назва (EN)» / «Опис (EN)» — це кабінет організатора, Фаза 2; зараз достатньо, щоб API їх приймав і віддавав.)

## 4. Seed
Додати англійські значення для сід-даних: `nameEn` усім містам і категоріям, `titleEn`/`descriptionEn` усім демо-подіям. Англ. назви міст/категорій — у `../shodumo-web/src/i18n/taxonomy.en.json` (узгодь slug).

## 5. Swagger
Описати `lang` query-параметр на публічних ендпоінтах.

Перевір: `GET /events?lang=en` повертає англ. заголовки де вони є, інакше укр.; `GET /cities?lang=en` повертає англ. назви.
