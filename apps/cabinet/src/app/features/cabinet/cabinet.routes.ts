import { Routes } from '@angular/router';

export const CABINET_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'events',
    loadComponent: () => import('./events-list/events-list.component').then((m) => m.EventsListComponent),
  },
  {
    path: 'events/new',
    loadComponent: () => import('./event-form/event-form.component').then((m) => m.EventFormComponent),
  },
  {
    path: 'events/:id/edit',
    loadComponent: () => import('./event-form/event-form.component').then((m) => m.EventFormComponent),
  },
  {
    path: 'profile',
    loadComponent: () => import('./organizer-profile/organizer-profile.component').then((m) => m.OrganizerProfileComponent),
  },
];
