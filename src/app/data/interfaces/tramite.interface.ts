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