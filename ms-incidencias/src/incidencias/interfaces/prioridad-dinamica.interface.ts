export type PrioridadNivel = 'Baja' | 'Media' | 'Alta' | 'Crítica' | 'Critica';

export interface CalculoPrioridadResultado {
  prioridad_original: string;
  prioridad_relativa: string;
  escalada: boolean;
  tiempo_inactividad_horas: number;
  antiguedad_dias: number;
  estado_actual: string;
  motivo_escalamiento: string | null;
}

export interface ResumenReportePrioridades {
  total_evaluadas: number;
  total_escaladas: number;
  tasa_escalamiento: number;
  por_prioridad_relativa: Record<string, number>;
}

export interface ReportePrioridadesDinamicas {
  valido: boolean;
  resumen: ResumenReportePrioridades;
  incidencias: Array<{
    id_incidencia: string;
    titulo: string;
    id_activo: string;
    estado: string;
    fecha_creacion: Date;
    prioridad_original: string;
    prioridad_relativa: string;
    escalada: boolean;
    tiempo_inactividad_horas: number;
    antiguedad_dias: number;
    motivo_escalamiento: string | null;
  }>;
}
