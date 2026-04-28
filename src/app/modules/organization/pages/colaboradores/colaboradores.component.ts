import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../../core/services/user.service';
import { ColaboracionService } from '../../../../core/services/colaboracion.service';
import { Navbar } from '../../../../shared/components/navbar/navbar';
import { RouterModule } from '@angular/router';
import { InvitacionRequestDTO, ColaboracionResponseDTO } from '../../../../data/interfaces/colaboracion.interface';
import * as bootstrap from 'bootstrap';

@Component({
    selector: 'app-colaboradores',
    standalone: true,
    imports: [CommonModule, Navbar, RouterModule, FormsModule],
    templateUrl: './colaboradores.component.html'
})
export class ColaboradoresComponent implements OnInit {
    private userService = inject(UserService);
    private colaboracionService = inject(ColaboracionService);
    private cdr = inject(ChangeDetectorRef);

    administradores: any[] = [];
    politicas: any[] = [];

    // Estado del Modal
    usuarioParaInvitar: any = null;
    politicaSeleccionadaId: string = '';
    rolSeleccionado: string = 'LECTOR';
    cargando = false;

    ngOnInit(): void {
        this.cargarAdministradores();
        this.cargarPoliticas();
    }

    cargarAdministradores() {
        this.cargando = true;
        const miUsername = localStorage.getItem('username');
        this.userService.getUsuarios().subscribe({
            next: (data) => {
                // Filtramos: Solo Administradores y excluimos al usuario actual
                this.administradores = data.filter(u => u.rol === 'ROLE_ADMIN' && u.username !== miUsername);
                this.cargando = false;
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Error al cargar usuarios', err)
        });
    }

    cargarPoliticas() {
        // Asegúrate de que este método exista en tu colaboracion.service.ts
        this.colaboracionService.getPoliticas().subscribe({
            next: (data) => {
                this.politicas = data;
                this.cdr.detectChanges();
            }
        });
    }

    abrirModalInvitacion(admin: any) {
        this.usuarioParaInvitar = admin;
        this.politicaSeleccionadaId = '';
        this.rolSeleccionado = 'LECTOR';

        const modalDiv = document.getElementById('modalInvitar');
        if (modalDiv) {
            const modal = new bootstrap.Modal(modalDiv);
            modal.show();
        }
    }

    confirmarInvitacion() {
        if (!this.politicaSeleccionadaId || !this.usuarioParaInvitar) {
            alert('Por favor seleccione una política');
            return;
        }

        const dto: InvitacionRequestDTO = {
            politicaId: this.politicaSeleccionadaId,
            usuarioId: this.usuarioParaInvitar.id,
            rolColaborador: this.rolSeleccionado
        };

        this.colaboracionService.invitar(dto).subscribe({
            next: (res: ColaboracionResponseDTO) => {
                alert(`¡Invitación exitosa! ${res.emailInvitado} ha sido invitado.`);
                this.usuarioParaInvitar = null;
                // Opcional: recargar datos o cerrar modal manualmente si es necesario
            },
            error: (err) => {
                const msg = err.error?.message || 'Error al procesar la invitación';
                alert('Error: ' + msg);
            }
        });
    }
}