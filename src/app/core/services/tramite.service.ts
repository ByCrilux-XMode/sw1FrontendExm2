import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TramiteResponseDTO, RegistrarTramiteRequestDTO, AdminTramite, AdminUpdateTramitePayload, PagedAdminTramite } from '../../data/interfaces/tramite.interface';

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

    // ── Admin ─────────────────────────────────────────────────────────────────

    obtenerTodosLosTramitesAdmin(
        page = 0,
        size = 20,
        estado = '',
        busqueda = ''
    ): Observable<PagedAdminTramite> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString())
            .set('estado', estado)
            .set('busqueda', busqueda);
        return this.http.get<PagedAdminTramite>(`${this.apiUrl}/admin`, { params });
    }

    actualizarTramiteAdmin(id: string, datos: AdminUpdateTramitePayload): Observable<AdminTramite> {
        return this.http.put<AdminTramite>(`${this.apiUrl}/admin/${id}`, datos);
    }
}