import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'cabinet',
    canActivate: [authGuard, roleGuard],
    data: { role: 'ORGANIZER' },
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    loadChildren: () => import('./features/cabinet/cabinet.routes').then((m) => m.CABINET_ROUTES),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' },
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
