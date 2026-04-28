import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../../core/services/user.service';
import { UserListResponse, CambioEstadoUsuarioRequest } from '../../../../data/interfaces/user.interface';
import { Navbar } from '../../../../shared/components/navbar/navbar';
import { RouterModule } from '@angular/router';
import { AsignacionService } from '../../../../core/services/asignacion.service';
import { DepartamentoService } from '../../../../core/services/departamento.service';

// Interfaz extendida para manejar datos de asignación en la vista
interface UserWithDepto extends UserListResponse {
  deptoNombre?: string;
  asignacionId?: string | null;
}

@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [CommonModule, Navbar, RouterModule, FormsModule],
  templateUrl: './gestion-usuarios.component.html'
})
export class GestionUsuariosComponent implements OnInit {
  usuarios: UserWithDepto[] = []; // Usamos la interfaz extendida
  departamentos: any[] = [];
  usuarioSeleccionado: UserWithDepto | null = null;
  deptoSeleccionadoId: string = '';

  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private asignacionService: AsignacionService,
    private deptoService: DepartamentoService
  ) { }

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales() {
    // Cargamos departamentos primero para tener los nombres disponibles
    this.deptoService.getDepartamentos().subscribe(deptos => {
      this.departamentos = deptos;
      this.cargarUsuarios();
    });
  }

  cargarUsuarios() {
    this.userService.getUsuarios().subscribe({
      next: (data) => {
        // Inicializamos las propiedades de departamento
        this.usuarios = data.map(u => ({
          ...u,
          deptoNombre: 'Sin asignar',
          asignacionId: null
        }));
        this.vincularAsignaciones();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error en la petición:', err)
    });
  }

  vincularAsignaciones() {
    this.usuarios.forEach(user => {
      if (user.rol === 'ROLE_FUNCIONARIO') {
        this.departamentos.forEach(depto => {
          this.asignacionService.listarPorDepartamento(depto.id).subscribe(asignados => {
            const asig = asignados.find((a: any) => a.usuarioId === user.id);
            if (asig) {
              user.deptoNombre = depto.nombre;
              user.asignacionId = asig.id;
              this.cdr.detectChanges();
            }
          });
        });
      }
    });
  }

  abrirModalAsignar(user: UserWithDepto) {
    this.usuarioSeleccionado = user;
    this.deptoSeleccionadoId = '';
  }

  guardarAsignacion() {
    if (!this.deptoSeleccionadoId || !this.usuarioSeleccionado) return;

    const dto = {
      usuarioId: this.usuarioSeleccionado.id,
      departamentoId: this.deptoSeleccionadoId
    };

    this.asignacionService.designar(dto).subscribe(() => {
      this.cargarUsuarios(); // Refresca la tabla
      alert('Funcionario asignado correctamente');
    });
  }

  quitarDeDepartamento(asignacionId: string | undefined) {
    if (!asignacionId) return;
    if (confirm('¿Desea retirar al funcionario del departamento?')) {
      this.asignacionService.eliminar(asignacionId).subscribe(() => {
        this.cargarUsuarios();
      });
    }
  }

  // Getters para las tablas
  get clientes() { return this.usuarios.filter(u => u.rol === 'ROLE_CLIENTE'); }
  get funcionarios() { return this.usuarios.filter(u => u.rol === 'ROLE_FUNCIONARIO'); }
  get administradores() { return this.usuarios.filter(u => u.rol === 'ROLE_ADMIN'); }

  cambiarEstado(user: UserListResponse) {
    const request: CambioEstadoUsuarioRequest = {
      username: user.username,
      nuevoEstado: !user.activo
    };
    this.userService.toggleEstado(request).subscribe(() => this.cargarUsuarios());
  }

  eliminar(personaId: string) {
    if (!personaId) return;
    if (confirm('¿Estás seguro de eliminar a esta persona?')) {
      this.userService.eliminarPersona(personaId).subscribe(() => this.cargarUsuarios());
    }
  }
}