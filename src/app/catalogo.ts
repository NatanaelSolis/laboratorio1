import { Component, DestroyRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, EMPTY, catchError, combineLatest, finalize, forkJoin, of, switchMap } from 'rxjs';
import { API, AuthService, Categoria, Item, errorText } from './core';

@Component({
    selector: 'app-entidad-form', standalone: true, imports: [FormsModule],
    template: `
    <section class="card">
      <h2>{{ value?.id == null ? 'Crear' : 'Editar' }} {{ kind === 'productos' ? 'producto' : 'categoría' }}</h2>
      <form #form="ngForm" (ngSubmit)="submit(form)">
        <label>Nombre<input name="nombre" [(ngModel)]="model.nombre" required maxlength="100" [disabled]="busy"></label>
        <label>Descripción<textarea name="descripcion" [(ngModel)]="model.descripcion" required maxlength="255" rows="3" [disabled]="busy"></textarea></label>
        @if (kind === 'productos') {
          <div class="form-grid">
            <label>Precio<input name="precio" [(ngModel)]="model.precio" type="number" required min="0" step="0.01" [disabled]="busy"></label>
            <label>Cantidad en inventario<input name="cantidadStock" [(ngModel)]="model.cantidadStock" type="number" required min="0" step="1" [disabled]="busy"></label>
          </div>
          <label>Categoría
            <select name="categoriaId" [(ngModel)]="model.categoriaId" required [disabled]="busy">
              <option [ngValue]="null" disabled>Selecciona una categoría</option>
              @for (category of categories; track category.id) {
                <option [ngValue]="category.id">{{ category.nombre }}</option>
              }
            </select>
          </label>
          @if (!categories.length) { <p class="notice">Crea una categoría antes de registrar productos.</p> }
        }
        @if (error) { <p class="error" role="alert">{{ error }}</p> }
        <div class="actions">
          <button type="submit" [disabled]="busy || form.invalid">{{ busy ? 'Guardando…' : 'Guardar' }}</button>
          <button class="secondary" type="button" [disabled]="busy" (click)="cancel.emit()">Cancelar</button>
        </div>
      </form>
    </section>`
})
export class EntidadFormComponent implements OnChanges {
    @Input() kind: 'productos' | 'categorias' = 'productos';
    @Input() value: Item | null = null;
    @Input() categories: Categoria[] = [];
    @Input() busy = false;
    @Output() save = new EventEmitter<Item>();
    @Output() cancel = new EventEmitter<void>();
    model = { nombre: '', descripcion: '', precio: 0, cantidadStock: 0, categoriaId: null as number | null };
    error = '';
    ngOnChanges(changes: SimpleChanges): void {
        if (changes['value'] || changes['kind']) {
            this.model = {
                nombre: this.value?.nombre || '', descripcion: this.value?.descripcion || '',
                precio: this.value?.precio ?? 0, cantidadStock: this.value?.cantidadStock ?? 0,
                categoriaId: this.value?.categoriaId ?? null
            };
            this.error = '';
        }
    }
    submit(form: NgForm): void {
        form.form.markAllAsTouched();
        if (form.invalid || this.busy) return;

        const nombre = this.model.nombre.trim();
        const descripcion = this.model.descripcion.trim();
        if (!nombre || !descripcion) {
            this.error = 'El nombre y la descripción son obligatorios.';
            return;
        }

        const payload: Item = { nombre, descripcion };
        if (this.value?.id != null) payload.id = this.value.id;

        if (this.kind === 'productos') {
            const { precio, cantidadStock, categoriaId } = this.model;
            const precioValido = Number.isFinite(precio) && precio >= 0 && precio <= 9999999999.99;
            const stockValido = Number.isInteger(cantidadStock) && cantidadStock >= 0 && cantidadStock <= 2147483647;
            const categoriaValida = this.categories.some(category => category.id === categoriaId);

            if (!precioValido || !stockValido || categoriaId === null || !categoriaValida) {
                this.error = 'Revisa el precio, la cantidad entera y la categoría.';
                return;
            }
            payload.precio = precio;
            payload.cantidadStock = cantidadStock;
            payload.categoriaId = categoriaId;
        }

        this.error = '';
        this.save.emit(payload);
    }
}

@Component({
    selector: 'app-catalogo', standalone: true, imports: [CommonModule, EntidadFormComponent],
    template: `
    <div class="page-heading">
      <div><p class="eyebrow">Inventario</p><h1>{{ kind === 'productos' ? 'Productos' : 'Categorías' }}</h1>
        <p>{{ auth.admin() ? 'Administra los registros del catálogo.' : 'Consulta los registros disponibles.' }}</p></div>
      @if (auth.admin()) {
        <button (click)="open(null)" [disabled]="loading || saving">{{ kind === 'productos' ? 'Nuevo producto' : 'Nueva categoría' }}</button>
      }
    </div>
    @if (error) { <p class="error" role="alert">{{ error }}</p> }
    @if (message) { <p class="success" role="status">{{ message }}</p> }
    @if (showForm && auth.admin()) {
      <app-entidad-form [kind]="kind" [value]="editing" [categories]="categories" [busy]="saving" (save)="save($event)" (cancel)="showForm = false" />
    }
    @if (pendingDelete && auth.admin()) {
      <section class="card confirmation" aria-label="Confirmar eliminación">
        <h2>Eliminar {{ pendingDelete.nombre }}</h2><p>Esta operación elimina el registro. ¿Deseas continuar?</p>
        <div class="actions">
          <button class="danger" (click)="remove()" [disabled]="saving">{{ saving ? 'Eliminando…' : 'Eliminar' }}</button>
          <button class="secondary" (click)="pendingDelete = null" [disabled]="saving">Cancelar</button>
        </div>
      </section>
    }
    <section class="card">
      <div class="list-heading"><span>{{ rows.length }} registros</span>
        <button class="secondary" (click)="reload()" [disabled]="loading || saving">Actualizar lista</button></div>
      @if (loading) { <p role="status">Cargando registros…</p> }
      @else if (!rows.length) { <p class="empty">Todavía no hay registros para mostrar.</p> }
      @else {
        <div class="table-scroll"><table>
          <thead><tr><th>ID</th><th>Nombre</th><th>Descripción</th>
            @if (kind === 'productos') { <th>Precio</th><th>Cantidad</th><th>Categoría</th> }
            @if (auth.admin()) { <th>Acciones</th> }
          </tr></thead>
          <tbody>
            @for (row of rows; track row.id) {
              <tr><td>{{ row.id }}</td><td>{{ row.nombre }}</td><td>{{ row.descripcion }}</td>
                @if (kind === 'productos') {
                  <td>{{ row.precio | number:'1.2-2' }}</td><td>{{ row.cantidadStock }}</td>
                  <td>{{ categoryName(row.categoriaId) }}<small>ID {{ row.categoriaId }}</small></td>
                }
                @if (auth.admin()) {
                  <td><div class="actions">
                    <button class="secondary" (click)="open(row)" [disabled]="saving">Editar</button>
                    <button class="danger secondary" [disabled]="saving" (click)="confirmDelete(row)">Eliminar</button>
                  </div></td>
                }
              </tr>
            }
          </tbody>
        </table></div>
      }
    </section>`
})
export class CatalogoComponent implements OnInit {
    readonly auth = inject(AuthService);
    private readonly http = inject(HttpClient);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly refresh = new BehaviorSubject<void>(undefined);

    kind: 'productos' | 'categorias' = 'productos';
    rows: Item[] = [];
    categories: Categoria[] = [];
    editing: Item | null = null;
    pendingDelete: Item | null = null;
    showForm = false;
    loading = false;
    saving = false;
    error = '';
    message = '';

    ngOnInit(): void {
        // Recargar al cambiar de catálogo o pedir una actualización con refresh.
        combineLatest([this.route.data, this.refresh]).pipe(
            // Cancelar la consulta anterior para evitar mostrar datos de otra pantalla.
            switchMap(([data]) => {
                const kind = data['kind'] === 'categorias' ? 'categorias' : 'productos';
                if (kind !== this.kind) {
                    this.showForm = false;
                    this.pendingDelete = null;
                    this.message = '';
                }
                this.kind = kind;
                this.loading = true;
                this.error = '';

                const categoriesRequest = kind === 'productos'
                    ? this.http.get<Categoria[]>(API + '/categorias')
                    : of([] as Categoria[]);

                // Esperar ambas consultas antes de mostrar los registros y sus categorías.
                return forkJoin({
                    rows: this.http.get<Item[]>(API + '/' + kind),
                    categories: categoriesRequest
                }).pipe(
                    catchError(error => {
                        this.error = errorText(error);
                        this.rows = [];
                        return EMPTY;
                    }),
                    finalize(() => this.loading = false)
                );
            }),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(result => {
            this.rows = result.rows;
            this.categories = result.categories;
        });
    }

    reload(): void {
        this.refresh.next();
    }

    categoryName(id?: number): string {
        const category = this.categories.find(category => category.id === id);
        return category?.nombre || '-';
    }

    open(row: Item | null): void {
        if (!this.auth.admin()) return;
        this.editing = row ? { ...row } : null;
        this.pendingDelete = null;
        this.showForm = true;
        this.error = '';
        this.message = '';
    }

    save(payload: Item): void {
        if (!this.auth.admin() || this.saving) return;
        this.saving = true;
        this.error = '';
        const endpoint = API + '/' + this.kind;

        // Sin id: crear con POST. Con id: actualizar con PUT.
        const request = payload.id == null
            ? this.http.post<Item>(endpoint, payload)
            : this.http.put<Item>(endpoint + '/' + payload.id, payload);

        request.pipe(
            finalize(() => this.saving = false),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: () => {
                this.showForm = false;
                this.message = 'Registro guardado correctamente.';
                this.reload();
            },
            error: error => this.error = errorText(error)
        });
    }

    confirmDelete(row: Item): void {
        if (!this.auth.admin()) return;
        this.showForm = false;
        this.pendingDelete = row;
        this.message = '';
        this.error = '';
    }

    remove(): void {
        const id = this.pendingDelete?.id;
        if (id == null || !this.auth.admin() || this.saving) return;
        this.saving = true;
        this.error = '';

        this.http.delete<void>(API + '/' + this.kind + '/' + id).pipe(
            finalize(() => this.saving = false),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: () => {
                this.pendingDelete = null;
                this.message = 'Registro eliminado correctamente.';
                this.reload();
            },
            error: error => this.error = errorText(error)
        });
    }
}
