import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DepartamentoService } from '../../../core/services/departamento.service';


@Component({
  selector: 'app-departamento-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './departamento-form.component.html'
})
export class DepartamentoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private deptService = inject(DepartamentoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  deptForm: FormGroup = this.fb.group({
    id: [''],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['', Validators.required],
    activo: [true]
  });

  isEdit = false;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.deptService.getDepartamentos().subscribe(depts => {
        const encontrado = depts.find(d => d.id === id);
        if (encontrado) {
          this.deptForm.patchValue({
            id: encontrado.id,
            nombre: encontrado.nombre,
            descripcion: encontrado.descripcion,
            activo: encontrado.activo
          });
        }
      });
    }
  }

  onSubmit() {
    if (this.deptForm.valid) {
      if (this.isEdit) {
        this.deptService.actualizar(this.deptForm.value).subscribe({
          next: () => this.router.navigate(['/admin/departamentos']),
          error: (err) => alert('Error al actualizar')
        });
      } else {
        const { nombre, descripcion } = this.deptForm.value;
        this.deptService.crear({ nombre, descripcion }).subscribe({
          next: () => this.router.navigate(['/admin/departamentos']),
          error: (err) => alert('Error al crear')
        });
      }
    }
  }
}