import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TramiteService } from '../../../../core/services/tramite.service';
import { AdminTramite, AdminUpdateTramitePayload, PagedAdminTramite } from '../../../../data/interfaces/tramite.interface';

const ACCIONES_DISPONIBLES = ['abrir', 'descargar', 'editar'] as const;
type Accion = typeof ACCIONES_DISPONIBLES[number];

@Component({
  selector: 'app-gestion-tramites-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, KeyValuePipe],
  templateUrl: './gestion-tramites-admin.component.html',
  styleUrl: './gestion-tramites-admin.component.css'
})
export class GestionTramitesAdminComponent implements OnInit, OnDestroy {
  private tramiteService = inject(TramiteService);

  // ── Estado de la página actual ──────────────────────────────────────────────
  paginaDatos = signal<PagedAdminTramite | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  isSaving = signal(false);

  // ── Filtros y paginación (servidor) ─────────────────────────────────────────
  filtroTexto = signal('');    // busca por clienteId o tramiteId en el servidor
  filtroEstado = signal('');   // '' = todos
  pagina = signal(0);          // 0-based (API de Spring)
  readonly TAMANO_PAGINA = 20;

  readonly OPCIONES_PAGINA = [20, 50, 100];

  // ── Datos derivados de la respuesta del servidor ─────────────────────────────
  tramitesPagina = computed(() => this.paginaDatos()?.content ?? []);
  totalPaginas   = computed(() => this.paginaDatos()?.totalPages ?? 1);
  totalElementos = computed(() => this.paginaDatos()?.totalElements ?? 0);
  paginaDisplay  = computed(() => this.pagina() + 1); // 1-based para mostrar

  // Modal de edición
  tramiteSeleccionado: AdminTramite | null = null;
  editEstadoActual = '';
  editRespuestas: { [key: string]: any } = {};
  editAccionesPermitidas: { [tareaKey: string]: string[] } = {};

  readonly ACCIONES = ACCIONES_DISPONIBLES;
  readonly ESTADOS = ['INICIADO', 'EN_PROCESO', 'FINALIZADO'];

  private searchTimeout: any;

  ngOnInit(): void {
    this.cargarTramites();
  }

  ngOnDestroy(): void {
    clearTimeout(this.searchTimeout);
  }

  cargarTramites(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.tramiteService.obtenerTodosLosTramitesAdmin(
      this.pagina(),
      this.TAMANO_PAGINA,
      this.filtroEstado(),
      this.filtroTexto().trim()
    ).subscribe({
      next: (data) => {
        this.paginaDatos.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando trámites admin:', err);
        this.error.set('No se pudieron cargar los trámites. Verifica la conexión con el servidor.');
        this.isLoading.set(false);
      }
    });
  }

  // ── Filtros / paginación ────────────────────────────────────────────────────

  /** Al cambiar cualquier filtro: volvemos a página 0 y esperamos 350ms antes de consultar */
  onFiltroChange(): void {
    this.pagina.set(0);
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.cargarTramites(), 350);
  }

  limpiarFiltros(): void {
    this.filtroTexto.set('');
    this.filtroEstado.set('');
    this.pagina.set(0);
    this.cargarTramites();
  }

  irPagina(p: number): void {
    const max = this.totalPaginas() - 1;
    const nueva = Math.min(Math.max(0, p), max);
    if (nueva !== this.pagina()) {
      this.pagina.set(nueva);
      this.cargarTramites();
    }
  }

  // ── Modal ───────────────────────────────────────────────────────────────────

  abrirModal(tramite: AdminTramite): void {
    this.tramiteSeleccionado = tramite;
    this.editEstadoActual = tramite.estadoActual;
    this.editRespuestas = tramite.respuestas ? { ...tramite.respuestas } : {};
    this.editAccionesPermitidas = tramite.accionesPermitidas
      ? Object.fromEntries(
          Object.entries(tramite.accionesPermitidas).map(([k, v]) => [k, [...v]])
        )
      : {};
  }

  cerrarModal(): void {
    this.tramiteSeleccionado = null;
  }

  tieneAccion(tareaKey: string, accion: string): boolean {
    return (this.editAccionesPermitidas[tareaKey] ?? []).includes(accion);
  }

  toggleAccion(tareaKey: string, accion: string): void {
    const permisos = this.editAccionesPermitidas[tareaKey] ?? [];
    const idx = permisos.indexOf(accion);
    if (idx >= 0) {
      this.editAccionesPermitidas[tareaKey] = permisos.filter(a => a !== accion);
    } else {
      this.editAccionesPermitidas[tareaKey] = [...permisos, accion];
    }
  }

  guardarCambios(): void {
    if (!this.tramiteSeleccionado) return;
    this.isSaving.set(true);

    const payload: AdminUpdateTramitePayload = {
      estadoActual: this.editEstadoActual,
      respuestas: this.editRespuestas,
      accionesPermitidas: this.editAccionesPermitidas
    };

    this.tramiteService.actualizarTramiteAdmin(this.tramiteSeleccionado.id, payload).subscribe({
      next: (actualizado) => {
        // Actualizar el ítem dentro de la página actual sin recargar todo
        this.paginaDatos.update(p => {
          if (!p) return p;
          return {
            ...p,
            content: p.content.map(t => t.id === actualizado.id ? actualizado : t)
          };
        });
        this.isSaving.set(false);
        this.cerrarModal();
      },
      error: (err) => {
        console.error('Error actualizando trámite:', err);
        this.isSaving.set(false);
      }
    });
  }

  // ── Helpers de template ─────────────────────────────────────────────────────

  formatearClave(key: string): string {
    return key.replace(/n_.*?_t_/, '').replace(/_/g, ' ');
  }

  isUrl(valor: any): boolean {
    return typeof valor === 'string' && valor.startsWith('http');
  }

  trackByKey(_index: number, item: { key: string }): string {
    return item.key;
  }
}
