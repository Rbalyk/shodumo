import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from '../models';

/** Blocks unauthenticated access — sends to home with the auth modal flagged. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.parseUrl('/?auth=login');
};

/** Requires a specific role (declared via route `data.role`). */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const required = route.data['role'] as Role | undefined;

  if (!auth.isAuthenticated()) return router.parseUrl('/?auth=login');
  if (!required || auth.role() === required) return true;

  // wrong role → send the user to their own home
  return router.parseUrl(auth.homeRoute());
};
