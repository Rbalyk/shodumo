import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from '../models';

/** Blocks unauthenticated access — redirects to /login. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.parseUrl('/login');
};

/** Requires a specific role (declared via route `data.role`). */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const required = route.data['role'] as Role | undefined;

  if (!auth.isAuthenticated()) return router.parseUrl('/login');
  if (!required || auth.role() === required) return true;

  // wrong role → send the user to their own home (or login if none)
  return router.parseUrl(auth.homeRoute());
};

/** Keeps authenticated users off the login screen. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return true;
  return router.parseUrl(auth.homeRoute());
};
