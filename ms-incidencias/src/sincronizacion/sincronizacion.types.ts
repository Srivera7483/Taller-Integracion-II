/**
 * TAL-192: Tipos y constantes de sincronización masiva offline (ms-incidencias).
 *
 * Define el contrato de resultado por ítem y el mapeo de tipo de acción
 * hacia el permiso granular del catálogo TAL-97 (ms-auth).
 */
export type EstadoItemSincronizacion = 'OK' | 'ERROR';

export interface ItemResultadoSincronizacion {
  id_accion_local: string;
  estado: EstadoItemSincronizacion;
  recurso_id?: string;
  motivo?: string;
}

export interface ResultadoLoteSincronizacion {
  statusCode: number;
  message: string;
  resumen: {
    total: number;
    exitosos: number;
    errores: number;
  };
  detalle: ItemResultadoSincronizacion[];
}

/**
 * Mapa de tipo de acción -> permiso granular requerido (catálogo TAL-97 en ms-auth).
 *
 * Los permisos ya viajan firmados en el JWT (JwtUser.permissions), por lo que la
 * verificación se hace en memoria por acción sin consultar ms-auth en cada ítem del lote.
 *
 * Nota: el catálogo de ms-auth no define un permiso "incidencias:actualizar_estado",
 * por lo que se reutiliza "incidencias:resolver" (gestión de ciclo de vida / cambio
 * de estado de incidencias), que es el permiso más cercano semánticamente.
 */
export const PERMISO_POR_TIPO_ACCION: Record<string, string> = {
  crear_incidencia: 'incidencias:crear',
  subir_evidencia: 'evidencias:subir',
  actualizar_estado: 'incidencias:resolver',
};

export const TIPOS_ACCION_VALIDOS = Object.keys(PERMISO_POR_TIPO_ACCION);

export type TipoAccionSincronizacion = (typeof TIPOS_ACCION_VALIDOS)[number];
