import * as go from 'gojs';

export class DiagramConfig {
    private $ = go.GraphObject.make;

    // diagram-config.ts (Asegúrate de que el método Lane esté así)
    public getGroupTemplateMap(): go.Map<string, go.Group> {
        const map = new go.Map<string, go.Group>();
        map.add('Lane',
            this.$(go.Group, 'Spot',
                {
                    selectionObjectName: 'MAIN_SHAPE',
                    resizable: true,
                    resizeObjectName: 'MAIN_SHAPE',
                    ungroupable: true,
                    computesBoundsAfterDrag: true,
                    layout: this.$(go.LayeredDigraphLayout, {
                        direction: 0,          // 0 = Flujo de izquierda a derecha
                        layerSpacing: 80,      // Espacio horizontal entre tareas
                        columnSpacing: 40,     // Espacio vertical si hay tareas en paralelo
                        isOngoing: false        // Fuerza a que se reordene cuando la IA inyecta datos
                    }),
                    handlesDragDropForMembers: true,
                    mouseDrop: (e, grp) => {
                        const ok = (grp as go.Group).addMembers(e.diagram.selection, true);
                        if (!ok) e.diagram.currentTool.doCancel();
                    }
                },
                new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
                this.$(go.Shape, 'Rectangle',
                    {
                        name: 'MAIN_SHAPE',
                        fill: 'white', stroke: '#1a1a2e', strokeWidth: 2,
                        minSize: new go.Size(200, 100)
                    },
                    new go.Binding('desiredSize', 'size', go.Size.parse).makeTwoWay(go.Size.stringify)
                ),
                this.$(go.Panel, 'Vertical',
                    { alignment: go.Spot.TopLeft, alignmentFocus: go.Spot.TopLeft },
                    this.$(go.TextBlock, { font: 'bold 12pt sans-serif', margin: 10, editable: true, stroke: '#1a1a2e' },
                        new go.Binding('text').makeTwoWay())
                )
            )
        );
        return map;
    }

    // Extraemos la lógica de creación de puertos para reutilizarla
    public makePort(name: string, spot: go.Spot) {
        return this.$(go.Shape, 'Circle', {
            fill: 'transparent', stroke: 'transparent',
            desiredSize: new go.Size(14, 14),
            portId: name,
            alignment: spot,
            fromLinkable: true, toLinkable: true,
            fromSpot: spot, toSpot: spot,
            cursor: 'pointer',
            mouseEnter: (_e: any, port: any) => { port.fill = '#4CAF50'; port.stroke = '#4CAF50'; },
            mouseLeave: (_e: any, port: any) => { port.fill = 'transparent'; port.stroke = 'transparent'; }
        });
    }

    // Definición de la flecha (Link Template)
    public getLinkTemplate(): go.Link {
        return this.$(go.Link,
            { routing: go.Link.AvoidsNodes, curve: go.Link.JumpOver, corner: 6, relinkableFrom: true, relinkableTo: true, reshapable: true, toShortLength: 5 },
            this.$(go.Shape, { strokeWidth: 5, stroke: '#333' }),
            this.$(go.Shape, { toArrow: 'Standard', fill: '#333', stroke: null, scale: 2.2 }),
            this.$(go.Panel, "Auto",
                this.$(go.Shape, "RoundedRectangle", { fill: "white", stroke: null, opacity: 0.8 }),
                this.$(go.TextBlock, "...", { font: 'bold 12pt sans-serif', stroke: '#333', margin: 10, editable: true },
                    new go.Binding("text").makeTwoWay())
            )
        );
    }

    // Método para obtener todos los nodos (Node Template Map)
    public getNodeTemplateMap(): go.Map<string, go.Node> {
        const map = new go.Map<string, go.Node>();

        map.add('Initial',
            this.$(go.Node, 'Vertical', // Cambiamos a Vertical para poner texto abajo
                {
                    locationSpot: go.Spot.Center,
                    resizable: false, // El inicio suele ser de tamaño fijo por estándar
                },
                new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
                this.$(go.Panel, 'Spot',
                    this.$(go.Shape, 'Circle',
                        {
                            fill: '#1a1a2e', stroke: '#4fc3f7', strokeWidth: 2,
                            width: 30, height: 30
                        }
                    ),
                    this.makePort('T', go.Spot.Top), this.makePort('R', go.Spot.Right),
                    this.makePort('B', go.Spot.Bottom), this.makePort('L', go.Spot.Left)
                ),
                this.$(go.TextBlock, "INICIO",
                    {
                        margin: new go.Margin(5, 0, 0, 0),
                        font: 'bold 8pt sans-serif',
                        stroke: '#1a1a2e'
                    }
                )
            )
        );

        // Helper: indicador visual de permiso (solo lectura — la edición es en el panel lateral)
        const makePermisoToggle = (accion: string) => {
            return this.$(go.Panel, 'Auto',
                { margin: new go.Margin(0, 3, 0, 0) },
                this.$(go.Shape, 'RoundedRectangle',
                    { parameter1: 3, strokeWidth: 1 },
                    new go.Binding('fill', 'accionesPermitidas', (arr: string[]) =>
                        arr && arr.includes(accion) ? '#1b5e20' : '#37474f'),
                    new go.Binding('stroke', 'accionesPermitidas', (arr: string[]) =>
                        arr && arr.includes(accion) ? '#69f0ae' : '#607d8b')
                ),
                this.$(go.TextBlock, accion,
                    { font: '7pt sans-serif', margin: new go.Margin(2, 5), stroke: '#ffffff' }
                )
            );
        };

        map.add('Activity',
            this.$(go.Node, 'Spot',
                { locationSpot: go.Spot.Center, resizable: true, resizeObjectName: 'SHAPE_ACT' },
                new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
                // Binding bidireccional para persistir accionesPermitidas en el JSON
                new go.Binding('accionesPermitidas', 'accionesPermitidas').makeTwoWay(),
                // Forma principal
                this.$(go.Shape, 'RoundedRectangle', {
                    name: 'SHAPE_ACT',
                    fill: '#16213e', stroke: '#4fc3f7', strokeWidth: 2,
                    parameter1: 10, minSize: new go.Size(200, 150)
                }, new go.Binding('desiredSize', 'size', go.Size.parse).makeTwoWay(go.Size.stringify)),

                this.$(go.Panel, 'Vertical',
                    { margin: 10, defaultAlignment: go.Spot.Left },

                    // TÍTULO DE LA ACTIVIDAD
                    this.$(go.TextBlock, {
                        stroke: '#4fc3f7', font: 'bold 12pt sans-serif',
                        margin: new go.Margin(0, 0, 8, 0), editable: true
                    }, new go.Binding('text').makeTwoWay()),

                    // ENCABEZADOS (Estáticos)
                    this.$(go.Panel, 'Horizontal',
                        { defaultAlignment: go.Spot.Left },
                        this.$(go.TextBlock, "Tarea", { stroke: '#9fa8da', font: 'bold 8pt sans-serif', width: 100 }),
                        this.$(go.TextBlock, "Tipo de Entrada", { stroke: '#9fa8da', font: 'bold 8pt sans-serif', width: 90 })
                    ),

                    // LISTA DINÁMICA DE TAREAS
                    this.$(go.Panel, 'Vertical', {
                        name: 'LISTA_TAREAS',
                        itemTemplate: this.$(go.Panel, 'Horizontal',
                            { margin: new go.Margin(2, 0) },
                            this.$(go.TextBlock, {
                                stroke: '#e0e0e0', font: '9pt sans-serif', width: 100,
                                editable: true, isMultiline: false
                            }, new go.Binding('text', 'nombre').makeTwoWay()),
                            this.$(go.TextBlock,
                                {
                                    name: "TIPO_TEXT",
                                    stroke: '#ffca28', font: 'bold 9pt sans-serif', width: 100,
                                    editable: false, isMultiline: false, cursor: "pointer",
                                    click: (e: go.InputEvent, obj: go.GraphObject) => {
                                        const choices = ["TEXTO", "NUMERO", "FECHA", "IMAGEN", "DOCUMENTO", "CHECKBOX"];
                                        const panel = obj.panel;
                                        if (!panel) return;
                                        const taskData = panel.data;
                                        if (!taskData) return;
                                        const current = taskData.tipo || "TEXTO";
                                        const nextIndex = (choices.indexOf(current) + 1) % choices.length;
                                        e.diagram.startTransaction("change tipo");
                                        e.diagram.model.setDataProperty(taskData, "tipo", choices[nextIndex]);
                                        e.diagram.commitTransaction("change tipo");
                                    },
                                },
                                new go.Binding('text', 'tipo').makeTwoWay()
                            )
                        )
                    }, new go.Binding('itemArray', 'tasks')),

                    // BOTÓN PARA AGREGAR TAREA
                    this.$('Button',
                        {
                            margin: new go.Margin(8, 0, 0, 0),
                            click: (e, obj) => {
                                const node = obj.part;
                                if (node) {
                                    const tasks = node.data.tasks || [];
                                    e.diagram.startTransaction("add tarea");
                                    e.diagram.model.insertArrayItem(tasks, -1, { nombre: "Nueva tarea", tipo: "TEXTO" });
                                    e.diagram.commitTransaction("add tarea");
                                }
                            }
                        },
                        this.$(go.TextBlock, "+ Agregar Tarea", { font: "8pt sans-serif", margin: 4 })
                    ),

                    // BOTÓN PARA ELIMINAR TAREA
                    this.$('Button',
                        {
                            margin: new go.Margin(4, 0, 0, 0),
                            click: (e, obj) => {
                                const node = obj.part;
                                if (node) {
                                    const tasks = node.data.tasks || [];
                                    e.diagram.startTransaction("delete tarea");
                                    e.diagram.model.removeArrayItem(tasks, -1);
                                    e.diagram.commitTransaction("delete tarea");
                                }
                            }
                        },
                        this.$(go.TextBlock, "- Eliminar Tarea", { font: "8pt sans-serif", margin: 4 })
                    ),

                    // ── SECCIÓN DE PERMISOS ──────────────────────────────────
                    this.$(go.Panel, 'Vertical',
                        { defaultAlignment: go.Spot.Left, margin: new go.Margin(8, 0, 0, 0) },
                        this.$(go.TextBlock, "Permisos de archivo:",
                            { stroke: '#9fa8da', font: 'bold 7pt sans-serif', margin: new go.Margin(0, 0, 4, 0) }
                        ),
                        this.$(go.Panel, 'Horizontal',
                            makePermisoToggle('abrir'),
                            makePermisoToggle('descargar'),
                            makePermisoToggle('editar')
                        )
                    )
                ),

                // Puertos
                this.makePort('T', go.Spot.Top), this.makePort('R', go.Spot.Right),
                this.makePort('B', go.Spot.Bottom), this.makePort('L', go.Spot.Left)
            )
        );

        // En diagram-config.ts

        map.add('Conditional',
            this.$(go.Node, 'Spot',
                {
                    locationSpot: go.Spot.Center,
                    resizable: true,
                    resizeObjectName: 'SHAPE_CON'
                },
                new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
                // DIAMANTE: El color de fondo cambiará según el tipo de validación
                this.$(go.Shape, 'Diamond',
                    {
                        name: 'SHAPE_CON',
                        stroke: '#ffca28',
                        strokeWidth: 2,
                        width: 85, height: 85
                    },
                    // Vinculamos el color: Amarillo suave para Manual, Cyan para Sistema
                    new go.Binding('fill', 'tipoValidacion', (v) => v === 'SISTEMA' ? '#e0f7fa' : '#fff9c4'),
                    new go.Binding('desiredSize', 'size', go.Size.parse).makeTwoWay(go.Size.stringify)
                ),

                this.$(go.Panel, 'Vertical',
                    // PREGUNTA O TÍTULO
                    this.$(go.TextBlock,
                        {
                            font: 'bold 9pt sans-serif', stroke: '#1a1a2e',
                            editable: true, textAlign: 'center',
                            wrap: go.TextBlock.WrapFit, width: 60, margin: 2
                        },
                        new go.Binding('text').makeTwoWay()
                    ),

                    // ETIQUETA DE LÓGICA (MANUAL / SISTEMA)
                    this.$(go.TextBlock,
                        {
                            font: 'bold 7pt sans-serif',
                            stroke: '#ef6c00',
                            cursor: 'pointer',
                            toolTip: this.$(go.Adornment, 'Auto',
                                this.$(go.Shape, { fill: '#FFFFCC' }),
                                this.$(go.TextBlock, 'Click para cambiar lógica', { margin: 4 })
                            ),
                            // LÓGICA DE INTERACCIÓN
                            click: (e, obj) => {
                                const choices = ["MANUAL", "SISTEMA"];
                                const data = obj.part?.data;
                                if (data) {
                                    const current = data.tipoValidacion || "MANUAL";
                                    const next = choices[(choices.indexOf(current) + 1) % choices.length];
                                    // Actualiza el modelo para que el Backend sepa qué hacer
                                    e.diagram.startTransaction("change tipo validacion");
                                    e.diagram.model.setDataProperty(data, "tipoValidacion", next);
                                    e.diagram.commitTransaction("change tipo validacion");
                                }
                            }
                        },
                        new go.Binding('text', 'tipoValidacion', (v) => `[${v || 'MANUAL'}]`)
                    )
                ),

                // Puertos estrictos: T (Entrada), L/R (Decisiones Sí/No)
                this.makePort('T', go.Spot.Top),
                this.makePort('B', go.Spot.Bottom),
                this.makePort('L', go.Spot.Left),
                this.makePort('R', go.Spot.Right)
            )
        );

        map.add('Final',
            this.$(go.Node, 'Spot',
                {
                    locationSpot: go.Spot.Center,
                    resizable: true,              // Habilita los tiradores de redimensión
                    resizeObjectName: 'SHAPE_FINAL' // Indica que el círculo exterior es el que se estira
                },
                new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
                this.$(go.Shape, 'Circle',
                    {
                        name: 'SHAPE_FINAL',        // Debe coincidir con resizeObjectName
                        fill: '#ffffff',
                        stroke: '#1a1a2e',
                        strokeWidth: 6,
                        width: 28,
                        height: 28,
                        minSize: new go.Size(10, 10)
                    },
                    // Vincula el tamaño con la propiedad 'size' del JSON
                    new go.Binding('desiredSize', 'size', go.Size.parse).makeTwoWay(go.Size.stringify)
                ),
                this.$(go.Shape, 'Circle',
                    {
                        fill: '#1a1a2e',
                        stroke: null,
                        width: 14,
                        height: 14,
                        alignment: go.Spot.Center
                    },
                    // Opcional: Vincula el círculo interno para que crezca proporcionalmente al externo
                    new go.Binding('width', 'size', (s: string) => go.Size.parse(s).width / 2),
                    new go.Binding('height', 'size', (s: string) => go.Size.parse(s).height / 2)
                ),
                this.makePort('T', go.Spot.Top),
                this.$(go.TextBlock, "FINALIZAR",
                    {
                        margin: new go.Margin(5, 0, 0, 0),
                        font: 'bold 9pt sans-serif',
                        stroke: '#1a1a2e',
                        alignment: go.Spot.BottomCenter,
                    }
                )
            )
        );

        map.add('FlowFinal',
            this.$(go.Node, 'Spot',
                {
                    locationSpot: go.Spot.Center,
                    resizable: true,
                    resizeObjectName: 'SHAPE_FLOWFINAL'
                },
                new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
                this.$(go.Shape, 'Circle',
                    {
                        name: 'SHAPE_FLOWFINAL',
                        fill: '#ffffff',
                        stroke: '#c0392b',
                        strokeWidth: 2.5,
                        width: 28,
                        height: 28,
                        minSize: new go.Size(15, 15) // Tamaño mínimo para que no desaparezca
                    },
                    // Vincula el tamaño del círculo al JSON
                    new go.Binding('desiredSize', 'size', go.Size.parse).makeTwoWay(go.Size.stringify)
                ),
                this.$(go.Shape, 'XLine',
                    {
                        stroke: '#c0392b',
                        strokeWidth: 2.5,
                        width: 14,
                        height: 14,
                        alignment: go.Spot.Center
                    },
                    // NUEVO: Hace que la "X" siempre sea la mitad del tamaño del círculo
                    new go.Binding('width', 'size', (s: string) => go.Size.parse(s).width / 2),
                    new go.Binding('height', 'size', (s: string) => go.Size.parse(s).height / 2)
                ),
                this.makePort('T', go.Spot.Top)
            )
        );

        map.add('ForkJoin',
            this.$(go.Node, 'Spot',
                {
                    locationSpot: go.Spot.Center,
                    resizable: true,                // 1. Habilitar redimensión
                    resizeObjectName: 'SHAPE_FORK'  // 2. Apuntar a la barra principal
                },
                new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
                this.$(go.Shape, 'Rectangle',
                    {
                        name: 'SHAPE_FORK',           // Debe coincidir con resizeObjectName
                        fill: '#1a1a2e',
                        stroke: null,
                        width: 100,
                        height: 8,
                        minSize: new go.Size(20, 4)   // Evita que la barra desaparezca si se achica mucho
                    },
                    // 3. Vincular el tamaño estirado con el JSON
                    new go.Binding('desiredSize', 'size', go.Size.parse).makeTwoWay(go.Size.stringify)
                ),
                // Los puertos se mantendrán centrados en los bordes de la barra estirada
                this.makePort('T', go.Spot.TopCenter),
                this.makePort('R', go.Spot.Right),
                this.makePort('B', go.Spot.BottomCenter),
                this.makePort('L', go.Spot.Left)
            )
        );

        map.add('Merge',
            this.$(go.Node, 'Spot',
                {
                    locationSpot: go.Spot.Center,
                    resizable: true,
                    resizeObjectName: 'SHAPE_MERGE'
                },
                new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
                this.$(go.Shape, 'Diamond',
                    {
                        name: 'SHAPE_MERGE',
                        fill: '#ffffff',
                        stroke: '#1a1a2e',
                        strokeWidth: 2,
                        width: 52,
                        height: 52,
                        minSize: new go.Size(20, 20)
                    },
                    // Guarda el tamaño en el JSON
                    new go.Binding('desiredSize', 'size', go.Size.parse).makeTwoWay(go.Size.stringify)
                ),
                // Los puertos se mantienen en las puntas del diamante
                this.makePort('T', go.Spot.Top),
                this.makePort('R', go.Spot.Right),
                this.makePort('B', go.Spot.Bottom),
                this.makePort('L', go.Spot.Left)
            )
        );

        // CONNECTOR (dummy para drag&drop)
        map.add('Connector',
            this.$(go.Node, 'Spot', { locationSpot: go.Spot.Center },
                new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
                this.$(go.Shape, { geometryString: "M0 0 L50 0", stroke: '#333', strokeWidth: 2 }),
                this.$(go.Shape, { geometryString: "M45 -5 L50 0 L45 5", stroke: '#333', strokeWidth: 2 }),
                this.makePort('L', go.Spot.Left), this.makePort('R', go.Spot.Right)
            )
        );
        // Agregas aquí el resto: Activity, Conditional, Merge, Final, FlowFinal, ForkJoin
        return map;
    }
}