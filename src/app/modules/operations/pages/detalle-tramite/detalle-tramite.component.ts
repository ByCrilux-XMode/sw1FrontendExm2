import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Firestore, doc, deleteDoc } from '@angular/fire/firestore';
import { TramiteService } from '../../../../core/services/tramite.service';
import { DocumentoS3Service } from '../../../../core/services/documento-s3.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Navbar } from '../../../../shared/components/navbar/navbar';
import { TramiteResponseDTO, VersionDocumento } from '../../../../data/interfaces/tramite.interface';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-detalle-tramite',
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar],
  templateUrl: './detalle-tramite.component.html',
  styleUrls: ['./detalle-tramite.component.css']
})
export class DetalleTramiteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tramiteService = inject(TramiteService);
  private s3Service = inject(DocumentoS3Service);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private firestore = inject(Firestore);

  tramite: TramiteResponseDTO | null = null;
  loading = true;

  // ── Historial de versiones ────────────────────────────────────────────────
  mostrarHistorial = false;
  versionSeleccionada: VersionDocumento | null = null;
  /** Índice en historialOrdenado de la versión seleccionada.
   *  Se usa para resaltar solo UNA fila aunque haya claves S3 duplicadas. */
  versionSeleccionadaIdx: number | null = null;
  restaurando = false;
  previsualizandoKey: string | null = null;
  mensajeRestore: { texto: string; tipo: 'success' | 'danger' } | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    console.log('ID capturado de la URL:', id);
    if (id) {
      this.cargarDetalle(id);
    } else {
      this.loading = false;
    }
  }

  cargarDetalle(id: string) {
    this.tramiteService.getById(id).subscribe({
      next: (data) => {
        console.log('Datos recibidos del servidor:', data);//degub2
        this.tramite = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando trámite', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Descarga el documento convirtiendo de vuelta al formato original si fue
   * consolidado como .html (Word → .doc, Excel → .xlsx).
   * Para .txt y .md va por el backend y fuerza la descarga.
   * Para binarios (.docx/.xlsx originales) descarga directo via link.
   */
  async descargarDocumentoTransformado(urlS3: string, respKey: string): Promise<void> {
    if (!urlS3) return;

    // Extraer la S3 key de la URL completa
    let s3Key = urlS3;
    if (s3Key.includes('.amazonaws.com/')) {
      s3Key = s3Key.split('.amazonaws.com/')[1];
    }

    const keyLimpia = s3Key.split('?')[0].toLowerCase();
    const extActual = keyLimpia.split('.').pop() ?? '';
    const nombreBase = this.formatearNombreTarea(respKey).replace(/\s+/g, '_') || 'documento';

    try {
      if (extActual === 'html' || extActual === 'txt' || extActual === 'md') {
        // Archivos de texto: obtener contenido a través del backend (evita CORS y fuerza descarga)
        const res = await this.s3Service.obtenerContenido(s3Key).toPromise();
        const contenido = res?.contenido ?? '';

        if (extActual === 'txt') {
          saveAs(new Blob([contenido], { type: 'text/plain' }), `${nombreBase}.txt`);

        } else if (extActual === 'md') {
          saveAs(new Blob([contenido], { type: 'text/markdown' }), `${nombreBase}.md`);

        } else {
          // .html → detectar si fue xlsx o docx por el contenido y convertir
          if (this.detectarEsExcel(contenido)) {
            const tempEl = document.createElement('div');
            tempEl.innerHTML = contenido;
            const table = tempEl.querySelector('table');
            const wb = table ? XLSX.utils.table_to_book(table) : XLSX.utils.book_new();
            XLSX.writeFile(wb, `${nombreBase}.xlsx`);
          } else {
            const mhtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
                                xmlns:w="urn:schemas-microsoft-com:office:word"
                                xmlns="http://www.w3.org/TR/REC-html40">
                           <head><meta charset="utf-8"></head>
                           <body>${contenido}</body>
                          </html>`;
            saveAs(new Blob([mhtml], { type: 'application/msword' }), `${nombreBase}.doc`);
          }
        }

      } else if (extActual === 'xlsx' || extActual === 'docx' || extActual === 'doc') {
        // Binario original sin consolidar: descarga directa
        const link = document.createElement('a');
        link.href = urlS3;
        link.target = '_blank';
        link.download = s3Key.split('/').pop()?.split('?')[0] ?? `${nombreBase}.${extActual}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

      } else {
        window.open(urlS3, '_blank');
      }

    } catch (error) {
      console.error('Error al descargar documento:', error);
      window.open(urlS3, '_blank');
    }
  }

  /**
   * Detecta si el contenido HTML proviene de un Excel (SheetJS) o de un Word (mammoth).
   * SheetJS siempre genera HTML cuyo primer elemento es <table>.
   * mammoth genera HTML con <p>, <h1>, etc. como primer elemento.
   */
  private detectarEsExcel(htmlContent: string): boolean {
    const tempEl = document.createElement('div');
    tempEl.innerHTML = htmlContent.trim();
    return tempEl.firstElementChild?.tagName === 'TABLE';
  }

  // Asegúrate de que esta función sea robusta para detectar PDFs
  esPDF(valor: any): boolean {
    if (typeof valor !== 'string') return false;
    return valor.toLowerCase().endsWith('.pdf') || valor.includes('/raw/upload/');
  }
  // Función auxiliar para identificar si es una imagen
  isImagen(tipo: string): boolean {
    return tipo === 'IMAGEN' || tipo === 'FOTO';
  }

  // Función auxiliar para identificar si es un documento
  isDocumento(tipo: string): boolean {
    return tipo === 'DOCUMENTO' || tipo === 'ARCHIVO' || tipo === 'PDF';
  }

  formatearNombreTarea(key: any): string {
    // Aseguramos que sea string antes de usar .replace()
    const keyStr = String(key);
    return keyStr.replace(/n_.*_t_/, '').replace(/_/g, ' ');
  }

  isUrl(valor: any): boolean {
    return typeof valor === 'string' && (valor.startsWith('http') || valor.includes('cloudinary'));
  }

  esArchivoEditable(url: any): boolean {
    if (!url) return false;
    const ruta = url.toString().toLowerCase();
    return ruta.endsWith('.txt') || ruta.endsWith('.md') || ruta.endsWith('.docx') || ruta.endsWith('.html') || ruta.endsWith('.xlsx');
  }

  /**
   * Verifica si una acción está permitida para una tarea concreta.
   * Retrocompatible: si accionesPermitidas no existe o no tiene la clave, permite todo.
   */
  tienePermiso(tareaKey: any, accion: string): boolean {
    if (!this.tramite?.accionesPermitidas) return true;
    const permisos: string[] | undefined = this.tramite.accionesPermitidas[tareaKey];
    if (!permisos) return true; // sin restricción registrada → permitir
    return permisos.includes(accion);
  }

  abrirEditor(idTramite: string | undefined, urlS3Completa: any, respKey: string): void {
    if (!idTramite || !urlS3Completa) return;

    let s3Key = urlS3Completa.toString();
    if (s3Key.includes('.amazonaws.com/')) {
      s3Key = s3Key.split('.amazonaws.com/')[1];
    }

    this.router.navigate(['/funcionario/editor', idTramite], {
      queryParams: { key: s3Key, respKey }
    });
  }

  // ── Historial de versiones ────────────────────────────────────────────────

  /** Devuelve el historial de más reciente a más antiguo para mostrarlo en la tabla. */
  get historialOrdenado(): VersionDocumento[] {
    return [...(this.tramite?.historialVersiones ?? [])].reverse();
  }

  toggleHistorial(): void {
    this.mostrarHistorial = !this.mostrarHistorial;
    if (!this.mostrarHistorial) {
      this.versionSeleccionada = null;
      this.versionSeleccionadaIdx = null;
      this.mensajeRestore = null;
    }
  }

  previsualizarVersion(version: VersionDocumento): void {
    this.previsualizandoKey = version.s3Key;
    this.s3Service.obtenerPresignedUrl(version.s3Key).subscribe({
      next: ({ url }) => {
        this.previsualizandoKey = null;
        window.open(url, '_blank');
      },
      error: (err) => {
        console.error('Error generando URL de previsualización', err);
        this.previsualizandoKey = null;
      },
    });
  }

  pedirConfirmacion(version: VersionDocumento, idx: number): void {
    this.versionSeleccionada = version;
    this.versionSeleccionadaIdx = idx;
    this.mensajeRestore = null;
  }

  cancelarRestore(): void {
    this.versionSeleccionada = null;
    this.versionSeleccionadaIdx = null;
    this.mensajeRestore = null;
  }

  confirmarRestore(): void {
    if (!this.versionSeleccionada || !this.tramite?.id) return;

    this.restaurando = true;
    this.mensajeRestore = null;

    const nombreUsuario = this.authService.usuarioActual?.username ?? 'Desconocido';
    const keyARestaurar   = this.versionSeleccionada.s3Key;
    const tramiteId       = this.tramite.id;

    this.s3Service.restaurarVersion(tramiteId, {
      s3KeyARestaurar: keyARestaurar,
      nombreUsuario,
      respKey: this.versionSeleccionada.respKey,
    }).subscribe({
      next: () => {
        this.restaurando = false;
        this.versionSeleccionada = null;
        this.versionSeleccionadaIdx = null;

        // ── Limpiar sesión de Firestore para archivos binarios ─────────────
        // Al restaurar un binario (.docx/.xlsx) el backend reutiliza la misma
        // S3 key, lo que significa que el editor abriría la MISMA sala de
        // Firestore con contenido cacheado de ediciones anteriores.
        // Borramos esa sala para forzar carga fresca desde S3.
        const ext = keyARestaurar.split('.').pop()?.toLowerCase() ?? '';
        if (['docx', 'xlsx', 'doc'].includes(ext)) {
          const fileName = keyARestaurar.split('/').pop() ?? '';
          const salaId   = `${tramiteId}_${fileName}`;
          deleteDoc(doc(this.firestore, 'editor_en_vivo', salaId))
            .catch(e => console.warn('No se pudo limpiar sala Firestore:', e));
        }

        this.mensajeRestore = {
          texto: '¡Versión restaurada correctamente! Recargando...',
          tipo: 'success',
        };
        setTimeout(() => {
          this.mensajeRestore = null;
          this.cargarDetalle(tramiteId);
        }, 2000);
      },
      error: (err) => {
        console.error('Error al restaurar versión', err);
        this.restaurando = false;
        this.mensajeRestore = {
          texto: 'Error al restaurar la versión. Intente nuevamente.',
          tipo: 'danger',
        };
      },
    });
  }

  /** Extrae la extensión legible de la S3 key de una versión */
  extVersion(v: VersionDocumento): string {
    return v.s3Key.split('.').pop()?.toLowerCase() ?? '';
  }

  /** Clasifica si la versión es un guardado normal o un snapshot pre-restauración */
  tipoVersion(v: VersionDocumento): 'guardado' | 'pre-restore' {
    return v.nombreVersion.startsWith('Antes de restaurar') ? 'pre-restore' : 'guardado';
  }
}