import type { PrioridadIncidencia } from '@prisma/client';

export interface IncidenciaCriticaEvento {
  evento: 'INCIDENCIA_CRITICA_REGISTRADA';
  id_incidencia: string;
  id_activo: string;
  id_reportante?: string;
  email?: string;
  titulo: string;
  descripcion: string;
  prioridad: PrioridadIncidencia;
  fecha_creacion: string | Date;
  estado: string;
}

export interface IncidenciaActualizadaEvento {
  evento: 'INCIDENCIA_ACTUALIZADA' | 'ORDEN_TRABAJO_ASIGNADA';
  id_incidencia: string;
  id_orden?: string | null;
  id_tecnico?: string | null;
  titulo?: string;
  nuevo_estado: string;
  usuario_responsable: string | null;
  id_edificio?: string | null;
  emailTecnico?: string;
  tecnico?: string;
  emailReportante?: string;
  email?: string;
  diagnostico_tecnico?: string | null;
  resolucion?: string | null;
  timestamp: string;
  tipo_evento: 'CAMBIO_ESTADO' | 'ASIGNACION_ORDEN';
}

