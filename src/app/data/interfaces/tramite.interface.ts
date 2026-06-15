/** Subdocumento embebido en Tramite que representa una versión histórica del documento */
export interface VersionDocumento {
    s3Key: string;
    nombreVersion: string;
    fechaGuardado: string; // ISO string del LocalDateTime de Java
    guardadoPor: string;
    /** Clave de tarea en respuestas — identifica a qué archivo pertenece esta versión */
    respKey?: string;
}

export interface DetalleTareaSeguimientoDTO {
    nombreTarea: string;
    valor: string; // Aquí vendrá la URL de Cloudinary o el texto
    tipo: string;  // IMAGEN, DOCUMENTO, TEXTO, etc.
    fechaCompletada: string;
}

export interface TramiteResponseDTO {
    id: string;
    politicaId: string;
    clienteId: string;
    estadoActual: string;
    fechaInicio: string;
    fechaFin?: string;
    nodosActualesKeys: string[];
    respuestas: { [key: string]: any };
    accionesPermitidas?: { [tareaKey: string]: string[] };
    /** Clave S3 del documento actualmente vigente */
    documentoActivoKey?: string;
    /** Versiones anteriores guardadas por el sistema de control de versiones */
    historialVersiones?: VersionDocumento[];
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

/** Respuesta paginada del endpoint GET /api/tramite/admin */
export interface PagedAdminTramite {
    content: AdminTramite[];
    totalElements: number;
    totalPages: number;
    number: number;          // página actual (0-based)
    size: number;
    first: boolean;
    last: boolean;
    numberOfElements: number;
}