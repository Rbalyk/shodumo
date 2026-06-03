import { Routes } from '@angular/router';
import { PublicLayoutComponent } from './shared/layout/public-layout.component';
import { authGuard, roleGuard } from './core/auth/auth.guards';

/**
 * Public route tree (SSR). Mounted twice under the shared shell: at the root
 * (uk) and under `/en` (en). Language is derived from the URL path by
 * I18nService, so both branches share the same components. Cabinet/admin (lazy,
 * non-SSR, role-guarded) are added in a later phase.
 */
const publicRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'event/:slug',
    loadComponent: () =>
      import('./features/event/event.component').then((m) => m.EventComponent),
  },
  {
    path: 'organizer/:id',
    loadComponent: () =>
      import('./features/organizer/organizer.component').then((m) => m.OrganizerComponent),
  },
  {
    path: 'map',
    loadComponent: () => import('./features/map/map.component').then((m) => m.MapComponent),
  },
];

export const routes: Routes = [
  { path: '', component: PublicLayoutComponent, children: publicRoutes },
  { path: 'en', component: PublicLayoutComponent, children: publicRoutes },

  // Organizer cabinet — lazy, non-SSR (excluded from the SSR engine in server.ts),
  // behind the auth + ORGANIZER role guards. The shell hosts the child outlet.
  {
    path: 'cabinet',
    canActivate: [authGuard, roleGuard],
    data: { role: 'ORGANIZER' },
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    loadChildren: () =>
      import('./features/cabinet/cabinet.routes').then((m) => m.CABINET_ROUTES),
  },

  // Admin back-office — lazy, non-SSR, behind the auth + ADMIN role guards.
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' },
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },

  // wildcard 404 handled in a later phase
  { path: '**', redirectTo: '' },
];
