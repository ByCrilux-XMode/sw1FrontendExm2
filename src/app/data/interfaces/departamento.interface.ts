export interface DepartamentoResponse {
    id: string;
    nombre: string;
    descripcion: string;
    activo: boolean;
}

export interface RegistrarDepartamentoRequest {
    nombre: string;
    descripcion: string;
}

export interface DepartamentoUpdateRequest {
    id: string;
    nombre: string;
    descripcion: string;
    activo: boolean;
}

export interface Departamento { // <--- Asegúrate que diga 'Departamento' y tenga 'export'
    id?: string;
    nombre: string;
    descripcion?: string;
}