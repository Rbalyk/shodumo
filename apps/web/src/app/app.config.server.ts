import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';
import { API_BASE_URL } from './core/tokens';
import { environment } from '../environments/environment';

// On the server, talk to the API over the private network if configured
// (API_INTERNAL_URL) — otherwise fall back to the public origin.
const serverApiBase = process.env['API_INTERNAL_URL'] || environment.apiBaseUrl;

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    { provide: API_BASE_URL, useValue: serverApiBase },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
