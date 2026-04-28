import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DepartamentoResponse, RegistrarDepartamentoRequest, DepartamentoUpdateRequest } from '../../data/interfaces/departamento.interface';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DepartamentoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/departamento`;

  getDepartamentos(): Observable<DepartamentoResponse[]> {
    return this.http.get<DepartamentoResponse[]>(this.apiUrl);
  }

  crear(data: RegistrarDepartamentoRequest): Observable<DepartamentoResponse> {
    return this.http.post<DepartamentoResponse>(this.apiUrl, data);
  }

  actualizar(data: DepartamentoUpdateRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/actualizar`, data);
  }

  eliminar(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/eliminar/${id}`, {});
  }
}