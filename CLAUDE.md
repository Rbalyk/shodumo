# ShoDumo — repository conventions

Monorepo for **ShoDumo**, an API-first afisha of micro-events in Lviv.

```
apps/
  api/   NestJS + Prisma REST API   (source of truth for data)
  web/   the whole front-end — one Angular 19 SSR app (standalone, signals, OnPush):
         public site is server-rendered; cabinet + admin are lazy, client-only routes
```

These conventions are **binding** for `apps/web`. `apps/api` is only touched when a
feature genuinely needs a schema/contract change — and then the change is described
first, never migrated silently.

> The former `apps/cabinet` SPA and the gulp `apps/_web_legacy` site have been merged
> into `apps/web` and removed; `app.shodumo.com` is retired (single origin).

---

## Angular (`apps/web`)

### Component file layout

- Every component lives in **three files**: `*.component.ts`, `*.component.html`,
  `*.component.scss`. **No inline `template:` / `styles:`** in `@Component`.
  - The `.ts` references them with `templateUrl` / `styleUrl`.
  - Tiny structural wrappers (e.g. the root `AppComponent` that only hosts
    `<router-outlet/>`) may keep an inline template **only** if it has no styles.
- Standalone components, `ChangeDetectionStrategy.OnPush`, `signal`/`computed`
  for state. Prefer signals over RxJS subjects for component state; use RxJS only
  at the edges (HTTP, `valueChanges`) and bridge into signals with `toSignal`.
- Route params via `withComponentInputBinding()` + `input()`.

### CSS convention (contextual, no BEM)

- **No BEM** `block__element` / `block--modifier`. **No `#id` selectors.**
- Each component owns a **single root class** per section (e.g. `.shell`, `.login`,
  `.event-form`); everything inside is styled **contextually** — by tag or by a
  short, local class scoped under the root.
- **Shared primitives are flat, multi-class** — never BEM:
  - buttons: `.btn` + variant `.btn-grad` / `.btn-soft` / `.btn-ghost` /
    `.btn-outline` / `.btn-danger` + size `.btn-sm` / `.btn-block`
  - cards: `.card`
  - chips/badges: `.chip`, `.badge` + state class (e.g. `.badge.published`)
  - form field internals: `.field` with nested `.label` / `.hint` / `.error`
- Keep **specificity flat** — max ~2–3 levels of nesting. Style by element where
  possible (`.tbl th`, `.row .title`) rather than inventing class names.
- Component styles use Angular's default `ViewEncapsulation.Emulated`; global
  tokens + shared primitives live in `src/styles.scss`.
- Design tokens are CSS custom properties on `:root` (colors, radii, shadows).
  Components must consume `var(--…)`, never hard-code brand colors.

### Forms

- **Reactive Forms only** (`FormBuilder` / `FormGroup`), never template-driven for
  data entry.
- Inputs render through **Angular Material** `mat-form-field`:
  - text/number/textarea → `matInput`
  - choices (Category, City, …) → `mat-select` (not native `<select>`)
  - booleans → `mat-slide-toggle` / `mat-checkbox`
  - validation messages → `mat-error` bound to control state.
- Live previews react to `form.valueChanges` (debounced ~150–200 ms), **not** a
  `computed()` that reads `form.getRawValue()` — a form value is not a signal and
  will not trigger recomputation.

### Angular Material

- Material is themed with a **custom theme built from the existing design tokens**
  (the `--accent` brand gradient family), defined in `src/styles.scss`. **Do not
  ship the default Material purple.** New Material UI must blend into the existing
  look, not replace it.
- `provideAnimations()` is registered once in `app.config.ts`.

### i18n

- **No hardcoded UI strings.** All copy goes through the dotted-key dictionaries in
  `src/app/shared/i18n/dictionaries.ts` and the `| t` pipe / `I18nService.t()`.
- Keys exist in **both `uk` and `en`** (uk is the source of truth, en mirrors it).

---

## Public SSR (`apps/web` — feed, event, organizer, map, search)

- **SEO-first, server-rendered.** Public pages render on the server (content in the
  HTML for crawlers + fast paint) and hydrate without a flash
  (`provideClientHydration(withEventReplay())` + the HTTP transfer cache).
- The public pages use **no Angular Material** — plain semantic markup + the shared
  SCSS primitives; Material is reserved for the cabinet/admin forms.
- `EventCardComponent` is the **single source of truth** for the feed / organizer /
  saved grids — no duplicated card markup.
- **Per-route SEO** via `SeoService` (title/meta/OG, canonical, `uk`/`en`/`x-default`
  hreflang, JSON-LD). `robots.txt` + `sitemap.xml` are Express routes in `src/server.ts`;
  missing events/organizers return a real **HTTP 404** (via the `RESPONSE_STATUS` holder).
- Cabinet (`/cabinet/*`) and admin (`/admin/*`) are **lazy, role-guarded, client-only**
  (CSR shell from Express) — they use Material + Google Maps and must not SSR.
- Env: browser-facing API origin, Google Maps key and `siteUrl` are baked from
  `environment.production.ts`; the server reads `ALLOWED_HOSTS`, `SITE_URL`,
  `API_INTERNAL_URL`, `API_PUBLIC_URL` at runtime.

---

## General

- TypeScript strict; no `any` where a real type fits.
- Keep changes **behavior- and design-preserving** unless a redesign is explicitly
  requested — refactors must stay visually 1:1.
- Run `npm run build` (in `apps/web`) clean before declaring done.
