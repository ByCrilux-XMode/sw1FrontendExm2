import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PoliticaService } from '../../../../core/services/politica.service';
import { PoliticaResponseDTO, RegistrarPoliticaRequestDTO } from '../../../../data/interfaces/politica.interface';
import { Navbar } from '../../../../shared/components/navbar/navbar';
import * as bootstrap from 'bootstrap';

@Component({
    selector: 'app-gestion-politicas',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, Navbar],
    templateUrl: './gestion-politicas.component.html'
})
export class GestionPoliticasComponent implements OnInit {
    private politicaService = inject(PoliticaService);
    private router = inject(Router);
    private cdr = inject(ChangeDetectorRef);

    politicas: PoliticaResponseDTO[] = [];
    cargando = false;

    // Formulario de nueva política
    nuevaPolitica: RegistrarPoliticaRequestDTO = {
        nombre: '',
        objetivo: '',
        version: '1.0',
        esquemaJson: '[]',
        publicado: false
    };

    ngOnInit(): void {
        this.cargarPoliticas();
    }

    cargarPoliticas(): void {
        this.cargando = true;
        this.politicaService.getPoliticas().subscribe({
            next: (data) => {
                this.politicas = data;
                this.cargando = false;
                this.cdr.detectChanges(); // Forzamos la detección de cambios
            },
            error: (err) => {
                console.error('Error al cargar políticas:', err);
                this.cargando = false;
                this.cdr.detectChanges(); // Forzamos la detección de cambios
            }
        });
    }

    abrirModalNuevaPolitica(): void {
        // Resetear formulario
        this.nuevaPolitica = {
            nombre: '',
            objetivo: '',
            version: '1.0',
            esquemaJson: '[]',
            publicado: false,
            creadoPor: localStorage.getItem('username') || 'ADMIN'
        };

        const modalDiv = document.getElementById('modalNuevaPolitica');
        if (modalDiv) {
            const modal = new bootstrap.Modal(modalDiv);
            modal.show();
        }
    }

    guardarPolitica(): void {
        if (!this.nuevaPolitica.nombre || this.nuevaPolitica.nombre.trim() === '') {
            alert('El nombre de la política es obligatorio');
            return;
        }

        this.politicaService.crear(this.nuevaPolitica).subscribe({
            next: (res) => {
                // Redirigir al editor de la nueva política
                this.router.navigate(['/admin/editor', res.id]);
            },
            error: (err) => {
                console.error('Error creando política:', err);
                alert('Ocurrió un error al crear la política.');
            }
        });
    }
}
