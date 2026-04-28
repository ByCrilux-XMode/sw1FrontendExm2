//lo que el dto del back me va a responder ListUsuarioResponseDTO
export interface UserListResponse {
  id: string;
  username: string;
  email: string;
  rol: string;
  activo: boolean;
  personaId: string;
}

export interface CambioEstadoUsuarioRequest {
  username: string;
  nuevoEstado: boolean;
}

export interface PersonaRegistroDTO {
  username: string;
  email: string;
  password: string;
  rol: string;
  //persona
  nombre: string;
  apellido: string;
  telefono: string;
  ci: string;
}

export interface User {  // <--- Asegúrate que diga 'Usuario' y tenga 'export'
  id?: string;
  username: string;
  email?: string;
  // ... tus otros campos
}