import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { Navbar } from '../../../../shared/components/navbar/navbar';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PoliticaService } from '../../../../core/services/politica.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { WorkflowEngineService } from '../../../../core/services/workflow-engine.service';
import { SseService } from '../../../../core/services/sse.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard-funcionario',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Navbar],
  templateUrl: './dashboard-funcionario.component.html',
  styleUrls: ['./dashboard-funcionario.component.css']
})
export class DashboardFuncionarioComponent implements OnInit, OnDestroy {
  activeTab: 'registrar_cliente' | 'iniciar_tramite' | 'bandeja_tareas' = 'bandeja_tareas';

  // SSE listener
  private sseSubscription: Subscription | null = null;

  // Registrar Cliente
  clienteForm: FormGroup;

  // Iniciar Trámite
  clientes: any[] = [];
  politicas: any[] = [];
  selectedClienteId = '';
  selectedPoliticaId = '';

  // Bandeja de Tareas
  tareasAsignadas: any[] = [];
  funcionarioId: string = '';

  // --- Filtro inteligente de la bandeja ---
  filtroBusqueda: string = '';
  filtroEstado: 'TODOS' | 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA' = 'TODOS';
  filtroOrden: 'reciente' | 'antiguo' | 'nombre' = 'reciente';
  // Cuántas tareas mostrar por columna (evita listar miles)
  limitePendientes: number = 10;
  limiteCompletadas: number = 10;

  constructor(
    private http: HttpClient,
    private router: Router,
    private politicaService: PoliticaService,
    private authService: AuthService,
    private userService: UserService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private workflowEngine: WorkflowEngineService,
    private sseService: SseService
  ) {
    this.clienteForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(4)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rol: ['ROLE_CLIENTE'], // Hardcodeado a ROLE_CLIENTE
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      telefono: ['', Validators.required],
      ci: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    const user = this.authService.usuarioActual;
    if (user && user.userId) {
      this.funcionarioId = user.userId;
    }

    this.cargarDatos();
    this.conectarSSE();
  }

  ngOnDestroy(): void {
    this.sseService.desconectar();
    if (this.sseSubscription) this.sseSubscription.unsubscribe();
  }

  private conectarSSE(): void {
    if (!this.funcionarioId) return;
    this.sseSubscription = this.sseService
      .conectar(this.funcionarioId)
      .subscribe(evento => {
        if (evento.type === 'nueva-tarea') {
          // El servidor nos notifica: hay una nueva tarea. Recargamos la bandeja.
          this.cargarMisTareas();
        }
      });
  }

  cargarDatos() {
    this.cargarClientes();
    this.cargarPoliticas();
    this.cargarMisTareas();
  }

  switchTab(tab: 'registrar_cliente' | 'iniciar_tramite' | 'bandeja_tareas') {
    this.activeTab = tab;
    if (tab === 'bandeja_tareas') this.cargarMisTareas();
  }

  // --- 1. Registrar Cliente ---
  registrarCliente() {
    if (this.clienteForm.valid) {
      this.userService.registrarCliente(this.clienteForm.value).subscribe({
        next: () => {
          alert('Cliente registrado con éxito.');
          this.clienteForm.reset({ rol: 'ROLE_CLIENTE' });
          this.cargarClientes(); // recargar
        },
        error: (err) => {
          console.error(err);
          alert('Error al registrar cliente: ' + (err.error?.message || 'Error del servidor'));
        }
      });
    } else {
      alert('Por favor, complete todos los campos obligatorios correctamente.');
    }
  }

  // --- 2. Iniciar Trámite ---
  cargarClientes() {
    this.userService.getUsuarios().subscribe(
      res => {
        this.clientes = res.filter(u => u.rol === 'ROLE_CLIENTE' || u.rol === 'ROLE_CLIENTE');
      },
      err => console.error(err)
    );
  }

  cargarPoliticas() {
    this.politicaService.getPoliticas().subscribe(
      res => {
        console.log("Politicas recibidas:", res);
        this.politicas = res; // Mostramos todas para evitar que no salgan si no están publicadas
      },
      err => console.error(err)
    );
  }

  iniciarTramite() {
    if (!this.selectedClienteId || !this.selectedPoliticaId) {
      alert("Seleccione un cliente y una política.");
      return;
    }

    const politica = this.politicas.find(p => p.id === this.selectedPoliticaId);
    if (!politica || !politica.esquemaJson) return;

    let nodosInicialesKeys: string[] = [];
    try {
      const esquema = this.workflowEngine.parseEsquema(politica.esquemaJson);
      const nodoInicio = esquema.nodes.find((n: any) => n.category === 'Initial');
      if (!nodoInicio) {
        alert('La política no tiene un nodo Inicial válido.');
        return;
      }
      // Saltar el nodo Initial y obtener los primeros nodos asignables reales
      nodosInicialesKeys = this.workflowEngine.getPrimeraNodosAsignables(
        nodoInicio.key, esquema.nodes, esquema.links
      );
    } catch (e) { console.error(e); }

    if (nodosInicialesKeys.length === 0) {
      alert('No se encontraron tareas asignables en la política. Verifique el diagrama.');
      return;
    }

    const payload = {
      clienteId: this.selectedClienteId,
      politicaId: this.selectedPoliticaId,
      nodosInicialesKeys: nodosInicialesKeys
    };

    this.http.post(`${environment.apiUrl}/api/tramite/iniciar`, payload).subscribe(
      () => {
        alert('Trámite iniciado con éxito. La tarea ha sido asignada mediante Round Robin.');
        this.switchTab('bandeja_tareas');
      },
      err => {
        console.error(err);
        alert('Error al iniciar trámite.');
      }
    );
  }

  // --- 3. Bandeja de Tareas ---
  cargarMisTareas() {
    if (!this.funcionarioId) return;
    this.http.get<any[]>(`${environment.apiUrl}/api/organization/mis-tareas/${this.funcionarioId}`).subscribe(
      res => {
        this.tareasAsignadas = res;
        this.cdr.detectChanges();
      },
      err => {
        console.error("Error cargando tareas del funcionario", err);
      }
    );
  }

  // Aplica búsqueda de texto + ordenamiento a un conjunto de tareas
  private aplicarFiltros(tareas: any[]): any[] {
    let resultado = tareas;

    // Búsqueda por nombre de tarea o ID de trámite
    const termino = this.filtroBusqueda.trim().toLowerCase();
    if (termino) {
      resultado = resultado.filter(t =>
        (t.nombreTarea || '').toLowerCase().includes(termino) ||
        (t.tramiteId || '').toString().toLowerCase().includes(termino)
      );
    }

    // Ordenamiento (sin mutar el array original)
    const getFecha = (t: any) =>
      new Date(t.fechaFin || t.fechaAsignacion || t.fechaInicio || t.fechaCreacion || 0).getTime();

    resultado = [...resultado].sort((a, b) => {
      switch (this.filtroOrden) {
        case 'antiguo':  return getFecha(a) - getFecha(b);
        case 'nombre':   return (a.nombreTarea || '').localeCompare(b.nombreTarea || '');
        case 'reciente':
        default:         return getFecha(b) - getFecha(a);
      }
    });

    return resultado;
  }

  // Indica si una columna debe mostrarse según el filtro de estado
  mostrarColumna(estado: 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADA'): boolean {
    return this.filtroEstado === 'TODOS' || this.filtroEstado === estado;
  }

  // Total de pendientes que pasan el filtro (para el contador real)
  get tareasPendientesTotal() {
    return this.aplicarFiltros(this.tareasAsignadas.filter(t => t.estado === 'PENDIENTE'));
  }
  // Solo las que se renderizan (limitadas)
  get tareasPendientes() {
    return this.tareasPendientesTotal.slice(0, this.limitePendientes);
  }
  verMasPendientes() {
    this.limitePendientes += 10;
  }
  get tareasEnCurso() {
    return this.aplicarFiltros(this.tareasAsignadas.filter(t => t.estado === 'EN_CURSO'));
  }
  // Total de completadas que pasan el filtro (para mostrar el contador real)
  get tareasCompletadasTotal() {
    return this.aplicarFiltros(this.tareasAsignadas.filter(t => t.estado === 'COMPLETADA'));
  }
  // Solo las que se renderizan (limitadas para no listar miles)
  get tareasCompletadas() {
    return this.tareasCompletadasTotal.slice(0, this.limiteCompletadas);
  }

  verMasCompletadas() {
    this.limiteCompletadas += 10;
  }

  limpiarFiltros() {
    this.filtroBusqueda = '';
    this.filtroEstado = 'TODOS';
    this.filtroOrden = 'reciente';
    this.limitePendientes = 10;
    this.limiteCompletadas = 10;
  }

  realizarTarea(tareaAsignadaId: string, tramiteId: string, nodoKey: string) {
    // Al abrir una tarea PENDIENTE, la pasamos a EN_CURSO
    this.http.patch(`${environment.apiUrl}/api/organization/mis-tareas/${tareaAsignadaId}/estado?nuevoEstado=EN_CURSO`, {}).subscribe(() => {
      this.router.navigate(['/funcionario/tramites', tramiteId, 'ejecutar'], { queryParams: { tareaAsignadaId: tareaAsignadaId, nodoKey: nodoKey } });
    });
  }

  verDetalle(tramiteId: string) {
    this.router.navigate([`/funcionario/tramites/${tramiteId}/detalle`]);
  }
}
