import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
  
@Component({
  selector: 'app-usuario-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './usuario-form.component.html',
})
export class UsuarioFormComponent {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private router = inject(Router);

  // Opciones de roles hardcodeadas
  roles = ['ROLE_ADMIN', 'ROLE_FUNCIONARIO', 'ROLE_CLIENTE'];

  usuarioForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(4)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rol: ['ROLE_CLIENTE', Validators.required],
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    telefono: ['', Validators.required],
    ci: ['', Validators.required]
  });

  onSubmit() {
    if (this.usuarioForm.valid) {
      this.userService.registarUsuario(this.usuarioForm.value).subscribe({
        next: () => {
          alert('Usuario registrado con éxito');
          this.router.navigate(['/admin/usuarios']); // Redirigir a la lista
        },
        error: (err) => {
          console.error(err);
          alert('Error al registrar: ' + (err.error?.message || 'Error del servidor'));
        }
      });
    }
  }
}