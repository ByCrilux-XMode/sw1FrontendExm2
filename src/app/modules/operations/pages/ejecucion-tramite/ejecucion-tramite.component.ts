import { Component, OnInit, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DiagramComponent } from 'gojs-angular';
import * as go from 'gojs';
import { environment } from '../../../../../environments/environment';
import { WorkflowEngineService, WorkflowNode, WorkflowLink } from '../../../../core/services/workflow-engine.service';
import { DiagramConfig } from '../../../organization/pages/editor-politicas/diagram-config';

@Component({
  selector: 'app-ejecucion-tramite',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ejecucion-tramite.component.html',
  styleUrls: ['./ejecucion-tramite.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class EjecucionTramiteComponent implements OnInit {
  tramiteId: string = '';
  tareaAsignadaId: string = '';
  nodoKey: string = '';

  tramite: any = null;
  politica: any = null;

  // Diagrama
  public diagramNodeData: any[] = [];
  diagramLinkData: any[] = [];

  // Trackear qué campos están subiéndose
  uploadingFields: Set<string> = new Set<string>();
  public diagramDivClassName: string = 'myDiagramDiv';
  diaConfig = new DiagramConfig();

  // Nodos activos
  nodosActivos: WorkflowNode[] = []; // Solo contendrá 1 nodo ahora, la tarea actual
  nodosActivosKeys: string[] = []; // Solo el nodo asignado para el renderizado visual
  todasLasTareas: WorkflowNode[] = [];
  todosLosEnlaces: WorkflowLink[] = [];

  // Formulario de respuestas
  respuestas: any = {};

  // ===== SMART FORM FILLING (Rellenado inteligente con IA) =====
  cargandoIA: boolean = false;            // Estado de carga mientras la IA procesa
  datosSugeridos: any = null;             // Datos extraídos por la IA (temporal, sin aplicar)
  mostrarPanelSugerencias: boolean = false; // Controla la visibilidad del panel de revisión
  errorIA: string | null = null;          // Mensaje de error amigable si la IA falla
  nodoSugerencias: WorkflowNode | null = null; // Nodo al que pertenecen las sugerencias

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private workflowEngine: WorkflowEngineService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.tramiteId = this.route.snapshot.paramMap.get('id') || '';

    this.route.queryParams.subscribe(params => {
      this.tareaAsignadaId = params['tareaAsignadaId'];
      this.nodoKey = params['nodoKey'];

      if (this.tramiteId && this.nodoKey) {
        this.nodosActivosKeys = [this.nodoKey];
        this.cargarTramite();
      }
    });
  }

  // Inicializador de GoJS
  public initDiagram = (): go.Diagram => {
    const $ = go.GraphObject.make;
    const dia = $(go.Diagram, {
      'undoManager.isEnabled': true,
      isReadOnly: true, // Importante: El funcionario no edita el grafo, solo lo ve
      model: $(go.GraphLinksModel, {
        linkKeyProperty: 'key',
        linkFromPortIdProperty: 'fromPort',
        linkToPortIdProperty: 'toPort'
      })
    });

    dia.nodeTemplateMap = this.diaConfig.getNodeTemplateMap();
    dia.linkTemplate = this.diaConfig.getLinkTemplate();
    dia.groupTemplateMap = this.diaConfig.getGroupTemplateMap();

    // Resaltador de nodos activos
    dia.addDiagramListener("InitialLayoutCompleted", (e) => {
      this.resaltarNodosActivos(dia);
    });

    return dia;
  };

  cargarTramite() {
    this.http.get<any>(`${environment.apiUrl}/api/tramite/${this.tramiteId}`).subscribe(
      res => {
        this.tramite = res;
        if (this.tramite.respuestas) {
          this.respuestas = { ...this.tramite.respuestas };
        }
        this.cargarPolitica(this.tramite.politicaId);
      },
      err => console.error("Error cargando trámite", err)
    );
  }

  cargarPolitica(politicaId: string) {
    this.http.get<any>(`${environment.apiUrl}/api/politica/${politicaId}`).subscribe(
      res => {
        this.politica = res;
        const esquema = this.workflowEngine.parseEsquema(this.politica.esquemaJson);
        this.diagramNodeData = esquema.nodes;
        this.diagramLinkData = esquema.links;
        this.todasLasTareas = esquema.nodes;
        this.todosLosEnlaces = esquema.links;

        this.procesarNodosActivos();
      },
      err => console.error("Error cargando política", err)
    );
  }

  procesarNodosActivos() {
    this.nodosActivos = [];
    const nodo = this.workflowEngine.getNodoByKey(this.nodoKey, this.todasLasTareas);
    if (nodo) {
      // Si por alguna razón llegamos a un nodo de control (no manual), avanzamos automáticamente
      if (!this.workflowEngine.esCategoriaAsignable(nodo.category)) {
        this.avanzarNodo(nodo.key);
        return;
      }
      this.nodosActivos.push(nodo);
    }
    this.cdr.detectChanges();
  }

  resaltarNodosActivos(diagram: go.Diagram) {
    diagram.startTransaction("resaltar");
    diagram.nodes.each(node => {
      const shape = node.findObject("SHAPE_ACT") || node.findObject("SHAPE_LANE");
      if (shape) {
        if (this.nodosActivosKeys.includes(String(node.key))) {
          (shape as go.Shape).stroke = "#00FF00";
          (shape as go.Shape).strokeWidth = 4;
        } else {
          (shape as go.Shape).stroke = "#4fc3f7"; // Color por defecto
          (shape as go.Shape).strokeWidth = 2;
        }
      }
    });
    diagram.commitTransaction("resaltar");
  }

  getInputName(nodeKey: any, taskNombre: string): string {
    return `n_${nodeKey}_t_${taskNombre}`;
  }

  getOpcionesCondicional(nodoKey: string | number): string[] {
    const links = this.workflowEngine.getOutgoingLinks(nodoKey, this.todosLosEnlaces);
    return links.map(l => l.text || '').filter(t => t !== '');
  }

  onFileSelected(event: any, nodoKey: string | number, taskNombre: string) {
    const file = event.target.files[0];
    if (!file) return;

    const fieldName = this.getInputName(nodoKey, taskNombre);
    this.uploadingFields.add(fieldName);

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<{ url: string }>(`${environment.apiUrl}/api/tramites/${this.tramiteId}/documentos`, formData).subscribe({
      next: (res) => {
        this.respuestas[fieldName] = res.url;
        this.uploadingFields.delete(fieldName);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error subiendo archivo', err);
        alert('Error al subir el archivo');
        this.uploadingFields.delete(fieldName);
        this.cdr.detectChanges();
      }
    });
  }

  // ===== SMART FORM FILLING =====

  /**
   * Devuelve la lista de "campos" rellenables por la IA para un nodo Activity.
   * Equivale conceptualmente a Object.keys(formulario.controls), pero aquí los
   * campos son los nombres de las tareas de tipo texto/número/fecha.
   */
  getCamposRellenables(nodo: WorkflowNode): string[] {
    if (!nodo?.tasks) return [];
    return nodo.tasks
      .filter(t => ['TEXTO', 'NUMERO', 'FECHA'].includes(t.tipo) || t.tipo === undefined)
      .map(t => t.nombre);
  }

  /**
   * Maneja la selección de imagen para el rellenado inteligente:
   * 1. Sube la imagen a S3 (reutiliza el endpoint de documentos) -> imageUrl.
   * 2. Llama a /api/ia/extraer-datos con la imageUrl y los campos del formulario.
   * 3. Guarda los datos en datosSugeridos y muestra el panel de revisión.
   */
  onFileSelectedIA(event: any, nodo: WorkflowNode) {
    const file = event.target.files[0];
    if (!file) return;

    // Reiniciamos el estado del flujo de IA.
    this.errorIA = null;
    this.datosSugeridos = null;
    this.mostrarPanelSugerencias = false;
    this.cargandoIA = true;
    this.nodoSugerencias = nodo;

    const campos = this.getCamposRellenables(nodo);
    if (campos.length === 0) {
      this.cargandoIA = false;
      this.errorIA = 'Este formulario no tiene campos de texto para rellenar con IA.';
      event.target.value = '';
      return;
    }

    // 1. Subir la imagen a S3 para obtener la URL pública.
    const formData = new FormData();
    formData.append('file', file);

    this.http.post<{ url: string }>(`${environment.apiUrl}/api/tramites/${this.tramiteId}/documentos`, formData).subscribe({
      next: (resUpload) => {
        const imageUrl = resUpload.url;

        // 2. Llamar al endpoint de extracción multimodal.
        this.http.post<any>(`${environment.apiUrl}/api/ia/extraer-datos`, { imageUrl, campos }).subscribe({
          next: (datos) => {
            if (!datos || datos.error) {
              this.errorIA = 'No pudimos reconocer el documento, por favor intenta otra foto.';
            } else {
              this.datosSugeridos = datos;
              this.mostrarPanelSugerencias = true;
            }
            this.cargandoIA = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.errorIA = 'No pudimos reconocer el documento, por favor intenta otra foto.';
            this.cargandoIA = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.errorIA = 'No pudimos reconocer el documento, por favor intenta otra foto.';
        this.cargandoIA = false;
        this.cdr.detectChanges();
      }
    });

    // Permite volver a seleccionar la misma imagen si se reintenta.
    event.target.value = '';
  }

  /** Lista de claves sugeridas, para iterar en el panel de revisión. */
  getSugerenciasKeys(): string[] {
    return this.datosSugeridos ? Object.keys(this.datosSugeridos) : [];
  }

  /**
   * El usuario ACEPTA las sugerencias: equivale a formulario.patchValue(datosSugeridos),
   * mapeando cada campo a su nombre dinámico real dentro de 'respuestas'.
   */
  aceptarSugerencias() {
    if (!this.datosSugeridos || !this.nodoSugerencias) return;

    // Mapa campo -> tipo, para saber qué campos son FECHA y normalizarlos.
    const tipoPorCampo: { [k: string]: string } = {};
    (this.nodoSugerencias.tasks || []).forEach(t => tipoPorCampo[t.nombre] = t.tipo);

    for (const campo of Object.keys(this.datosSugeridos)) {
      let valor = this.datosSugeridos[campo];
      if (valor === null || valor === undefined || valor === '') continue; // Respeta los datos no encontrados.

      // Los <input type="date"> exigen formato yyyy-MM-dd; normalizamos.
      if (tipoPorCampo[campo] === 'FECHA') {
        const fechaIso = this.normalizarFecha(String(valor));
        if (!fechaIso) continue; // Si no se pudo interpretar, dejamos el campo manual.
        valor = fechaIso;
      }

      const fieldName = this.getInputName(this.nodoSugerencias.key, campo);
      this.respuestas[fieldName] = valor;
    }

    this.cerrarPanelSugerencias();
  }

  /**
   * Convierte una fecha en cualquier formato común al formato yyyy-MM-dd que
   * exige <input type="date">. Devuelve null si no puede interpretarla.
   * Soporta: ISO, dd/mm/yyyy, dd-mm-yyyy, "5 de mayo de 2024", etc.
   */
  private normalizarFecha(valor: string): string | null {
    const v = valor.trim();

    // 1. Ya viene en ISO (yyyy-MM-dd, opcionalmente con hora) -> tomamos los 10 primeros.
    let m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;

    // 2. Formatos dd/mm/yyyy o dd-mm-yyyy (también con año de 2 dígitos).
    m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m) {
      let [, d, mes, y] = m;
      if (y.length === 2) y = '20' + y;
      return `${y}-${mes.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // 3. Fechas escritas con el mes en texto (español): "5 de mayo de 2024".
    const meses: { [k: string]: string } = {
      enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
      julio: '07', agosto: '08', septiembre: '09', setiembre: '09', octubre: '10',
      noviembre: '11', diciembre: '12'
    };
    m = v.toLowerCase().match(/(\d{1,2})\s*(?:de\s+)?([a-záéíóú]+)\s*(?:de\s+)?(\d{4})/);
    if (m && meses[m[2]]) {
      return `${m[3]}-${meses[m[2]]}-${m[1].padStart(2, '0')}`;
    }

    // 4. Último recurso: dejamos que Date intente parsearla.
    const fecha = new Date(v);
    if (!isNaN(fecha.getTime())) {
      const y = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const d = String(fecha.getDate()).padStart(2, '0');
      return `${y}-${mes}-${d}`;
    }

    return null;
  }

  /** El usuario decide EDITAR manualmente: cerramos el panel sin aplicar nada. */
  editarSugerencias() {
    this.cerrarPanelSugerencias();
  }

  private cerrarPanelSugerencias() {
    this.mostrarPanelSugerencias = false;
    this.datosSugeridos = null;
    this.nodoSugerencias = null;
    this.cdr.detectChanges();
  }

  avanzarNodo(nodoKey: string | number, decisionText?: string) {
    // 1. Guardar respuestas primero
    this.guardarRespuestasBackend().then(() => {
      // 2. Calcular los siguientes nodos
      const siguientes = this.workflowEngine.getSiguientesNodosKeys(nodoKey, this.todasLasTareas, this.todosLosEnlaces, decisionText);

      const payload = {
        nodoActualKey: String(nodoKey),
        nodosSiguientesKeys: siguientes.map(k => String(k))
      };

      this.http.patch(`${environment.apiUrl}/api/tramite/${this.tramiteId}/pasar-nodo`, payload).subscribe(
        () => {
          alert('Tarea Completada y Trámite avanzado.');
          // Volvemos al dashboard de funcionario
          this.router.navigate(['/funcionario/dashboard']);
        },
        err => console.error("Error al avanzar", err)
      );
    });
  }

  async guardarRespuestasBackend() {
    return new Promise<void>((resolve, reject) => {
      this.http.patch(`${environment.apiUrl}/api/tramite/${this.tramiteId}/respuestas`, this.respuestas)
        .subscribe(
          () => resolve(),
          err => reject(err)
        );
    });
  }
}
