export interface OpcionesExportarIncidencias {
  formato?: 'xlsx' | 'excel' | 'csv';
  id_activo?: string;
  id_estado?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
}

export interface FilaExportacionIncidencia {
  id_incidencia: string;
  titulo: string;
  estado: string;
  activo: string;
  reportante: string;
  tecnico_asignado: string;
  prioridad: string;
  escalada: string;
  fecha_creacion: string;
  descripcion: string;
}

export interface ResultadoExportacion {
  buffer: Buffer;
  contentType: string;
  filename: string;
  totalFilas: number;
}
