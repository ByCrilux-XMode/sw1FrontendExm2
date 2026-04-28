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
  imports: [CommonModule, FormsModule, DiagramComponent],
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

    this.http.post<{ url: string }>(`${environment.apiUrl}/api/upload`, formData).subscribe({
      next: (res) => {
        this.respuestas[fieldName] = res.url;
        this.uploadingFields.delete(fieldName);
      },
      error: (err) => {
        console.error('Error subiendo archivo', err);
        alert('Error al subir el archivo');
        this.uploadingFields.delete(fieldName);
      }
    });
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
