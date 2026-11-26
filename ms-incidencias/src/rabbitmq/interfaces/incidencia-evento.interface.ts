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
  prioridad?: PrioridadIncidencia | string | null;
  id_activo?: string;
  accion?: string;
  tipo_cambio?: string;
  cambio_prioridad?: boolean;
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

export interface PrioridadDinamicaEscaladaEvento {
  evento: 'PRIORIDAD_DINAMICA_ESCALADA';
  id_incidencia: string;
  id_activo: string;
  titulo: string;
  estado_actual: string;
  prioridad_anterior: string;
  prioridad_nueva: string;
  tiempo_inactividad_horas: number;
  antiguedad_dias: number;
  motivo_escalamiento: string;
  id_tecnico?: string | null;
  emailDestinatario?: string;
  timestamp: string;
}


