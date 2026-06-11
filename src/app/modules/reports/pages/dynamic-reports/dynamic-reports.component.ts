import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import { ReporteService } from '../../../../core/services/reporte.service';
import {
  ReporteResponseDTO,
  TipoGrafico,
} from '../../../../data/interfaces/reporte.interface';

@Component({
  selector: 'app-dynamic-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dynamic-reports.component.html',
  styleUrls: ['./dynamic-reports.component.css'],
})
export class DynamicReportsComponent implements OnDestroy {
  /** Texto en lenguaje natural escrito por el usuario. */
  consulta = '';

  cargando = false;
  error: string | null = null;
  tituloActual = '';

  /** Referencia al gráfico actual para poder destruirlo antes de redibujar. */
  private myChart: Chart | null = null;

  // Paleta usada para los gráficos circulares / de barras múltiples.
  private readonly colores = [
    '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
    '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac',
  ];

  constructor(
    private reporteService: ReporteService,
    private cdr: ChangeDetectorRef,
  ) {}

  /** Envía el texto al backend y dibuja el gráfico con la respuesta. */
  generar(): void {
    const texto = this.consulta.trim();
    if (!texto || this.cargando) {
      return;
    }

    this.cargando = true;
    this.error = null;
    this.cdr.detectChanges();

    this.reporteService.generarReporte(texto).subscribe({
      next: (resp) => {
        this.cargando = false;
        // App zoneless: forzamos CD para que el canvas se muestre antes de dibujar.
        this.cdr.detectChanges();
        this.dibujarGrafico(resp);
      },
      error: (err) => {
        this.cargando = false;
        this.error =
          err?.error?.error ||
          err?.error?.detalle ||
          'Ocurrió un error al generar el reporte. Intenta reformular la consulta.';
        this.cdr.detectChanges();
      },
    });
  }

  /** Construye un nuevo Chart a partir del DTO recibido. */
  private dibujarGrafico(resp: ReporteResponseDTO): void {
    // Destruir el gráfico anterior si existe.
    if (this.myChart) {
      this.myChart.destroy();
      this.myChart = null;
    }

    this.tituloActual = resp.titulo;

    const datos = resp.datos ?? [];
    const labels = datos.map((d) => String(d['etiqueta'] ?? ''));
    const valores = datos.map((d) => Number(d['valor'] ?? 0));
    const tipo: TipoGrafico = resp.tipoGrafico ?? 'bar';

    // bar/line usan un único color; pie/doughnut usan la paleta completa.
    const esCircular = tipo === 'pie' || tipo === 'doughnut';
    const backgroundColor = esCircular
      ? labels.map((_, i) => this.colores[i % this.colores.length])
      : '#4e79a7';

    this.myChart = new Chart('reportChart', {
      type: tipo,
      data: {
        labels,
        datasets: [
          {
            label: resp.titulo,
            data: valores,
            backgroundColor,
            borderColor: esCircular ? '#ffffff' : '#34568b',
            borderWidth: esCircular ? 2 : 1,
            fill: tipo === 'line' ? false : true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: esCircular },
          title: { display: true, text: resp.titulo },
        },
        scales: esCircular
          ? {}
          : { y: { beginAtZero: true } },
      },
    });
  }

  ngOnDestroy(): void {
    if (this.myChart) {
      this.myChart.destroy();
      this.myChart = null;
    }
  }
}
