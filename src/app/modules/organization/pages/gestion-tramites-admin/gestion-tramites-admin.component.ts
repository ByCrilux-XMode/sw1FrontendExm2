import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TramiteService } from '../../../../core/services/tramite.service';
import { AdminTramite, AdminUpdateTramitePayload } from '../../../../data/interfaces/tramite.interface';

const ACCIONES_DISPONIBLES = ['abrir', 'descargar', 'editar'] as const;
type Accion = typeof ACCIONES_DISPONIBLES[number];

@Component({
  selector: 'app-gestion-tramites-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, KeyValuePipe],
  templateUrl: './gestion-tramites-admin.component.html',
  styleUrl: './gestion-tramites-admin.component.css'
})
export class GestionTramitesAdminComponent implements OnInit {
  private tramiteService = inject(TramiteService);

  tramites = signal<AdminTramite[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  isSaving = signal(false);

  // Modal de edición
  tramiteSeleccionado: AdminTramite | null = null;
  editEstadoActual = '';
  editRespuestas: { [key: string]: any } = {};
  editAccionesPermitidas: { [tareaKey: string]: string[] } = {};

  readonly ACCIONES = ACCIONES_DISPONIBLES;
  readonly ESTADOS = ['INICIADO', 'EN_PROCESO', 'FINALIZADO'];

  ngOnInit(): void {
    this.cargarTramites();
  }

  cargarTramites(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.tramiteService.obtenerTodosLosTramitesAdmin().subscribe({
      next: (data) => {
        this.tramites.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando trámites admin:', err);
        this.error.set('No se pudieron cargar los trámites. Verifica la conexión con el servidor.');
        this.isLoading.set(false);
      }
    });
  }

  abrirModal(tramite: AdminTramite): void {
    this.tramiteSeleccionado = tramite;
    this.editEstadoActual = tramite.estadoActual;
    // Deep copy para no mutar el original antes de guardar
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

  /** Verifica si una acción está en la lista de permisos de una tarea */
  tieneAccion(tareaKey: string, accion: string): boolean {
    return (this.editAccionesPermitidas[tareaKey] ?? []).includes(accion);
  }

  /** Toggle una acción dentro de los permisos de una tarea */
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
        // Reemplazar en la lista local
        this.tramites.update(lista =>
          lista.map(t => t.id === actualizado.id ? actualizado : t)
        );
        this.isSaving.set(false);
        this.cerrarModal();
      },
      error: (err) => {
        console.error('Error actualizando trámite:', err);
        this.isSaving.set(false);
      }
    });
  }

  /** Formatea la clave de tarea para mostrarla legible */
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
