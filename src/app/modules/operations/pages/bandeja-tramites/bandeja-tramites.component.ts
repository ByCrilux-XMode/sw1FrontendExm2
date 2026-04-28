import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { PoliticaService } from '../../../../core/services/politica.service';
import { WorkflowEngineService } from '../../../../core/services/workflow-engine.service';

@Component({
  selector: 'app-bandeja-tramites',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bandeja-tramites.component.html',
  styleUrls: ['./bandeja-tramites.component.css']
})
export class BandejaTramitesComponent implements OnInit {
  tramites: any[] = [];
  politicas: any[] = [];
  
  // Formulario para iniciar trámite de prueba
  showModal = false;
  selectedPoliticaId = '';
  clienteIdTest = '69eebd9a594303bac747a210'; // Un ID de cliente inventado para probar

  constructor(
    private http: HttpClient,
    private router: Router,
    private politicaService: PoliticaService,
    private workflowEngine: WorkflowEngineService
  ) {}

  ngOnInit(): void {
    this.cargarTramites();
    this.cargarPoliticas();
  }

  cargarTramites() {
    // Para la prueba, listaremos por el cliente test. En la vida real el backend debería tener un getAll() para funcionarios.
    this.http.get<any[]>(`${environment.apiUrl}/api/tramite/cliente/${this.clienteIdTest}`).subscribe(
      res => {
        this.tramites = res;
      },
      err => console.error(err)
    );
  }

  cargarPoliticas() {
    this.politicaService.getPoliticas().subscribe(
      res => {
        // Solo las publicadas
        this.politicas = res.filter((p: any) => p.publicado);
      },
      err => console.error(err)
    );
  }

  iniciarTramite() {
    if (!this.selectedPoliticaId) return;

    const politica = this.politicas.find(p => p.id === this.selectedPoliticaId);
    if (!politica || !politica.esquemaJson) return;

    let nodosInicialesKeys: string[] = [];
    try {
      const esquema = this.workflowEngine.parseEsquema(politica.esquemaJson);
      const nodoInicio = esquema.nodes.find((n: any) => n.category === 'Initial');
      if (!nodoInicio) {
        alert('La política seleccionada no tiene un nodo de Inicio válido.');
        return;
      }
      nodosInicialesKeys = this.workflowEngine.getPrimeraNodosAsignables(
        nodoInicio.key, esquema.nodes, esquema.links
      );
    } catch (e) {
      console.error(e);
    }

    if (nodosInicialesKeys.length === 0) {
      alert('No se encontraron tareas asignables en la política. Verifique el diagrama.');
      return;
    }

    const payload = {
      clienteId: this.clienteIdTest,
      politicaId: this.selectedPoliticaId,
      nodosInicialesKeys: nodosInicialesKeys
    };

    this.http.post<any>(`${environment.apiUrl}/api/tramite/iniciar`, payload).subscribe(
      res => {
        this.showModal = false;
        this.router.navigate(['/funcionario/tramites', res.id, 'ejecutar']);
      },
      err => {
        console.error(err);
        alert('Error al iniciar trámite');
      }
    );
  }

  abrirEjecucion(tramiteId: string) {
    this.router.navigate(['/funcionario/tramites', tramiteId, 'ejecutar']);
  }
}
