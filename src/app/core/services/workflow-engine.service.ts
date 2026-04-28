import { Injectable } from '@angular/core';

export interface WorkflowNode {
  key: string | number;
  category?: string;
  text?: string;
  tasks?: any[];
  group?: string;
  [key: string]: any;
}

export interface WorkflowLink {
  from: string | number;
  to: string | number;
  fromPort?: string;
  toPort?: string;
  text?: string;
  key?: string | number;
}

@Injectable({
  providedIn: 'root'
})
export class WorkflowEngineService {

  constructor() { }

  /**
   * Parsea el string JSON guardado en la base de datos a un objeto JS manipulable
   */
  public parseEsquema(esquemaJson: string): { nodes: WorkflowNode[], links: WorkflowLink[] } {
    try {
      const parsed = JSON.parse(esquemaJson);
      return {
        nodes: parsed.nodeDataArray || [],
        links: parsed.linkDataArray || []
      };
    } catch (e) {
      console.error('Error parseando esquema JSON', e);
      return { nodes: [], links: [] };
    }
  }

  /**
   * Obtiene la definición completa de un nodo dado su key
   */
  public getNodoByKey(key: string | number, nodes: WorkflowNode[]): WorkflowNode | undefined {
    // Las keys en GoJS pueden ser números, es más seguro convertir a string para comparar
    return nodes.find(n => String(n.key) === String(key));
  }

  /**
   * Obtiene los enlaces que salen de un nodo específico
   */
  public getOutgoingLinks(nodeKey: string | number, links: WorkflowLink[]): WorkflowLink[] {
    return links.filter(l => String(l.from) === String(nodeKey));
  }

  /**
   * Obtiene el(los) nodo(s) siguiente(s)
   * Si es un Activity normal, sigue el enlace.
   * Si es un Conditional, requiere que se especifique qué enlace tomar (ej. "si" o "no" basado en texto o puerto).
   */
  /** Categorías que requieren acción manual de un funcionario */
  private readonly CATEGORIAS_ASIGNABLES = new Set(['Activity', 'Conditional']);

  /** Verifica si un nodo requiere intervención manual */
  public esCategoriaAsignable(categoria: string | undefined): boolean {
    return this.CATEGORIAS_ASIGNABLES.has(categoria || '');
  }

  /**
   * Dado el nodo inicial del diagrama (normalmente 'Initial'),
   * recorre el grafo hacia adelante saltando nodos automáticos
   * (Initial, ForkJoin, Merge) hasta encontrar los primeros nodos
   * que requieren acción manual (Activity, Conditional).
   * Devuelve una lista de sus keys.
   */
  public getPrimeraNodosAsignables(
    nodoInicialKey: string | number,
    nodes: WorkflowNode[],
    links: WorkflowLink[]
  ): string[] {
    const resultado: string[] = [];
    const visitados = new Set<string>();

    const recorrer = (key: string | number) => {
      const keyStr = String(key);
      if (visitados.has(keyStr)) return;
      visitados.add(keyStr);

      const nodo = this.getNodoByKey(key, nodes);
      if (!nodo) return;

      if (this.esCategoriaAsignable(nodo.category)) {
        resultado.push(keyStr);
        return; // No seguimos más allá del primer nodo asignable
      }

      // Nodo de control: avanzar automáticamente
      const salientes = this.getOutgoingLinks(key, links);
      for (const link of salientes) {
        recorrer(link.to);
      }
    };

    recorrer(nodoInicialKey);
    return resultado;
  }

  public getSiguientesNodosKeys(
    nodoActualKey: string | number,
    nodes: WorkflowNode[],
    links: WorkflowLink[],
    decisionText?: string // "si" o "no" para nodos condicionales
  ): (string | number)[] {
    
    let outgoing = this.getOutgoingLinks(nodoActualKey, links);

    // Si hay una decisión (Conditional), filtramos por el texto del enlace
    if (decisionText && outgoing.length > 1) {
      const matched = outgoing.find(l => l.text?.toLowerCase() === decisionText.toLowerCase());
      if (matched) {
        outgoing = [matched];
      }
    }

    const siguientesKeys = outgoing.map(l => l.to);

    // Si el siguiente nodo es un ForkJoin (paralelismo), avanzamos AUTOMÁTICAMENTE a todos los nodos que salen de ese ForkJoin
    let resultKeys: (string | number)[] = [];
    
    for (const key of siguientesKeys) {
      const nodo = this.getNodoByKey(key, nodes);
      if (nodo && nodo.category === 'ForkJoin') {
        // Obtenemos los que salen del ForkJoin
        const fromFork = this.getOutgoingLinks(nodo.key, links).map(l => l.to);
        resultKeys.push(...fromFork);
      } else {
        resultKeys.push(key);
      }
    }

    return resultKeys;
  }
}
