import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TramiteService } from '../../../../core/services/tramite.service'
import { Navbar } from '../../../../shared/components/navbar/navbar';
import { TramiteResponseDTO } from '../../../../data/interfaces/tramite.interface';

@Component({
  selector: 'app-detalle-tramite',
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar],
  templateUrl: './detalle-tramite.component.html',
  styleUrls: ['./detalle-tramite.component.css']
})
export class DetalleTramiteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private tramiteService = inject(TramiteService);
  private cdr = inject(ChangeDetectorRef);

  tramite: any = null;
  loading = true;

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

  descargarDocumento(url: any, nombreTarea: any) {
    if (!url) return;

    const urlStr = String(url);
    const nombreStr = String(nombreTarea);

    // Truco de Cloudinary para forzar descarga
    const urlDescarga = urlStr.replace('/upload/', '/upload/fl_attachment/');

    const link = document.createElement('a');
    link.href = urlDescarga;
    link.target = '_blank';
    link.download = `${nombreStr.replace(/\s+/g, '_')}.pdf`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
}