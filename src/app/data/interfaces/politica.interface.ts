export interface RegistrarPoliticaRequestDTO {
    nombre: string;
    objetivo?: string;
    version?: string;
    esquemaJson?: string;
    creadoPor?: string;
    publicado?: boolean;
}

export interface PoliticaResponseDTO {
    id: string;
    nombre: string;
    objetivo: string;
    version: string;
    esquemaJson: string;
    fechaCreacion: string;
    creadoPor: string;
    publicado: boolean;
}

export interface ActualizarEsquemaRequestDTO {
    esquemaJson: string;
}
