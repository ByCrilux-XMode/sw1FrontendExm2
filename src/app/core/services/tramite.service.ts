import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TramiteResponseDTO, RegistrarTramiteRequestDTO } from '../../data/interfaces/tramite.interface';

@Injectable({
    providedIn: 'root'
})
export class TramiteService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/tramite`;

    // Obtener todos los trámites (para la bandeja)
    getAll(): Observable<TramiteResponseDTO[]> {
        return this.http.get<TramiteResponseDTO[]>(this.apiUrl);
    }

    // Obtener el detalle de un trámite específico (el que necesitas ahora)
    getById(id: string): Observable<TramiteResponseDTO> {
        return this.http.get<TramiteResponseDTO>(`${this.apiUrl}/${id}`);
    }

    // Iniciar un nuevo trámite
    crear(dto: RegistrarTramiteRequestDTO): Observable<TramiteResponseDTO> {
        return this.http.post<TramiteResponseDTO>(this.apiUrl, dto);
    }

    // Eliminar trámite si es necesario
    eliminar(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}