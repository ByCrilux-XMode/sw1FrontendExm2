import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class AiService {
    private http = inject(HttpClient);
    // URL por defecto de Ollama
    private readonly OLLAMA_URL = 'https://jeffry-sorriest-benny.ngrok-free.dev/api/generate';

    enviarConsulta(prompt: string, esquemaActual: any): Observable<any> {

        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        });

        const systemInstruction = `
      Eres un arquitecto de software experto en GoJS.
      Recibirás un esquema JSON de un diagrama de flujo y una instrucción del usuario.
      Tu respuesta DEBE tener este formato exacto:
      <texto>Tu comentario breve para el chat</texto>
      <json>El objeto JSON completo y actualizado para el diagrama</json>
      Solo puedes usar estas CATEGORÍAS exactas para los nodos:
      1. "Initial": Es el círculo negro de inicio. (Propiedad 'text' opcional).
      2. "Activity": Rectángulo para tareas. REQUIERE un array 'tasks': [{"nombre": "...", "tipo": "TEXTO"}].
      3. "Conditional": Diamante de decisión. REQUIERE 'tipoValidacion': 'MANUAL' o 'SISTEMA'.
      4. "Lane": El carril/contenedor. REQUIERE 'isGroup': true.
      5. "Final": Círculo rojo de fin de proceso.
      6. "Merge": Diamante de fusión de caminos.

      Reglas:
      1. El JSON debe ser un GraphLinksModel válido de GoJS.
      2. No añadas explicaciones fuera de las etiquetas.
      3. Si el usuario pide añadir un nodo, inventa una "key" única negativa (ej: -100).
      4. Para el inicio usa SIEMPRE category: "Initial" (NO "start").
      5. Si vas a meter un nodo dentro de un carril (Lane), añade la propiedad "group": "key_del_lane". 
    `;

        const fullPrompt = `Esquema actual: ${JSON.stringify(esquemaActual)}\n\nInstrucción: ${prompt}`;

        return this.http.post<any>(this.OLLAMA_URL, {
            model: 'gemma3:12b',
            prompt: fullPrompt,
            system: systemInstruction,
            stream: false
        }, { headers: headers });
    }
}