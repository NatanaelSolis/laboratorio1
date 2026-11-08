import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService, Registro, errorText } from './core';

@Component({
    selector: 'app-login', standalone: true, imports: [FormsModule, RouterLink],
    template: `
    <section class="card access">
      <p class="eyebrow">Laboratorio · Inventario</p>
      <h1>Iniciar sesión</h1>
      <p>Consulta productos y categorías con tu cuenta.</p>
      @if (registered) { <p class="success" role="status">Cuenta creada. Ya puedes iniciar sesión.</p> }
      @if (error) { <p class="error" role="alert">{{ error }}</p> }
      <form #form="ngForm" (ngSubmit)="submit(form)">
        <label>Usuario
          <input name="username" [(ngModel)]="username" required maxlength="64"
            autocomplete="username" [disabled]="busy">
        </label>
        <label>Contraseña
          <input name="password" [(ngModel)]="password" type="password" required maxlength="256"
            autocomplete="current-password" [disabled]="busy">
        </label>
        <button type="submit" [disabled]="busy || form.invalid">{{ busy ? 'Ingresando…' : 'Ingresar' }}</button>
      </form>
      <p>¿No tienes cuenta? <a routerLink="/registro">Registrarse</a></p>
    </section>
  `
})
export class LoginComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    readonly registered = this.route.snapshot.queryParamMap.get('registered') === 'true';
    username = '';
    password = '';
    busy = false;
    error = '';
    submit(form: NgForm): void {
        form.form.markAllAsTouched();
        if (form.invalid || this.busy || !this.username.trim()) return;
        this.busy = true;
        this.error = '';
        this.auth.login(this.username, this.password).pipe(
            finalize(() => this.busy = false), takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: () => {
                const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '';
                const destination = /^\/(productos|categorias|usuarios)(?:[/?#]|$)/.test(returnUrl) ? returnUrl : '/productos';
                void this.router.navigateByUrl(destination);
            },
            error: error => this.error = errorText(error)
        });
    }
}

@Component({
    selector: 'app-registro', standalone: true, imports: [FormsModule, RouterLink],
    template: `
    <section class="card access">
      <p class="eyebrow">Nueva cuenta</p>
      <h1>Registrarse</h1>
      <p>Las cuentas nuevas pueden consultar el inventario.</p>
      @if (error) { <p class="error" role="alert">{{ error }}</p> }
      <form #form="ngForm" (ngSubmit)="submit(form)">
        <div class="form-grid">
          <label>Nombre
            <input name="firstName" [(ngModel)]="data.firstName" required maxlength="100"
              autocomplete="given-name" [disabled]="busy">
          </label>
          <label>Apellidos
            <input name="lastName" [(ngModel)]="data.lastName" required maxlength="100"
              autocomplete="family-name" [disabled]="busy">
          </label>
        </div>
        <label>Usuario
          <input name="username" [(ngModel)]="data.username" required minlength="3" maxlength="64"
            autocomplete="username" [disabled]="busy">
        </label>
        <label>Correo electrónico
          <input name="email" [(ngModel)]="data.email" type="email" email required maxlength="254"
            autocomplete="email" [disabled]="busy">
        </label>
        <label>Contraseña
          <input name="password" [(ngModel)]="data.password" type="password" required minlength="8"
            maxlength="256" autocomplete="new-password" [disabled]="busy">
          <small>Usa al menos 8 caracteres.</small>
        </label>
        <label>Confirmar contraseña
          <input name="confirmation" [(ngModel)]="confirmation" type="password" required maxlength="256"
            autocomplete="new-password" [disabled]="busy">
        </label>
        <button type="submit" [disabled]="busy || form.invalid">{{ busy ? 'Creando cuenta…' : 'Crear cuenta' }}</button>
      </form>
      <p><a routerLink="/login">Volver al inicio de sesión</a></p>
    </section>
  `
})
export class RegistroComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    data: Registro = { username: '', email: '', firstName: '', lastName: '', password: '' };
    confirmation = '';
    busy = false;
    error = '';
    submit(form: NgForm): void {
        form.form.markAllAsTouched();
        if (form.invalid || this.busy) return;
        if (this.data.password !== this.confirmation) {
            this.error = 'Las contraseñas no coinciden.';
            return;
        }
        const payload: Registro = {
            ...this.data, username: this.data.username.trim(), email: this.data.email.trim(),
            firstName: this.data.firstName.trim(), lastName: this.data.lastName.trim()
        };
        if (payload.username.length < 3 || !payload.firstName || !payload.lastName) {
            this.error = 'Completa los campos con datos válidos.';
            return;
        }
        this.busy = true;
        this.error = '';
        this.auth.register(payload).pipe(
            finalize(() => this.busy = false), takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: () => void this.router.navigate(['/login'], { queryParams: { registered: true } }),
            error: error => this.error = errorText(error)
        });
    }
}
