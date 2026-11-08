import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';

export const API = 'http://localhost:8080/api';
const SESSION_KEY = 'laboratorio.sesion';
export interface Categoria { id?: number; nombre: string; descripcion: string; }
export interface Producto extends Categoria { precio: number; cantidadStock: number; categoriaId: number; }
export interface Item extends Categoria { precio?: number; cantidadStock?: number; categoriaId?: number; }
export interface Usuario { id: string; username: string; email?: string; firstName?: string; lastName?: string; enabled?: boolean; }
export interface Registro { username: string; email: string; firstName: string; lastName: string; password: string; }
interface TokenResponse { access_token: string; expires_in: number; }
interface Sesion { token: string; expires: number; nombre: string; roles: string[]; }

// Leer del JWT el nombre, los roles y la fecha de vencimiento.
// Decodificar el token aquí no valida su firma; esa validación corresponde a la API.
function decodeSession(token: string): Sesion {
    if (typeof token !== 'string' || token.split('.').length !== 3) {
        throw new Error('La respuesta de acceso no es válida.');
    }
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = part + '='.repeat((4 - part.length % 4) % 4);
    const bytes = Uint8Array.from(atob(padded), character => character.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as {
        exp?: number; preferred_username?: string; realm_access?: { roles?: unknown };
    };
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) {
        throw new Error('La sesión recibida ya venció.');
    }
    const roles = payload.realm_access?.roles;
    return {
        token, expires: payload.exp * 1000,
        nombre: typeof payload.preferred_username === 'string' ? payload.preferred_username : 'Usuario',
        roles: Array.isArray(roles) ? roles.filter((role): role is string => typeof role === 'string') : []
    };
}
function restoreSession(): Sesion | null {
    try {
        const token = sessionStorage.getItem(SESSION_KEY);
        return token ? decodeSession(token) : null;
    } catch {
        try { sessionStorage.removeItem(SESSION_KEY); } catch { /* Sesión en memoria. */ }
        return null;
    }
}
export function errorText(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
        switch (error.status) {
            case 0: return 'No se pudo conectar con el servidor local.';
            case 400: return 'Revisa los datos ingresados.';
            case 401: return 'Credenciales incorrectas o sesión vencida.';
            case 403: return 'Tu usuario no tiene permiso para esta operación.';
            case 404: return 'El registro ya no está disponible.';
            case 409: return 'El registro ya existe o está relacionado con otros datos.';
            case 429: return 'Se realizaron demasiados intentos. Espera antes de volver a intentar.';
            case 503: return 'El servicio de acceso no está disponible.';
            default: return 'No se pudo completar la operación. Inténtalo nuevamente.';
        }
    }
    return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly state = signal<Sesion | null>(restoreSession());
    private timer: ReturnType<typeof setTimeout> | undefined;
    readonly nombre = computed(() => this.state()?.nombre || '');
    readonly admin = computed(() => this.state()?.roles.includes('SUPER-ADMIN-ROLE') ?? false);
    constructor() { this.scheduleExpiry(); }
    token(): string | null {
        const session = this.state();
        if (!session) return null;
        if (session.expires <= Date.now()) { this.logout(false); return null; }
        return session.token;
    }
    login(username: string, password: string) {
        return this.http.post<TokenResponse>(API + '/v1/auth/login', { username: username.trim(), password }).pipe(
            tap(response => {
                const session = decodeSession(response.access_token);
                this.state.set(session);
                try { sessionStorage.setItem(SESSION_KEY, session.token); } catch { /* Sesión en memoria. */ }
                this.scheduleExpiry();
            })
        );
    }
    register(data: Registro) { return this.http.post<void>(API + '/v1/auth/register', data); }
    logout(navigate = true): void {
        if (this.timer) clearTimeout(this.timer);
        this.timer = undefined;
        this.state.set(null);
        try { sessionStorage.removeItem(SESSION_KEY); } catch { /* Almacenamiento no disponible. */ }
        if (navigate) void this.router.navigate(['/login']);
    }
    private scheduleExpiry(): void {
        if (this.timer) clearTimeout(this.timer);
        const session = this.state();
        if (!session) return;

        // setTimeout admite como máximo un entero de 32 bits en milisegundos.
        const maxTimeoutMs = 2147483647;
        const remainingMs = Math.max(0, session.expires - Date.now());
        const delayMs = Math.min(remainingMs, maxTimeoutMs);

        this.timer = setTimeout(() => {
            const current = this.state();
            if (current && current.expires > Date.now()) this.scheduleExpiry();
            else this.logout();
        }, delayMs);
    }
}
// Comprobar la sesión antes de abrir una pantalla y el rol antes de abrir Usuarios.
// Estas comprobaciones de navegación complementan los permisos de la API.
export const authGuard: CanActivateFn = (_route, state) => {
    const auth = inject(AuthService);
    return auth.token() ? true : inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
export const adminGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.token()) return router.createUrlTree(['/login']);
    return auth.admin() ? true : router.createUrlTree(['/productos']);
};
// Adjuntar el token solo a las peticiones privadas de esta API.
// Un error 401 indica una sesión inválida; un 403 indica falta de permisos.
export const authInterceptor: HttpInterceptorFn = (request, next) => {
    const auth = inject(AuthService);
    const isApi = request.url.startsWith(API + '/');
    const isPublic = request.url.startsWith(API + '/v1/auth/');
    const token = isApi && !isPublic ? auth.token() : null;
    const outgoing = token ? request.clone({ setHeaders: { Authorization: 'Bearer ' + token } }) : request;
    return next(outgoing).pipe(catchError(error => {
        if (isApi && !isPublic && error instanceof HttpErrorResponse && error.status === 401) auth.logout();
        return throwError(() => error);
    }));
};
