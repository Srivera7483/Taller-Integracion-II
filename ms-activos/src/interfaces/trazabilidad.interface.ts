export type TipoEventoTrazabilidad = 'todos' | 'adquisicion' | 'fallo' | 'mantenimiento' | 'resolucion';

export interface ResponsableEvento {
  nombre: string;
  rol: string;
  avatar?: string;
}

export interface EventoTrazabilidad {
  id: string;
  fecha: string;
  tipo: 'adquisicion' | 'fallo' | 'mantenimiento' | 'resolucion';
  tipoLabel: string;
  titulo: string;
  descripcion: string;
  estadoAnterior?: string | null;
  estadoNuevo: string;
  responsable: ResponsableEvento;
  detalles?: Record<string, any>;
}

export interface ActivoTrazabilidadResumen {
  id: string;
  codigoQr: string;
  nombre: string;
  modelo?: string;
  numeroSerie?: string;
  categoria: string;
  ubicacion: string;
  estadoActual: string;
  fechaRegistro?: string;
}

export interface PaginacionTrazabilidad {
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  tieneMas: boolean;
}

export interface ResumenEstadisticoTrazabilidad {
  totalFallos: number;
  totalMantenimientos: number;
  totalResoluciones: number;
  totalHitos: number;
}

export interface RespuestaTrazabilidadActivo {
  activo: ActivoTrazabilidadResumen;
  paginacion: PaginacionTrazabilidad;
  trazabilidad: EventoTrazabilidad[];
  resumenEstadistico: ResumenEstadisticoTrazabilidad;
}
