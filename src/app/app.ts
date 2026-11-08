import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RouterLink, RouterLinkActive, RouterOutlet, Routes } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { API, AuthService, Usuario, adminGuard, authGuard, errorText } from './core';
import { LoginComponent, RegistroComponent } from './acceso';
import { CatalogoComponent } from './catalogo';

@Component({
    selector: 'app-usuarios', standalone: true,
    template: `
    <div class="page-heading">
      <div><p class="eyebrow">Administración</p><h1>Usuarios</h1><p>Cuentas registradas en el sistema.</p></div>
    </div>
    @if (error) { <p class="error" role="alert">{{ error }}</p> }
    <section class="card">
      @if (loading) { <p role="status">Cargando usuarios…</p> }
      @else if (!users.length) { <p class="empty">No hay usuarios en esta página.</p> }
      @else {
        <div class="table-scroll"><table>
          <thead><tr><th>ID</th><th>Usuario</th><th>Nombre</th><th>Apellidos</th><th>Correo</th><th>Estado</th></tr></thead>
          <tbody>
            @for (user of users; track user.id) {
              <tr><td class="identifier">{{ user.id }}</td><td>{{ user.username }}</td>
                <td>{{ user.firstName || '—' }}</td><td>{{ user.lastName || '—' }}</td>
                <td>{{ user.email || '—' }}</td><td>{{ user.enabled ? 'Activo' : 'Inactivo' }}</td></tr>
            }
          </tbody>
        </table></div>
      }
      <div class="list-heading pagination">
        <button class="secondary" (click)="load(first - pageSize)" [disabled]="loading || first === 0">Anterior</button>
        <span>Página {{ first / pageSize + 1 }}</span>
        <button class="secondary" (click)="load(first + pageSize)" [disabled]="loading || users.length < pageSize">Siguiente</button>
      </div>
    </section>`
})
export class UsuariosComponent implements OnInit {
    private readonly http = inject(HttpClient);
    private readonly destroyRef = inject(DestroyRef);
    readonly pageSize = 100;
    first = 0;
    users: Usuario[] = [];
    loading = false;
    error = '';

    ngOnInit(): void {
        this.load(0);
    }

    load(offset: number): void {
        if (this.loading || offset < 0) return;
        this.loading = true;
        this.error = '';
        const params = new HttpParams().set('first', offset).set('max', this.pageSize);

        this.http.get<Usuario[]>(API + '/usuarios', { params }).pipe(
            finalize(() => this.loading = false),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: users => {
                this.users = users;
                this.first = offset;
            },
            error: error => this.error = errorText(error)
        });
    }
}

@Component({
    selector: 'app-root', standalone: true,
    imports: [RouterOutlet, RouterLink, RouterLinkActive],
    template: `
    <header class="site-header">
      <a class="brand" routerLink="/productos">Inventario<span>Laboratorio</span></a>
      @if (auth.token()) {
        <nav aria-label="Navegación principal">
          <a routerLink="/productos" routerLinkActive="active">Productos</a>
          <a routerLink="/categorias" routerLinkActive="active">Categorías</a>
          @if (auth.admin()) { <a routerLink="/usuarios" routerLinkActive="active">Usuarios</a> }
        </nav>
        <div class="session">
          <span>{{ auth.nombre() }}<small>{{ auth.admin() ? 'Superadministrador' : 'Usuario' }}</small></span>
          <button class="secondary" (click)="auth.logout()">Salir</button>
        </div>
      }
    </header>
    <main><router-outlet /></main>
    <footer>Gestión de productos y categorías</footer>`
})
export class AppComponent { readonly auth = inject(AuthService); }

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'registro', component: RegistroComponent },
    { path: 'productos', component: CatalogoComponent, canActivate: [authGuard], data: { kind: 'productos' } },
    { path: 'categorias', component: CatalogoComponent, canActivate: [authGuard], data: { kind: 'categorias' } },
    { path: 'usuarios', component: UsuariosComponent, canActivate: [authGuard, adminGuard] },
    { path: '', pathMatch: 'full', redirectTo: 'productos' },
    { path: '**', redirectTo: 'productos' }
];
