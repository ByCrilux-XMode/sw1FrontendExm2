import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
export interface DesignarUsuarioRequest {
    usuarioId: string;
    departamentoId: string;
}

@Injectable({ providedIn: 'root' })
export class AsignacionService {
    private apiUrl = `${environment.apiUrl}/api/organization/designar`;

    constructor(private http: HttpClient) { }

    designar(dto: DesignarUsuarioRequest): Observable<any> {
        return this.http.post(this.apiUrl, dto);
    }

    listarPorDepartamento(deptoId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/departamento/${deptoId}`);
    }

    eliminar(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}