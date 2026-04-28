export interface InvitacionRequestDTO {
    politicaId: string;
    usuarioId: string;
    rolColaborador: string; // 'EDITOR' o 'LECTOR'
}

export interface ColaboracionResponseDTO {
    id: string;
    politicaId: string;
    usuarioId: string;
    emailInvitado: string;
    rolColaborador: string;
    fechaInvitacion: string;
}