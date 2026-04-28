import { User } from './user.interface';
import { Departamento } from './departamento.interface';

// Este coincide con tu DesignarUsuarioRequestDTO del Backend
export interface DesignarUsuarioRequest {
    usuarioId: string;
    departamentoId: string;
}

// Este coincide con el modelo AsignacionDepartamento de tu Backend
export interface AsignacionDepartamento {
    id?: string;
    usuarioId: string;
    departamentoId: string;

    usuario?: User;
    departamento?: Departamento;
    fechaAsignacion?: string;
}