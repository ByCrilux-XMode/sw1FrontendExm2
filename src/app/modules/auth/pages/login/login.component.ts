import { Component } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: false // Depende de si usas módulos o no, lo ajustamos si falla
})

export class LoginComponent {
  credentials = { username: '', password: '' };

  constructor(private authService: AuthService, private router: Router) { }

  onLogin(event: Event) {
    event.preventDefault();
    this.authService.login(this.credentials).subscribe({
      next: (res) => {
        alert('¡Bienvenido ' + res.username + '!');
        if (res.rol === 'ROLE_FUNCIONARIO' || res.rol === 'FUNCIONARIO') {
          this.router.navigate(['/funcionario/dashboard']);
        } else {
          this.router.navigate(['/admin/dashboard']);
        }
      },
      error: (err) => {
        alert('Error: Usuario o contraseña incorrectos');
      }
    });
  }
}