import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DepartamentoService } from '../../../../core/services/departamento.service';
import { DepartamentoResponse } from '../../../../data/interfaces/departamento.interface';
import { Navbar } from '../../../../shared/components/navbar/navbar';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, Navbar, RouterModule],
  templateUrl: './gestion-departamentos.component.html'
})
export class GestionDepartamentosComponent implements OnInit {
  private deptService = inject(DepartamentoService);
  private cdr = inject(ChangeDetectorRef); // Inyectar aquí
  departamentos: DepartamentoResponse[] = [];

  ngOnInit() { 
    this.listar(); 
  }

  listar() {
      this.deptService.getDepartamentos().subscribe({
        next: (data) => {
          this.departamentos = data; // Asignar los datos
          console.log('Departamentos cargados:', this.departamentos);
          this.cdr.detectChanges(); // <--- ESTO FORZARÁ QUE APAREZCAN LAS TARJETAS
        },
        error: (err) => console.error('Error al listar:', err)
      });
    }

  eliminar(id: string) {
    if (confirm('¿Está seguro de eliminar este departamento?')) {
      this.deptService.eliminar(id).subscribe({
        next: () => this.listar(),
        error: (err) => alert('Error al eliminar: ' + err.message)
      });
    }
  }
}