import { Component, OnInit, inject, ViewEncapsulation, NgZone, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Navbar } from '../../../../shared/components/navbar/navbar';
import { DepartamentoService } from '../../../../core/services/departamento.service';
import { firstValueFrom } from 'rxjs';
import { RegistrarDepartamentoRequest } from '../../../../data/interfaces/departamento.interface';

import * as go from 'gojs';
import { DiagramComponent, PaletteComponent } from 'gojs-angular';

import { Firestore, doc, setDoc, getDoc, deleteDoc, onSnapshot } from '@angular/fire/firestore';
import { DiagramConfig } from './diagram-config';
import { PoliticaService } from '../../../../core/services/politica.service';
import { AiService } from '../../../../core/services/ai.service';

@Component({
  selector: 'app-editor-politicas',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, DiagramComponent, PaletteComponent],
  templateUrl: './editor-politicas.html',
  styleUrl: './editor-politicas.css',
  encapsulation: ViewEncapsulation.None
})
export class EditorPoliticas implements OnInit {
  @ViewChild(DiagramComponent, { static: false }) public diagramComponent!: DiagramComponent;
  private route = inject(ActivatedRoute);
  private deptService = inject(DepartamentoService);
  private firestore = inject(Firestore);
  private ngZone = inject(NgZone);
  private politicaService = inject(PoliticaService);
  private cdr = inject(ChangeDetectorRef);
  private diaConfig = new DiagramConfig()
  private aiService = inject(AiService)

  public politicaId: string | null = null;
  public departamentos: any[] = [];

  // Modal state
  public showLaneModal = false;
  public selectedDeptId = '';
  public newDeptName = '';
  private pendingLaneNode: go.Node | null = null;
  private isUpdatingFromFirebase = false;

  public diagramNodeData: Array<go.ObjectData> = [];
  public diagramLinkData: Array<go.ObjectData> = [];
  public diagramDivClassName = 'myDiagramDiv';
  public currentPrompt: string = '';
  public chatHistory: { role: 'user' | 'bot', text: string }[] = [];
  public isLoading: boolean = false;

  // ── Panel de propiedades del nodo seleccionado ─────────────────────────────
  public nodoSeleccionado: any = null;
  public editPermisos: string[] = [];
  public readonly ACCIONES_ARCHIVO = ['abrir', 'descargar', 'editar'];
  //animacion de carga
  public currentLoadingMessage: string = '';
  private loadingInterval: any;
  private loadingMessages: string[] = [
    'Interpretando solicitud de la política...',
    'Estructurando departamentos y carriles...',
    'Construyendo nodos y actividades...',
    'Validando conexiones y tipos de entrada...',
    'Ensamblando JSON estricto...',
    'Afinando detalles visuales...'
  ];
  public paletteNodeData: Array<go.ObjectData> = [
    { category: 'Initial', key: 'p_initial' },
    { category: 'Activity', key: 'p_activity', text: 'Nueva Actividad', tasks: [] },
    { category: 'Conditional', key: 'p_conditional', text: 'Condición', tipoValidacion: 'MANUAL' },
    { category: 'Merge', key: 'p_merge' },
    { category: 'ForkJoin', key: 'p_forkjoin' },
    /*{ category: 'Connector', key: 'p_connector' },*/
    { category: 'Lane', key: 'p_lane', isGroup: true, size: '400 200' },
    { category: 'FlowFinal', key: 'p_flowfinal' },
    { category: 'Final', key: 'p_final', Text: 'Finalización' },
  ];

  public paletteLinkData: Array<go.ObjectData> = [
    { key: 'p_link', category: '' }
  ];

  // ─── PALETTE ───────────────────────────────────────────────────────────────
  public initPalette = (): go.Palette => {
    const $ = go.GraphObject.make;

    const palette = $(go.Palette, {
      layout: $(go.GridLayout, {
        wrappingColumn: 1,
        cellSize: new go.Size(1, 1),
        spacing: new go.Size(0, 10),
        alignment: go.GridLayout.Position
      }),
      contentAlignment: go.Spot.TopCenter,
      padding: new go.Margin(16, 0, 0, 0),
    });

    const createPaletteNode = (iconShape: go.GraphObject, text: string) => {
      return $(go.Node, 'Horizontal', { selectionAdorned: false, width: 170, background: 'transparent', cursor: 'pointer' },
        $(go.Panel, 'Spot', { width: 50, height: 45, alignment: go.Spot.Center }, iconShape),
        $(go.TextBlock, text, { font: '500 12px "Segoe UI", Inter, sans-serif', stroke: '#e0e0e0', margin: new go.Margin(0, 0, 0, 8) })
      );
    };

    palette.nodeTemplateMap.add('Initial',
      createPaletteNode(
        $(go.Shape, 'Circle', { fill: '#4fc3f7', stroke: null, width: 24, height: 24 }),
        'Inicio'
      )
    );

    palette.nodeTemplateMap.add('Activity',
      createPaletteNode(
        $(go.Shape, 'RoundedRectangle', { fill: '#16213e', stroke: '#4fc3f7', strokeWidth: 1.5, parameter1: 5, width: 36, height: 24 }),
        'Actividad'
      )
    );

    palette.nodeTemplateMap.add('Conditional',
      createPaletteNode(
        $(go.Shape, 'Diamond', { fill: '#16213e', stroke: '#ffca28', strokeWidth: 2, width: 28, height: 28 }),
        'Condición'
      )
    );

    palette.nodeTemplateMap.add('Merge',
      createPaletteNode(
        $(go.Shape, 'Diamond', { fill: '#16213e', stroke: '#ba68c8', strokeWidth: 2, width: 28, height: 28 }),
        'Fusión (Merge)'
      )
    );

    palette.nodeTemplateMap.add('ForkJoin',
      createPaletteNode(
        $(go.Shape, 'Rectangle', { fill: '#e0e0e0', stroke: null, width: 40, height: 6 }),
        'Fork / Join'
      )
    );

    palette.nodeTemplateMap.add('Connector',
      createPaletteNode(
        $(go.Panel, 'Position', { width: 36, height: 24 },
          $(go.Shape, { geometryString: "M4 12 L32 12", stroke: '#80cbc4', strokeWidth: 2 }),
          $(go.Shape, { geometryString: "M26 6 L32 12 L26 18", stroke: '#80cbc4', strokeWidth: 2 })
        ),
        'Conector'
      )
    );

    palette.nodeTemplateMap.add('Final',
      createPaletteNode(
        $(go.Panel, 'Spot',
          $(go.Shape, 'Circle', { fill: 'transparent', stroke: '#ef5350', strokeWidth: 2, width: 28, height: 28 }),
          $(go.Shape, 'Circle', { fill: '#ef5350', stroke: null, width: 14, height: 14 })
        ),
        'Final'
      )
    );

    palette.nodeTemplateMap.add('FlowFinal',
      createPaletteNode(
        $(go.Panel, 'Spot',
          $(go.Shape, 'Circle', { fill: 'transparent', stroke: '#f44336', strokeWidth: 2, width: 28, height: 28 }),
          $(go.Shape, 'XLine', { stroke: '#f44336', strokeWidth: 2, width: 14, height: 14 })
        ),
        'Flow Final'
      )
    );

    palette.groupTemplateMap.add('Lane',
      $(go.Group, 'Horizontal', { selectionAdorned: false, width: 170, background: 'transparent', cursor: 'pointer' },
        $(go.Panel, 'Spot', { width: 50, height: 45, alignment: go.Spot.Center },
          $(go.Shape, 'Rectangle', { fill: '#f8f9fa', stroke: '#1a1a2e', strokeWidth: 1.5, width: 32, height: 24 }),
          $(go.Shape, 'LineH', { stroke: '#1a1a2e', strokeWidth: 1.5, width: 32, height: 0, alignment: go.Spot.Top, alignmentFocus: go.Spot.Top, margin: new go.Margin(6, 0, 0, 0) })
        ),
        $(go.TextBlock, 'Calle (Lane)', { font: '500 12px "Segoe UI", Inter, sans-serif', stroke: '#e0e0e0', margin: new go.Margin(0, 0, 0, 8) })
      )
    );

    // Conector en la paleta (visual link definition if needed)
    palette.linkTemplate = $(go.Link,
      { selectionAdorned: false },
      $(go.Shape, { strokeWidth: 2, stroke: '#555' }),
      $(go.Shape, { toArrow: 'Standard', fill: '#555', stroke: null })
    );

    return palette;
  }

  // ─── DIAGRAM ───────────────────────────────────────────────────────────────
  public initDiagram = (): go.Diagram => {
    const $ = go.GraphObject.make;

    const dia = $(go.Diagram, {
      'undoManager.isEnabled': true,
      layout: $(go.LayeredDigraphLayout, {
        direction: 0,         // Izquierda a derecha
        layerSpacing: 100,    // Separación horizontal general
        columnSpacing: 50,    // Separación vertical general
        setsPortSpots: false,  // Respeta los puertos que ya definiste (Top, Bottom, Left, Right)
        isOngoing: false        // Fuerza a que se reordene cuando la IA inyecta datos
      }),
      "resizingTool.isEnabled": true,
      allowDrop: true,
      mouseDrop: (e) => {
        const ok = e.diagram.commandHandler.addTopLevelParts(e.diagram.selection, true);
        if (!ok) e.diagram.currentTool.doCancel();
      },
      model: $(go.GraphLinksModel, {
        linkKeyProperty: 'key', // <--- ESTO DEBE ESTAR AQUÍ
        linkFromPortIdProperty: 'fromPort',
        linkToPortIdProperty: 'toPort'
      }),
      'toolManager.hoverDelay': 100,
      'commandHandler.archetypeGroupData': {
        isGroup: true, text: 'Nuevo Departamento', category: 'Lane'
      },
    });

    dia.addDiagramListener('ExternalObjectsDropped', (e: go.DiagramEvent) => {
      e.subject.each((node: go.Part) => {
        if (node instanceof go.Group && node.category === 'Lane') {
          this.ngZone.run(() => {
            // Refrescar departamentos en tiempo real por si otro admin creó uno nuevo
            this.deptService.getDepartamentos().subscribe(depts => {
              this.departamentos = depts || [];
              this.cdr.detectChanges();
            });

            this.pendingLaneNode = node as go.Node;
            this.selectedDeptId = '';
            this.newDeptName = '';
            this.showLaneModal = true;
          });
        }
      });
    });

    //inicar todo
    dia.nodeTemplateMap = this.diaConfig.getNodeTemplateMap();
    dia.linkTemplate = this.diaConfig.getLinkTemplate();
    dia.groupTemplateMap = this.diaConfig.getGroupTemplateMap();

    // Panel de propiedades: actualizar al cambiar la selección
    dia.addDiagramListener('ChangedSelection', (_e) => {
      const sel = dia.selection.first();
      this.ngZone.run(() => {
        if (sel instanceof go.Node && sel.data?.category === 'Activity') {
          this.nodoSeleccionado = sel.data;
          this.editPermisos = [...(sel.data.accionesPermitidas ?? ['abrir', 'descargar', 'editar'])];
        } else {
          this.nodoSeleccionado = null;
          this.editPermisos = [];
        }
        this.cdr.detectChanges();
      });
    });

    return dia;
  }

  // ─── LIFECYCLE & LOGIC ───────────────────────────────────────────────────
  ngOnInit() {
    this.politicaId = this.route.snapshot.paramMap.get('id');

    // Cargar departamentos disponibles
    this.deptService.getDepartamentos().subscribe(depts => {
      this.departamentos = depts || [];
    });

    if (this.politicaId) {
      this.cargarEsquemaInicialYFirebase();
    }
  }

  async cargarEsquemaInicialYFirebase() {
    if (!this.politicaId) return;

    const docRef = doc(this.firestore, 'politicas_en_vivo', this.politicaId);

    // 1. Verificamos si existe una sesión de edición activa en Firebase
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data['nodos']) {
          console.log('Sesión activa encontrada en Firebase. Restaurando estado en tiempo real...');
          // Si ya existe sesión, cargamos de Firebase e ignoramos PostgreSQL
          this.diagramNodeData = [...data['nodos']];
          this.diagramLinkData = [...(data['links'] || [])];
          this.suscribirAFirebase(docRef);
          return;
        }
      }
    } catch (error) {
      console.error('Error verificando Firebase:', error);
    }

    // 2. Si no hay sesión en Firebase, cargamos el esquema final guardado en PostgreSQL
    console.log('Iniciando nueva sesión. Cargando de PostgreSQL...');
    this.politicaService.getPoliticaById(this.politicaId).subscribe({
      next: async (politica) => {
        let cargadoExito = false;
        if (politica && politica.esquemaJson && politica.esquemaJson !== '[]' && politica.esquemaJson.trim() !== '') {
          try {
            const loadModel = () => {
              if (this.diagramComponent && this.diagramComponent.diagram) {
                const model = go.Model.fromJson(politica.esquemaJson) as go.GraphLinksModel;
                // IMPORTANTE: Restaurar configuraciones clave que fromJson podría borrar
                model.linkKeyProperty = 'key';
                model.linkFromPortIdProperty = 'fromPort';
                model.linkToPortIdProperty = 'toPort';

                this.diagramComponent.diagram.model = model;
                this.diagramNodeData = model.nodeDataArray;
                this.diagramLinkData = model.linkDataArray as any[];
                this.cdr.detectChanges(); // Forzamos actualización UI
                cargadoExito = true;
                console.log('Diagrama cargado usando fromJson de la base de datos.');

                // Ahora sí inicializamos firebase porque ya tenemos los datos listos
                this.inicializarFirebase(docRef);
              } else {
                setTimeout(loadModel, 100);
              }
            };
            loadModel();
            return; // Detenemos la ejecución aquí porque loadModel es asíncrono
          } catch (e) {
            console.error('Error parseando el esquema JSON de la política:', e);
          }
        } else {
          // Si la política es nueva (vacía), inicializamos Firebase con el lienzo en blanco
          this.inicializarFirebase(docRef);
          return;
        }

        this.suscribirAFirebase(docRef);
      },
      error: (err) => {
        console.error('Error obteniendo la política de la base de datos:', err);
        // Intentamos suscribir a firebase por si acaso
        this.suscribirAFirebase(docRef);
      }
    });
  }

  private async inicializarFirebase(docRef: any) {
    try {
      await setDoc(docRef, {
        nodos: this.diagramNodeData,
        links: this.diagramLinkData,
        ultimaModificacion: new Date()
      });
      console.log('Sesión en vivo de Firebase inicializada.');
    } catch (e) {
      console.error('Error inicializando Firebase:', e);
    }
    this.suscribirAFirebase(docRef);
  }

  suscribirAFirebase(docRef: any) {
    if (!this.politicaId) return;

    // Usamos onSnapshot de Firebase v9+ nativo para evitar problemas con docData de AngularFire
    onSnapshot(docRef, (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data['nodos']) {
          this.ngZone.run(() => {
            this.isUpdatingFromFirebase = true;

            // Si el diagrama ya está inicializado, inyectamos los datos directamente en el modelo de GoJS
            if (this.diagramComponent && this.diagramComponent.diagram) {
              const model = this.diagramComponent.diagram.model as go.GraphLinksModel;
              model.startTransaction('firebase update');
              model.mergeNodeDataArray(data['nodos']);
              model.mergeLinkDataArray(data['links'] || []);
              model.commitTransaction('firebase update');

              this.diagramNodeData = model.nodeDataArray;
              this.diagramLinkData = model.linkDataArray as any[];
            } else {
              this.diagramNodeData = [...data['nodos']];
              this.diagramLinkData = [...(data['links'] || [])];
            }

            this.cdr.detectChanges(); // Forzamos actualización UI en tiempo real
            // Liberamos la bandera de actualización despues de un margen
            setTimeout(() => this.isUpdatingFromFirebase = false, 200);
          });
        }
      }
    }, (error: any) => {
      console.error('Error en la suscripción de Firebase:', error);
    });
  }

  // ─── MODAL LOGIC ─────────────────────────────────────────────────────────
  cancelarLane() {
    this.showLaneModal = false;
    if (this.pendingLaneNode && this.pendingLaneNode.diagram) {
      this.pendingLaneNode.diagram.commandHandler.deleteSelection();
    }
    this.pendingLaneNode = null;
  }

  confirmarLane() {
    this.showLaneModal = false;
    if (this.pendingLaneNode && this.pendingLaneNode.diagram) {
      const diagram = this.pendingLaneNode.diagram;
      diagram.startTransaction('update lane text');

      let laneText = '';
      let isNew = false;

      if (this.selectedDeptId) {
        //new linea
        diagram.model.setKeyForNodeData(this.pendingLaneNode.data, this.selectedDeptId);
        const dept = this.departamentos.find(d => d.id === this.selectedDeptId);
        if (dept) laneText = dept.nombre.toUpperCase();
      } else {
        laneText = this.newDeptName.toUpperCase();
        isNew = true;
      }

      diagram.model.setDataProperty(this.pendingLaneNode.data, 'text', laneText);
      diagram.model.setDataProperty(this.pendingLaneNode.data, 'isNewDept', isNew);

      diagram.commitTransaction('update lane text');
    }
    this.pendingLaneNode = null;
  }

  public diagramModelChange(changes: go.IncrementalData) {
    if (!this.politicaId || !changes || this.isUpdatingFromFirebase) return;

    // IMPORTANTE: Convertimos el modelo a JSON y luego lo parseamos para enviar un objeto limpio a Firebase
    // Esto evita enviar referencias internas de GoJS que pueden corromper la sincronización
    if (this.diagramComponent && this.diagramComponent.diagram) {
      const jsonStr = this.diagramComponent.diagram.model.toJson();
      const jsonObj = JSON.parse(jsonStr);
      this.diagramNodeData = jsonObj.nodeDataArray || [];
      this.diagramLinkData = jsonObj.linkDataArray || [];
    }

    const docRef = doc(this.firestore, `politicas_en_vivo/${this.politicaId}`);
    setDoc(docRef, {
      nodos: this.diagramNodeData,
      links: this.diagramLinkData,
      ultimaModificacion: new Date()
    }, { merge: true });
  }

  public async publicar() {
    console.log('Iniciando proceso de publicación...');
    // Dentro de tu función publicar()
    const modeloJson = this.diagramComponent.diagram.model.toJson();
    console.log("JSON COMPLETO:", modeloJson);
    const model = this.diagramComponent.diagram.model;
    const nodeData = model.nodeDataArray;
    console.log('Datos de nodos:', nodeData);
    //logica del inicio
    const inicio = nodeData.find(n => n['category'] === 'Initial');
    if (inicio && inicio['group']) {
      // 2. Buscamos la calle (el grupo) que lo contiene
      const calleResponsable = nodeData.find(n => n['key'] === inicio['group']);
      console.log('calle responsable', calleResponsable);
      if (calleResponsable) {
        const nombreDepto = calleResponsable['text'];
        const idDepto = calleResponsable['key']; // Este es el ID real de tu DB
        console.log(`LÓGICA: El proceso inicia en ${nombreDepto}.`);
        console.log(`TAREA IMPLÍCITA: Registrar al cliente (Responsable ID: ${idDepto})`);
      }

    }
    // 1. Identificar y crear lanes nuevos

    const modelData = this.diagramComponent.diagram.model.nodeDataArray;
    console.log('Analizando TODOS los nodos reales:', JSON.stringify(modelData));
    const newLanes = modelData.filter(d =>
      d['category'] === 'Lane' &&
      (d['isNewDept'] === true || d['isNewDept'] === 'true')
    );

    console.log('Lanes nuevos encontrados:', newLanes.length);

    if (newLanes.length > 0) {
      for (const lane of newLanes) {
        try {
          const req: RegistrarDepartamentoRequest = {
            nombre: lane['text'] as string,
            descripcion: 'Creado desde editor'
          };
          console.log(`Enviando a Backend: ${req.nombre}`);
          const newDept = await firstValueFrom(this.deptService.crear(req));
          // Actualizar el lane localmente
          this.diagramComponent.diagram.model.setDataProperty(lane, 'key', newDept.id);
          this.diagramComponent.diagram.model.setDataProperty(lane, 'isNewDept', false);

          console.log(`Departamento '${newDept.nombre}' registrado con ID: ${newDept.id}`);
          console.log('Departamento creado con éxito:', newDept);

        } catch (error) {
          console.error('Error al crear departamento en el backend:', error);
          alert('Error creando departamento: ' + lane['text']);
          return; // Abortar si hay error
        }
      }
      // Refrescar departamentos
      this.departamentos = await firstValueFrom(this.deptService.getDepartamentos());
    }

    // Guardar el diagrama en el backend ()
    if (this.politicaId) {
      try {
        const esquemaJson = this.diagramComponent.diagram.model.toJson();
        await firstValueFrom(this.politicaService.actualizarEsquema(this.politicaId, { esquemaJson }));
        console.log('Esquema JSON guardado en el backend exitosamente');

        // Limpiamos la sesión efímera en Firebase ya que los datos están seguros en PostgreSQL
        const docRef = doc(this.firestore, `politicas_en_vivo/${this.politicaId}`);
        await deleteDoc(docRef);
        console.log('Sesión en vivo de Firebase finalizada.');
      } catch (err) {
        console.error('Error al guardar el esquema de la política', err);
        alert('Hubo un error al guardar el diseño de la política en el servidor.');
        return;
      }
    }

    alert('Política guardada y publicada con éxito');

  }

  public enviarPromptAI() {
    if (!this.currentPrompt.trim() || this.isLoading) return;

    const userText = this.currentPrompt;
    this.chatHistory.push({ role: 'user', text: userText });
    this.currentPrompt = '';
    //this.isLoading = true;
    this.iniciarMensajesDeEspera();
    const esquemaActual = {
      nodeDataArray: this.diagramNodeData,
      linkDataArray: this.diagramLinkData
    };

    this.aiService.enviarConsulta(userText, esquemaActual).subscribe({
      next: (response) => {
        console.log("Respuesta cruda de Gemma:", response);
        const rawOutput = response.response;

        if (!rawOutput) {
          console.warn("La IA devolvió una respuesta vacía.");
          this.chatHistory.push({ role: 'bot', text: "Lo siento, no pude generar una respuesta. Intenta de nuevo." });
          //this.isLoading = false;
          this.detenerMensajesDeEspera();
          this.cdr.detectChanges();
          return;
        }

        // 1. Extraer texto (buscamos entre etiquetas o simplemente lo que esté antes del JSON)
        const textoMatch = rawOutput.match(/<texto>([\s\S]*?)<\/texto>/);
        const textoChat = textoMatch ? textoMatch[1] : "Procesando cambios...";
        this.chatHistory.push({ role: 'bot', text: textoChat });

        // 2. Extraer JSON de forma inteligente (maneja <json> o bloques ```json)
        let jsonStr = '';

        // Intento 1: Buscar entre etiquetas <json>
        const matchTag = rawOutput.match(/<json>([\s\S]*?)<\/json>/);
        // Intento 2: Buscar entre bloques de Markdown ```json
        const matchMarkdown = rawOutput.match(/```json\s*([\s\S]*?)\s*```/);

        if (matchTag) {
          jsonStr = matchTag[1];
        } else if (matchMarkdown) {
          jsonStr = matchMarkdown[1];
        } else {
          // Intento 3: Buscar el primer '{' y el último '}'
          const firstBrace = rawOutput.indexOf('{');
          const lastBrace = rawOutput.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            jsonStr = rawOutput.substring(firstBrace, lastBrace + 1);
          }
        }

        if (jsonStr) {
          try {
            const nuevoEsquema = JSON.parse(jsonStr.trim());
            console.log("Esquema extraído con éxito:", nuevoEsquema);
            this.aplicarYNotificar(nuevoEsquema);
          } catch (e) {
            console.error("Error al parsear el JSON de la IA:", e);
            console.log("Contenido que falló:", jsonStr);
            this.chatHistory.push({ role: 'bot', text: "Error: El formato de respuesta de la IA no es un JSON válido." });
          }
        } else {
          console.warn("No se encontró JSON en la respuesta de la IA.");
        }

        //this.isLoading = false;
        this.detenerMensajesDeEspera();
        this.scrollToBottom();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error en enviarPromptAI:", err);
        this.chatHistory.push({ role: 'bot', text: "Error de conexión con el servidor de IA (OpenRouter). Revisa la consola (F12)" });
        //this.isLoading = false;
        this.detenerMensajesDeEspera();
        this.cdr.detectChanges();
      }
    });
  }

  private aplicarYNotificar(nuevoEsquema: any) {

    // VIGILANTE DE LA IA: Validar los Lanes antes de dibujarlos
    if (nuevoEsquema && nuevoEsquema.nodeDataArray) {
      nuevoEsquema.nodeDataArray.forEach((node: any) => {
        if (node.category === 'Lane') {
          const nodeText = (node.text || '').trim().toUpperCase();

          // Buscamos si la IA usó un departamento que ya existe
          const existingDept = this.departamentos.find(d => d.nombre.toUpperCase() === nodeText);

          if (existingDept) {
            // Si ya existe, le inyectamos el ID real de la BD
            node.key = existingDept.id;
            node.isNewDept = false;
          } else {
            // Si la IA inventó un departamento nuevo, lo marcamos para crearlo al publicar
            node.isNewDept = true;
          }
        }
      });
    }
    // 1. Actualizamos el diagrama localmente
    this.diagramNodeData = nuevoEsquema.nodeDataArray;
    this.diagramLinkData = nuevoEsquema.linkDataArray;

    // 2. IMPORTANTE: Guardamos en el backend para sincronizar la sala
    // Esto disparará tu lógica de Firebase/SSE que ya tienes implementada
    this.politicaService.actualizarEsquema(this.politicaId!, nuevoEsquema).subscribe({
      next: () => {
        console.log("Sincronización enviada a la sala.");
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error sincronizando IA:", err)
        this.chatHistory.push({ role: 'bot', text: "Error: No se pudo sincronizar el esquema." });
        this.cdr.detectChanges();
      }
    });
  }

  // ── Panel de propiedades ──────────────────────────────────────────────────

  tienePermisoEdit(accion: string): boolean {
    return this.editPermisos.includes(accion);
  }

  togglePermiso(accion: string): void {
    if (!this.nodoSeleccionado || !this.diagramComponent?.diagram) return;

    const idx = this.editPermisos.indexOf(accion);
    if (idx >= 0) {
      this.editPermisos.splice(idx, 1);
    } else {
      this.editPermisos.push(accion);
    }
    const nuevos = [...this.editPermisos];

    this.diagramComponent.diagram.startTransaction('update permisos');
    this.diagramComponent.diagram.model.setDataProperty(
      this.nodoSeleccionado, 'accionesPermitidas', nuevos
    );
    this.diagramComponent.diagram.commitTransaction('update permisos');

    this.cdr.detectChanges();
  }

  cerrarPanelPropiedades(): void {
    this.nodoSeleccionado = null;
    this.editPermisos = [];
  }

  // ─────────────────────────────────────────────────────────────────────────

  private iniciarMensajesDeEspera() {
    this.isLoading = true;
    let index = 0;
    this.currentLoadingMessage = this.loadingMessages[0];

    this.loadingInterval = setInterval(() => {
      index++;
      if (index < this.loadingMessages.length) {
        this.currentLoadingMessage = this.loadingMessages[index];
        // Forzamos la actualización de la vista de Angular
        this.cdr.detectChanges();
      }
    }, 2500);
  }

  private detenerMensajesDeEspera() {
    this.isLoading = false;
    this.currentLoadingMessage = '';
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      const container = document.querySelector('.ai-messages');
      if (container) container.scrollTop = container.scrollHeight;
    }, 100);
  }

}
