import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideNgtRenderer } from 'angular-three/dom';

export const appConfig: ApplicationConfig = {
  providers: [
    provideNgtRenderer(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
  ]
};
