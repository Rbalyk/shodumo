# ShoDumo — repository conventions

Monorepo for **ShoDumo**, an API-first afisha of micro-events in Lviv.

```
apps/
  api/      NestJS + Prisma REST API   (source of truth for data)
  web/      public site — HTML + SCSS + vanilla JS, built with Gulp, static-first
  cabinet/  organizer/admin SPA — Angular 19 (standalone, signals, OnPush)
```

These conventions are **binding** for `apps/web` and `apps/cabinet`. `apps/api`
is only touched when a feature genuinely needs a schema/contract change — and then
the change is described first, never migrated silently.

---

## Angular (`apps/cabinet`)

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

## Web (`apps/web`)

- **Static-first / SEO-first.** HTML + SCSS + vanilla JS (`window.SD` namespace),
  built with Gulp; event & organizer pages are pre-rendered at build time.
- Card/markup has a **single source of truth** — the `{{token}}` template
  `src/pages/partials/event-card.html`, filled by both the Node pre-renderer and
  the client. **No card HTML strings in the JS bundle.**
- SCSS follows the same **contextual, no-BEM** convention as the cabinet
  (`.btn-soft`, nested contextual selectors, no `block__el`).
- Build-time env injection via tokens (`__API_BASE_URL__`, `__SITE_URL__`,
  `__APP_URL__`, `__DEFAULT_CITY__`). `API_URL` is the single source of the API
  address across build, prerender and runtime.

---

## General

- TypeScript strict; no `any` where a real type fits.
- Keep changes **behavior- and design-preserving** unless a redesign is explicitly
  requested — refactors must stay visually 1:1.
- Run `ng build` (cabinet) / `npm run build` (web) clean before declaring done.
