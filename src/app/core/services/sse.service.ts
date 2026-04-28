import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SseEvent {
  type: string;
  data: any;
}

/**
 * Servicio que gestiona la conexión SSE con el backend.
 * Usa la API nativa EventSource del navegador.
 */
@Injectable({
  providedIn: 'root'
})
export class SseService implements OnDestroy {

  private eventSource: EventSource | null = null;
  private eventSubject = new Subject<SseEvent>();
  private funcionarioId: string = '';

  constructor() {}

  /**
   * Abre la conexión SSE para el funcionario autenticado.
   * Si ya hay una conexión abierta para el mismo funcionario, la reutiliza.
   */
  conectar(funcionarioId: string): Observable<SseEvent> {
    if (this.funcionarioId !== funcionarioId || !this.eventSource) {
      this.desconectar(); // Cerrar conexión anterior si existe
      this.funcionarioId = funcionarioId;
      this.abrirConexion();
    }
    return this.eventSubject.asObservable();
  }

  private abrirConexion(): void {
    const token = localStorage.getItem('token') || '';
    // EventSource no soporta headers custom, enviamos el token como query param
    const url = `${environment.apiUrl}/api/sse/tareas/${this.funcionarioId}?token=${token}`;

    this.eventSource = new EventSource(url);

    // Evento de conexión exitosa
    this.eventSource.addEventListener('connected', () => {
      console.log('[SSE] Conexión establecida con el servidor');
    });

    // Evento de nueva tarea asignada
    this.eventSource.addEventListener('nueva-tarea', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        this.eventSubject.next({ type: 'nueva-tarea', data });
      } catch {
        this.eventSubject.next({ type: 'nueva-tarea', data: event.data });
      }
    });

    // Error de conexión (el navegador intenta reconectar automáticamente)
    this.eventSource.onerror = (err) => {
      console.warn('[SSE] Error de conexión, el navegador reconectará automáticamente', err);
    };
  }

  desconectar(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.funcionarioId = '';
  }

  ngOnDestroy(): void {
    this.desconectar();
    this.eventSubject.complete();
  }
}
