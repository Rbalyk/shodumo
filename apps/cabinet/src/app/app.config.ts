import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { catchError, of } from 'rxjs';

import { routes } from './app.routes';
import { bearerInterceptor } from './core/http/bearer.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { AuthService } from './core/auth/auth.service';

/** Refresh the authoritative profile from /auth/me on boot when a token exists. */
function initAuth(auth: AuthService) {
  return () => {
    if (!auth.isAuthenticated()) return of(null);
    return auth.loadMe().pipe(catchError(() => of(null)));
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([bearerInterceptor, errorInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
};
