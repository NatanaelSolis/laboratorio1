import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AppComponent, routes } from './app/app';
import { authInterceptor } from './app/core';

bootstrapApplication(AppComponent, {
    providers: [provideRouter(routes), provideHttpClient(withInterceptors([authInterceptor]))]
}).catch(error => console.error('No se pudo iniciar la aplicación', error));
