import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment'; // Ajusta la ruta si es necesario

@Injectable({ providedIn: 'root' })
export class AiService {
    private http = inject(HttpClient);

    // Apuntamos a tu propio backend en Spring Boot
    private readonly BACKEND_URL = `${environment.apiUrl}/api/ia/generar-diagrama`;

    enviarConsulta(prompt: string, esquemaActual: any): Observable<any> {
        console.log("Enviando consulta al Backend para OpenRouter...");

        // Mandamos los datos limpios al backend
        const payload = {
            instruccion: prompt,
            esquema: JSON.stringify(esquemaActual)
        };

        return this.http.post<any>(this.BACKEND_URL, payload).pipe(
            tap(response => console.log("Respuesta recibida del Backend:", response)),
            catchError(error => {
                console.error("Error al consultar el Backend:", error);
                return throwError(() => error);
            })
        );
    }
}