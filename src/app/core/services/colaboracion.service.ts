// app/core/services/colaboracion.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InvitacionRequestDTO, ColaboracionResponseDTO } from '../../data/interfaces/colaboracion.interface';

@Injectable({ providedIn: 'root' })
export class ColaboracionService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/collaboration`;
    private politicaUrl = `${environment.apiUrl}/api/politicas`; // Ajusta según tu backend

    getPoliticas(): Observable<any[]> {
        return this.http.get<any[]>(this.politicaUrl);
    }

    invitar(dto: InvitacionRequestDTO): Observable<ColaboracionResponseDTO> {
        return this.http.post<ColaboracionResponseDTO>(`${this.apiUrl}/invitar`, dto);
    }
}