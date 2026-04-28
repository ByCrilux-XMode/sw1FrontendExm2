import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PoliticaResponseDTO, RegistrarPoliticaRequestDTO, ActualizarEsquemaRequestDTO } from '../../data/interfaces/politica.interface';

@Injectable({ providedIn: 'root' })
export class PoliticaService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/politica`;

    getPoliticas(): Observable<PoliticaResponseDTO[]> {
        return this.http.get<PoliticaResponseDTO[]>(this.apiUrl);
    }

    getPoliticaById(id: string): Observable<PoliticaResponseDTO> {
        return this.http.get<PoliticaResponseDTO>(`${this.apiUrl}/${id}`);
    }

    crear(dto: RegistrarPoliticaRequestDTO): Observable<PoliticaResponseDTO> {
        return this.http.post<PoliticaResponseDTO>(this.apiUrl, dto);
    }

    actualizarEsquema(id: string, dto: ActualizarEsquemaRequestDTO): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}/esquema`, dto);
    }
}
