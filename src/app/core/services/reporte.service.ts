import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ReporteResponseDTO } from '../../data/interfaces/reporte.interface';

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private http = inject(HttpClient);

  private readonly URL = `${environment.apiUrl}/api/ia/reporte-dinamico`;

  /** Envía el texto en lenguaje natural y recibe el reporte listo para graficar. */
  generarReporte(texto: string): Observable<ReporteResponseDTO> {
    return this.http.post<ReporteResponseDTO>(this.URL, { texto }).pipe(
      tap(r => console.log('Reporte recibido del backend:', r)),
      catchError(err => {
        console.error('Error al generar el reporte dinámico:', err);
        return throwError(() => err);
      })
    );
  }
}
