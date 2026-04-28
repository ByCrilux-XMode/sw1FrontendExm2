import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  constructor(private authService: AuthService, private router: Router){}

  onLogout(){
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  irAlInicio() {
    const usuario = this.authService.usuarioActual;
    const rol = usuario?.rol;

    if (rol === 'ROLE_ADMIN') {
      this.router.navigate(['/admin/dashboard']);
    } else {
      // Por si acaso, si no es admin, al login o ruta base
      this.router.navigate(['/login']);
    }
  }
}
