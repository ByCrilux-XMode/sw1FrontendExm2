/**
 * Estructura que devuelve el backend (POST /api/ia/reporte-dinamico).
 * Cada fila de `datos` contiene, por convención, las claves
 * "etiqueta" (eje X) y "valor" (eje Y).
 */
export type TipoGrafico = 'bar' | 'pie' | 'line' | 'doughnut';

export interface FilaReporte {
  etiqueta: string;
  valor: number;
  [clave: string]: any;
}

export interface ReporteResponseDTO {
  titulo: string;
  tipoGrafico: TipoGrafico;
  datos: FilaReporte[];
}
