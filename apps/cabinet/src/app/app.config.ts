import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { catchError, of } from 'rxjs';

import { routes } from './app.routes';
import { credentialsInterceptor } from './core/http/credentials.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { AuthService } from './core/auth/auth.service';

// Resolve the session from the auth cookie on boot: /auth/me succeeds when the
// cookie is valid, otherwise we start logged-out. Blocks routing until known.
function initAuth(auth: AuthService) {
  return () => auth.loadMe().pipe(catchError(() => of(null)));
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideAnimations(),
    provideHttpClient(withInterceptors([credentialsInterceptor, errorInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
};
