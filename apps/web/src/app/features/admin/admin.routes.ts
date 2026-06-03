import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'moderation' },
  {
    path: 'moderation',
    loadComponent: () => import('./moderation/moderation.component').then((m) => m.ModerationComponent),
  },
  {
    path: 'taxonomy',
    loadComponent: () => import('./taxonomy/taxonomy.component').then((m) => m.TaxonomyComponent),
  },
];
