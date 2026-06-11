import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DocumentoS3Service {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/tramites`;

    /**
     * Obtiene el contenido de un archivo de S3 como texto plano.
     * Usado para cargar el contenido en TipTap.
     */
    obtenerContenido(s3Key: string): Observable<{ contenido: string }> {
        return this.http.get<{ contenido: string }>(
            `${this.apiUrl}/documentos/contenido`,
            { params: { key: s3Key } }
        );
    }

    /**
     * Guarda el contenido editado desde TipTap en S3.
     */
    guardarContenido(s3Key: string, contenido: string, contentType: string = 'text/plain'): Observable<{ url: string }> {
        return this.http.put<{ url: string }>(
            `${this.apiUrl}/documentos/contenido`,
            { contenido },
            { params: { key: s3Key, contentType: contentType } }
        );
    }

    /**
     * Obtiene la URL prefirmada para descarga/previsualización.
     */
    obtenerPresignedUrl(s3Key: string): Observable<{ url: string }> {
        return this.http.get<{ url: string }>(
            `${this.apiUrl}/documentos/presigned-url`,
            { params: { key: s3Key } }
        );
    }

    /**
     * Elimina un documento de S3.
     */
    eliminarDocumento(s3Key: string): Observable<void> {
        return this.http.delete<void>(
            `${this.apiUrl}/documentos`,
            { params: { key: s3Key } }
        );
    }
}
