export interface DetalleTareaSeguimientoDTO {
    nombreTarea: string;
    valor: string; // Aquí vendrá la URL de Cloudinary o el texto
    tipo: string;  // IMAGEN, DOCUMENTO, TEXTO, etc.
    fechaCompletada: string;
}

export interface TramiteResponseDTO {
    id: string;
    politicaId: string;
    clienteId: string; // Coincide con tu JSON
    estadoActual: string; // Coincide con tu JSON
    fechaInicio: string;
    fechaFin?: string;
    nodosActualesKeys: string[];
    // 'respuestas' es un objeto dinámico donde la clave es el ID de la tarea
    respuestas: { [key: string]: any };
}

export interface RegistrarTramiteRequestDTO {
    politicaId: string;
    personaId: string;
}

/** Vista enriquecida para la pantalla de administración global de trámites */
export interface AdminTramite {
    id: string;
    clienteId: string;
    clienteNombre: string;
    clienteEmail: string;
    politicaId: string;
    politicaNombre: string;
    estadoActual: string;
    nodosActualesKeys: string[];
    respuestas: { [key: string]: any };
    accionesPermitidas: { [tareaKey: string]: string[] };
    fechaInicio: string;
    fechaFin?: string;
}

/** Payload editable — solo estos campos viajan al PUT /admin/{id} */
export interface AdminUpdateTramitePayload {
    estadoActual?: string;
    respuestas?: { [key: string]: any };
    accionesPermitidas?: { [tareaKey: string]: string[] };
}