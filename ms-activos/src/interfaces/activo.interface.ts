export enum EstadoActivo {
  OPERATIVO = 'OPERATIVO',
  EN_MANTENIMIENTO = 'EN_MANTENIMIENTO',
  EN_REVISION = 'EN_REVISION',
  DADO_DE_BAJA = 'DADO_DE_BAJA',
}

export enum CategoriaActivo {
  AUDIOVISUAL = 'AUDIOVISUAL',
  COMPUTO = 'COMPUTO',
  REDES = 'REDES',
  ELECTRICO = 'ELECTRICO',
  MOBILIARIO = 'MOBILIARIO',
  OTRO = 'OTRO',
}

export interface Activo {
  id: string;
  codigoQr: string;
  nombre: string;
  categoria: CategoriaActivo | string;
  modelo?: string;
  numeroSerie?: string;
  ubicacion: string;
  estado: EstadoActivo | string;
  fechaRegistro?: Date | string;
}

export interface RespuestaValidacionQR {
  valido: boolean;
  mensaje: string;
  activo?: Activo;
  permiteReportarIncidencia: boolean;
  urlRedireccion?: string;
  deepLinkMovil?: string;
}

export interface RespuestaRedireccionIncidencia {
  valido: boolean;
  mensaje: string;
  urlRedireccion?: string;
  deepLinkMovil?: string;
  datosPrecargados?: {
    activoId: string;
    codigoQr: string;
    nombre: string;
    ubicacion: string;
    categoria: string;
  };
}
