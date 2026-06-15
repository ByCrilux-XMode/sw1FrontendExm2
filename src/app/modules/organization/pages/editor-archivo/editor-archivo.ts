import { Component, OnInit, OnDestroy, inject, signal, ElementRef, ViewChild, AfterViewInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Firestore, doc, setDoc, getDoc, getDocs, onSnapshot, collection, deleteDoc, CollectionReference } from '@angular/fire/firestore';
import { DocumentoS3Service } from '../../../../core/services/documento-s3.service';
import { AuthService } from '../../../../core/services/auth.service';
import { firstValueFrom } from 'rxjs';

import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

/** Forma del documento de presencia en Firestore */
interface PresenciaUsuario {
  id: string;
  name: string;
  color: string;
  ts: number; // epoch ms – número plano, sin conversión de Timestamp
}

@Component({
  selector: 'app-editor-archivo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './editor-archivo.html',
  styleUrl: './editor-archivo.css'
})
export class EditorArchivoComponent implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private s3Service = inject(DocumentoS3Service);
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('editorContainer') editorRef!: ElementRef;
  editor!: Editor;

  s3Key = signal<string>('');
  documentId = signal<string>('');
  respKey = signal<string>('');    // clave de tarea en respuestas (n_X_t_Y)
  isTxtFile = signal<boolean>(false);
  isDocxFile = signal<boolean>(false);
  isXlsxFile = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  saveMessage = signal<{ text: string, type: 'success' | 'danger' } | null>(null);

  // ── Awareness (presencia de usuarios) ────────────────────────────────────
  usuariosConectados: PresenciaUsuario[] = [];
  private lastPresenceRaw: PresenciaUsuario[] = [];   // cache del último snapshot
  private readonly miColor = this.getRandomColor();
  /**
   * ID determinístico: un único documento de presencia por usuario por sala.
   * Varios tabs del mismo usuario sobrescriben el mismo documento → nunca duplicados.
   */
  private readonly presenceId: string = (() => {
    const u = this.authService.usuarioActual;
    const key = u?.userId ?? u?.username ?? `anon`;
    // Sanitizar: Firestore no permite '/' en IDs; limitar a 100 chars
    return key.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
  })();
  private presenciaDocPath?: string;
  private presenciaColRef?: CollectionReference;
  private unsubscribePresencia?: () => void;
  private heartbeatInterval?: ReturnType<typeof setInterval>;
  private refilterInterval?: ReturnType<typeof setInterval>;
  // Arrow function para poder usar removeEventListener con la misma referencia
  private readonly onBeforeUnload = () => {
    if (this.presenciaDocPath) {
      deleteDoc(doc(this.firestore, this.presenciaDocPath));
    }
  };

  private unsubscribeFirestore?: () => void;
  private isUpdatingFromFirestore = false;
  private syncTimeout?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.documentId.set(this.route.snapshot.paramMap.get('id') || '');
    this.s3Key.set(this.route.snapshot.queryParamMap.get('key') || `tramites/${this.documentId()}/documento.html`);
    this.respKey.set(this.route.snapshot.queryParamMap.get('respKey') || '');
    this.isTxtFile.set(this.s3Key().endsWith('.txt'));
    this.isDocxFile.set(this.s3Key().toLowerCase().endsWith('.docx'));
    this.isXlsxFile.set(this.s3Key().toLowerCase().endsWith('.xlsx'));
  }

  ngAfterViewInit() {
    this.editor = new Editor({
      element: this.editorRef.nativeElement,
      extensions: [
        StarterKit,
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        TextStyle,
        Color,
        Image,
      ],
    });

    // detectChanges() notifica a Angular del cambio de `editor` de forma síncrona
    // y evita el NG0100. Sin setTimeout: Firebase corre dentro del injection context.
    this.cdr.detectChanges();
    this.iniciarSesionColaborativa();
  }

  async iniciarSesionColaborativa() {
    const nombreArchivo = this.s3Key().split('/').pop() || 'documento_desconocido';
    //sala unica para el archivo
    const salaUnicaId = `${this.documentId()}_${nombreArchivo}`;
    const docRef = doc(this.firestore, 'editor_en_vivo', salaUnicaId);

    // Registrar presencia del usuario actual y escuchar a los demás
    this.iniciarPresencia(salaUnicaId);

    try {
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data()?.['contenido']) {
        // Ya hay una sesión activa en Firebase → restaurar ese estado
        this.editor.commands.setContent(snap.data()!['contenido']);
        this.isLoading.set(false);
      } else {
        // Sala vacía → cargar contenido inicial desde S3
        this.cargarDesdeS3(docRef);
      }
    } catch (e) {
      console.error('Error conectando a Firestore:', e);
      this.isLoading.set(false);
    }

    // Escuchar cambios en tiempo real de otros colaboradores
    this.unsubscribeFirestore = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) return;
      const contenidoRemoto = snap.data()?.['contenido'];
      if (contenidoRemoto && contenidoRemoto !== this.editor.getHTML()) {
        this.ngZone.run(() => {
          this.isUpdatingFromFirestore = true;
          this.editor.commands.setContent(contenidoRemoto, false);
          setTimeout(() => this.isUpdatingFromFirestore = false, 150);
        });
      }
    });

    // Propagar cambios locales a Firestore (con debounce)
    this.editor.on('update', () => {
      if (this.isUpdatingFromFirestore) return;
      if (this.syncTimeout) clearTimeout(this.syncTimeout);
      this.syncTimeout = setTimeout(() => {
        const contenido = this.isTxtFile() ? this.editor.getText() : this.editor.getHTML();
        setDoc(docRef, { contenido, ultimaModificacion: new Date() }, { merge: true });
      }, 300);
    });

  }

  private cargarDesdeS3(docRef: any) {
    if (this.isDocxFile()) {
      // .docx: obtener URL prefirmada → descargar binario → convertir con Mammoth
      this.s3Service.obtenerPresignedUrl(this.s3Key()).subscribe({
        next: ({ url }) => {
          this.http.get(url, { responseType: 'arraybuffer' }).subscribe({
            next: async (buffer: ArrayBuffer) => {
              try {
                const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
                const htmlContent = result.value;
                this.editor.commands.setContent(htmlContent);
                setDoc(docRef, { contenido: htmlContent, ultimaModificacion: new Date() });
              } catch (error) {
                console.error('Error al parsear el documento Word:', error);
              }
              this.isLoading.set(false);
            },
            error: (err) => {
              console.warn('Error descargando .docx desde S3:', err);
              this.isLoading.set(false);
            }
          });
        },
        error: (err) => {
          console.warn('Error obteniendo URL prefirmada:', err);
          this.isLoading.set(false);
        }
      });
    } else if (this.isXlsxFile()) {
      // .xlsx: obtener URL prefirmada → descargar binario → convertir con SheetJS
      this.s3Service.obtenerPresignedUrl(this.s3Key()).subscribe({
        next: ({ url }) => {
          this.http.get(url, { responseType: 'arraybuffer' }).subscribe({
            next: (buffer: ArrayBuffer) => {
              try {
                const workbook = XLSX.read(buffer, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const htmlContent = XLSX.utils.sheet_to_html(worksheet);
                this.editor.commands.setContent(htmlContent);
                setDoc(docRef, { contenido: htmlContent, ultimaModificacion: new Date() });
              } catch (error) {
                console.error('Error al parsear el Excel:', error);
              }
              this.isLoading.set(false);
            },
            error: (err) => {
              console.warn('Error descargando .xlsx desde S3:', err);
              this.isLoading.set(false);
            }
          });
        },
        error: (err) => {
          console.warn('Error obteniendo URL prefirmada para .xlsx:', err);
          this.isLoading.set(false);
        }
      });
    } else {
      // .txt / .md / .html: texto plano directo
      this.s3Service.obtenerContenido(this.s3Key()).subscribe({
        next: (res) => {
          if (res.contenido) {
            this.editor.commands.setContent(res.contenido);
            setDoc(docRef, { contenido: res.contenido, ultimaModificacion: new Date() });
          }
          this.isLoading.set(false);
        },
        error: (err) => {
          console.warn('Archivo nuevo o vacío en S3, iniciando lienzo limpio.', err);
          this.isLoading.set(false);
        }
      });
    }
  }

  guardar() {
    this.isSaving.set(true);
    this.saveMessage.set(null);

    // Exportar el contenido del editor según el tipo de archivo
    const contenido = this.isTxtFile() ? this.editor.getText() : this.editor.getHTML();
    const nombreUsuario = this.authService.usuarioActual?.username ?? 'Desconocido';

    // Delegar al backend: subir nueva versión a S3 + actualizar historial en MongoDB.
    // La clave anterior (vigente hasta ahora) se envía para que quede registrada en el historial.
    this.s3Service.consolidarDocumento(this.documentId(), {
      s3KeyAnterior: this.s3Key(),
      contenido,
      esDocxOriginal: this.isDocxFile() || this.isXlsxFile(),
      nombreUsuario,
      respKey: this.respKey(),
    }).subscribe({
      next: (res) => {
        // CRÍTICO: actualizar la señal con la nueva clave para que
        // consolidaciones sucesivas en la misma sesión pasen la clave correcta.
        this.s3Key.set(res.nuevaKey);
        this.isSaving.set(false);
        this.saveMessage.set({ text: 'Versión consolidada y guardada correctamente', type: 'success' });
        setTimeout(() => this.saveMessage.set(null), 3000);
      },
      error: (err) => {
        console.error('Error al consolidar versión', err);
        this.isSaving.set(false);
        this.saveMessage.set({ text: 'Error al consolidar la versión en el servidor', type: 'danger' });
      }
    });
  }

  volver() {
    this.router.navigate(['/funcionario/dashboard']);
  }

  // ── Awareness ─────────────────────────────────────────────────────────────

  /**
   * Escribe la presencia del usuario en Firestore y escucha la de los demás.
   * Usa un heartbeat cada 10s para que el icono desaparezca al cerrar la pestaña.
   */
  private iniciarPresencia(salaUnicaId: string): void {
    const nombreUsuario = this.authService.usuarioActual?.username ?? 'Invitado';
    const presenciaPath = `presencia_en_vivo/${salaUnicaId}/usuarios`;
    this.presenciaDocPath = `${presenciaPath}/${this.presenceId}`;

    this.presenciaColRef = collection(this.firestore, presenciaPath);
    const miPresenciaRef = doc(this.firestore, this.presenciaDocPath);

    // Escribir presencia inicial al entrar
    setDoc(miPresenciaRef, {
      id: this.presenceId,
      name: nombreUsuario,
      color: this.miColor,
      ts: Date.now(),
    }).catch(err => console.error('[Awareness] Error escribiendo presencia:', err));

    // Heartbeat (Latido) cada 15 segundos para mantener vivo el avatar
    this.heartbeatInterval = setInterval(() => {
      setDoc(miPresenciaRef, { ts: Date.now() }, { merge: true })
        .catch(err => console.error('[Awareness] Error en heartbeat:', err));
    }, 15_000);

    // Escuchar cambios de TODO el mundo en tiempo real
    this.unsubscribePresencia = onSnapshot(this.presenciaColRef, (snap) => {
      this.lastPresenceRaw = snap.docs.map(d => d.data() as PresenciaUsuario);
      this.filtrarPresencia();
    });

    // Limpiar presencia propia al cerrar la pestaña
    window.addEventListener('beforeunload', this.onBeforeUnload);
  }

  /**
   * Aplica el filtro de presencia sobre el último snapshot guardado.
   * Solo incluye documentos con campo `ts` numérico y heartbeat < 30 s.
   * Documentos en formato antiguo (sin `ts`) quedan automáticamente excluidos.
   */
  private filtrarPresencia(): void {
    const ahora = Date.now();
    this.ngZone.run(() => {
      this.usuariosConectados = this.lastPresenceRaw.filter(u => {
        // SOLUCIÓN 1: Usar Math.abs() para protegerse contra relojes adelantados/atrasados.
        // SOLUCIÓN 2: Aumentar la tolerancia a 120_000 ms (2 min) para evitar desconexiones por lag.
        return !!u.ts && Math.abs(ahora - u.ts) < 120_000;
      });

      // SOLUCIÓN 3: Forzar a Angular a dibujar el nuevo círculo en el HTML inmediatamente
      this.cdr.detectChanges();
    });
  }

  /** Paleta de colores predefinidos de buena legibilidad */
  private getRandomColor(): string {
    const colores = [
      '#4285F4', '#EA4335', '#FBBC04', '#34A853',
      '#FF6D00', '#46BDC6', '#7C4DFF', '#E91E63',
      '#00BCD4', '#FF5722', '#795548', '#607D8B',
    ];
    return colores[Math.floor(Math.random() * colores.length)];
  }

  // ── Color de texto ────────────────────────────────────────────────────────
  cambiarColor(event: any): void {
    const color = (event.target as HTMLInputElement).value;
    this.editor.chain().focus().setColor(color).run();
  }

  // ── Subir imagen a S3 e insertar en el editor ─────────────────────────────
  async subirEInsertarImagen(event: any): Promise<void> {
    const file: File = event.target.files?.[0];
    if (!file || !this.editor) return;

    // Generar clave única dentro del directorio del trámite
    const ext = file.name.split('.').pop() ?? 'png';
    const imageKey = `tramites/${this.documentId()}/imagenes/${Date.now()}.${ext}`;

    // Leer el archivo como Data URL (base64)
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    try {
      // Subir a S3 a través del servicio existente y obtener la URL pública
      const res = await firstValueFrom(
        this.s3Service.guardarContenido(imageKey, dataUrl, file.type)
      );
      this.editor.chain().focus().setImage({ src: res.url }).run();
    } catch (error) {
      console.error('Error al subir la imagen a S3:', error);
    }

    // Resetear el input para permitir re-seleccionar el mismo archivo
    event.target.value = '';
  }

  ngOnDestroy() {
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    if (this.unsubscribeFirestore) this.unsubscribeFirestore();

    // Limpiar presencia al salir (navegación Angular normal)
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

    if (this.unsubscribePresencia) this.unsubscribePresencia();
    window.removeEventListener('beforeunload', this.onBeforeUnload);
    if (this.presenciaDocPath) {
      deleteDoc(doc(this.firestore, this.presenciaDocPath));
    }

    if (this.editor) this.editor.destroy();
  }
}