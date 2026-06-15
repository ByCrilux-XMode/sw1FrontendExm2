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

    /**
     * Consolida el contenido del editor: el backend sube una nueva versión a S3,
     * guarda la clave anterior en el historial de MongoDB y retorna la nueva clave activa.
     *
     * POST /api/tramites/{tramiteId}/documentos/consolidar
     */
    /**
     * Restaura una versión del historial como la versión activa del documento.
     * El backend descarga el contenido antiguo de S3, lo re-sube con clave nueva
     * y actualiza el historial en MongoDB.
     *
     * POST /api/tramites/{tramiteId}/documentos/restaurar
     */
    restaurarVersion(
        tramiteId: string,
        payload: { s3KeyARestaurar: string; nombreUsuario: string; respKey?: string }
    ): Observable<{ nuevaKey: string }> {
        return this.http.post<{ nuevaKey: string }>(
            `${this.apiUrl}/${tramiteId}/documentos/restaurar`,
            payload
        );
    }

    consolidarDocumento(
        tramiteId: string,
        payload: {
            s3KeyAnterior: string;
            contenido: string;
            esDocxOriginal: boolean;
            nombreUsuario: string;
            respKey: string;
        }
    ): Observable<{ nuevaKey: string }> {
        return this.http.post<{ nuevaKey: string }>(
            `${this.apiUrl}/${tramiteId}/documentos/consolidar`,
            payload
        );
    }
}
