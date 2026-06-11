import { Component, OnInit, OnDestroy, inject, signal, ElementRef, ViewChild, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Firestore, doc, setDoc, getDoc, onSnapshot } from '@angular/fire/firestore';
import { DocumentoS3Service } from '../../../../core/services/documento-s3.service';
import * as mammoth from 'mammoth';

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
  private firestore = inject(Firestore);
  private ngZone = inject(NgZone);

  @ViewChild('editorContainer') editorRef!: ElementRef;
  editor!: Editor;

  s3Key = signal<string>('');
  documentId = signal<string>('');
  isTxtFile = signal<boolean>(false);
  isDocxFile = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  saveMessage = signal<{ text: string, type: 'success' | 'danger' } | null>(null);

  private unsubscribeFirestore?: () => void;
  private isUpdatingFromFirestore = false;
  private syncTimeout?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.documentId.set(this.route.snapshot.paramMap.get('id') || '');
    this.s3Key.set(this.route.snapshot.queryParamMap.get('key') || `tramites/${this.documentId()}/documento.html`);
    this.isTxtFile.set(this.s3Key().endsWith('.txt'));
    this.isDocxFile.set(this.s3Key().toLowerCase().endsWith('.docx'));
  }

  ngAfterViewInit() {
    this.editor = new Editor({
      element: this.editorRef.nativeElement,
      extensions: [StarterKit],
    });

    // Envolver en setTimeout evita el error NG0100 de Angular
    setTimeout(() => {
      this.iniciarSesionColaborativa();
    }, 0);
  }

  async iniciarSesionColaborativa() {
    const nombreArchivo = this.s3Key().split('/').pop() || 'documento_desconocido';
    //sala unica para el archivo
    const salaUnicaId = `${this.documentId()}_${nombreArchivo}`;
    const docRef = doc(this.firestore, 'editor_en_vivo', salaUnicaId);

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

    const contenido = this.isTxtFile() ? this.editor.getText() : this.editor.getHTML();
    const contentType = this.isTxtFile() ? 'text/plain' : 'text/html';
    // Nota: los .docx se guardan como HTML enriquecido (no se reconstruye el binario Word)

    // Persistencia final en AWS S3
    this.s3Service.guardarContenido(this.s3Key(), contenido, contentType).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saveMessage.set({ text: 'Guardado correctamente en AWS S3', type: 'success' });
        setTimeout(() => this.saveMessage.set(null), 3000);
      },
      error: (err) => {
        console.error('Error guardando en S3', err);
        this.isSaving.set(false);
        this.saveMessage.set({ text: 'Error al persistir en S3', type: 'danger' });
      }
    });
  }

  volver() {
    this.router.navigate(['/funcionario/dashboard']);
  }

  ngOnDestroy() {
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    if (this.unsubscribeFirestore) this.unsubscribeFirestore();
    if (this.editor) this.editor.destroy();
  }
}