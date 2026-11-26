/**
 * TAL-196: Cola de Sincronización en Segundo Plano (Background Sync).
 *
 * Lógica compartida entre el Service Worker (`src/sw.js`) y la página (fallback en primer plano).
 * Este módulo NO depende de axios ni de `window`, por lo que puede ejecutarse dentro del Service Worker.
 *
 * Flujo:
 * 1. Lee la cola de acciones pendientes de IndexedDB (`cola_acciones`, TAL-195).
 * 2. Las envía en lotes de hasta 50 acciones a `POST /sincronizacion/lote` (TAL-192).
 * 3. Tras la confirmación del servidor, actualiza los registros locales (`ordenes`) y retira la acción de la cola.
 */
import {
  actualizarEstadoAccionOffline,
  actualizarPayloadAccionOffline,
  eliminarAccionOffline,
  eliminarOrdenOffline,
  guardarOrdenesOffline,
  obtenerColaAccionesOffline,
  obtenerContextoSincronizacion,
  obtenerEstadosOffline,
  obtenerOrdenPorIdOffline,
} from '../storage/offlineDb.js';

export const SYNC_TAG = 'sync-cola-acciones';
export const SYNC_ENDPOINT = '/sincronizacion/lote';
export const TAMANO_MAXIMO_LOTE = 50;
export const UMBRAL_SINCRONIZANDO_OBSOLETO_MS = 60000;
export const NOMBRE_BLOQUEO_SYNC = 'inframanager-sync-cola-acciones';

/**
 * Tipos de acción soportados por `POST /sincronizacion/lote` (contrato de TAL-192).
 * Solo se sincronizan las acciones encoladas explícitamente con alguno de estos tipos; las mutaciones
 * pausadas por TAL-181 (`MUTACION_PAUSADA_OFFLINE`) se reanudan en la propia página y no deben duplicarse.
 */
export const TIPOS_ACCION_SINCRONIZABLES = Object.freeze([
  'crear_incidencia',
  'subir_evidencia',
  'actualizar_estado',
]);

export const MENSAJES_SYNC = Object.freeze({
  COMPLETADA: 'OFFLINE_SYNC_COMPLETED',
  AUTH_REQUERIDA: 'OFFLINE_SYNC_AUTH_REQUIRED',
});

/**
 * Error tipado de sincronización.
 * - `RED`: sin conectividad o fallo de transporte.
 * - `AUTH`: token vencido o sin permisos (la página debe renovar la sesión).
 * - `TRANSITORIO`: error 5xx, kill switch u otro fallo reintentable.
 */
export class ErrorSincronizacion extends Error {
  constructor(mensaje, codigo = 'RED', status = null) {
    super(mensaje);
    this.name = 'ErrorSincronizacion';
    this.codigo = codigo;
    this.status = status;
  }
}

const MAPA_TIPOS_NORMALIZADOS = Object.freeze({
  crear_incidencia: 'crear_incidencia',
  subir_evidencia: 'subir_evidencia',
  actualizar_estado: 'actualizar_estado',
  actualizar_estado_orden: 'actualizar_estado',
});

export const normalizarTipoAccionSincronizable = (tipoRaw) => {
  if (!tipoRaw) return null;
  const clave = String(tipoRaw).trim().toLowerCase();
  return MAPA_TIPOS_NORMALIZADOS[clave] || null;
};

export const esAccionSincronizable = (registro) =>
  Boolean(registro) && Boolean(normalizarTipoAccionSincronizable(registro.tipo));

const esPendiente = (registro, ahoraMs) => {
  if (!esAccionSincronizable(registro)) return false;
  if (registro.estado_sincronizacion === 'pendiente') return true;
  if (registro.estado_sincronizacion === 'sincronizando') {
    // Recupera acciones bloqueadas por un proceso que fue terminado antes de confirmar.
    const ultimaActualizacion = Date.parse(registro.actualizado_en || '');
    return (
      Number.isNaN(ultimaActualizacion) ||
      ahoraMs - ultimaActualizacion > UMBRAL_SINCRONIZANDO_OBSOLETO_MS
    );
  }
  return false;
};

/**
 * Obtiene las acciones sincronizables pendientes en orden cronológico (FIFO).
 */
export const obtenerAccionesPendientes = async (ahoraMs = Date.now()) => {
  const cola = await obtenerColaAccionesOffline();
  return cola.filter((registro) => esPendiente(registro, ahoraMs));
};

/**
 * Convierte un registro de `cola_acciones` en una acción del contrato `SyncActionDto` de TAL-192.
 */
export const construirAccionLote = (registro) => ({
  id_accion_local: registro.id,
  tipo: normalizarTipoAccionSincronizable(registro.tipo) || registro.tipo,
  payload: registro.payload || {},
  timestamp_local: registro.creado_en || new Date().toISOString(),
});

/**
 * Ejecuta la tarea con un bloqueo (Web Locks API) para evitar que el Service Worker y la página
 * procesen la cola al mismo tiempo. Si la API no existe, ejecuta la tarea directamente.
 */
export const ejecutarConBloqueo = async (tarea, navigatorRef = globalThis.navigator) => {
  const locks = navigatorRef?.locks;
  if (locks && typeof locks.request === 'function') {
    return locks.request(NOMBRE_BLOQUEO_SYNC, { ifAvailable: true }, async (bloqueo) =>
      bloqueo ? tarea() : { omitido: true, motivo: 'en_curso' },
    );
  }
  return tarea();
};

// ---------------------------------------------------------------------------
// Criterio 2: Actualización de registros locales tras la confirmación del servidor
// ---------------------------------------------------------------------------

const reescribirReferenciasLocales = async (idLocal, idReal) => {
  const cola = await obtenerColaAccionesOffline();
  for (const accion of cola) {
    const referencia = accion.payload?.id_incidencia;
    if (
      referencia !== undefined &&
      String(referencia) === String(idLocal) &&
      accion.estado_sincronizacion !== 'sincronizado'
    ) {
      await actualizarPayloadAccionOffline(accion.id, { ...accion.payload, id_incidencia: idReal });
    }
  }
};

/**
 * Actualiza el estado de los registros locales (`ordenes`) una vez que el servidor confirmó la acción.
 */
export const reconciliarRegistrosLocales = async (accion, resultado) => {
  const payload = accion.payload || {};
  const confirmadoEn = new Date().toISOString();
  const tipoNorm = normalizarTipoAccionSincronizable(accion.tipo);

  if (tipoNorm === 'crear_incidencia') {
    const idLocal = accion.id_registro_local || payload.id_local || payload.id_incidencia_local;
    const idReal = resultado?.recurso_id;
    if (!idLocal || !idReal) return;

    const local = await obtenerOrdenPorIdOffline(idLocal);
    if (local) {
      await eliminarOrdenOffline(local.id);
      await guardarOrdenesOffline([
        {
          ...local,
          id: idReal,
          id_incidencia: idReal,
          id_orden: local.id_orden && local.id_orden !== local.id ? local.id_orden : idReal,
          estado_sincronizacion: 'sincronizado',
          pendiente_sync: false,
          sincronizado_en: confirmadoEn,
        },
      ]);
    }
    await reescribirReferenciasLocales(idLocal, idReal);
    return;
  }

  if (tipoNorm === 'actualizar_estado') {
    const local = await obtenerOrdenPorIdOffline(payload.id_incidencia);
    if (!local) return;

    const idEstado = Number(payload.id_estado);
    const estados = await obtenerEstadosOffline('incidencia');
    const estado = estados.find((e) => Number(e.id_estado) === idEstado);
    const nombreEstado = estado?.nombre_estado || local.estado_normalizado || 'Pendiente';

    await guardarOrdenesOffline([
      {
        ...local,
        id_estado: idEstado,
        estado: { id_estado: idEstado, nombre_estado: nombreEstado },
        estado_sincronizacion: 'sincronizado',
        pendiente_sync: false,
        sincronizado_en: confirmadoEn,
      },
    ]);
    return;
  }

  if (tipoNorm === 'subir_evidencia') {
    const local = await obtenerOrdenPorIdOffline(payload.id_incidencia);
    if (!local) return;

    const evidencias = Array.isArray(local.evidencias) ? [...local.evidencias] : [];
    const idEvidencia = resultado?.recurso_id || accion.id;
    if (!evidencias.some((e) => String(e.id_evidencia) === String(idEvidencia))) {
      evidencias.push({
        id_evidencia: idEvidencia,
        id_tipo_evidencia: payload.id_tipo_evidencia ?? null,
        url_evidencia: payload.url_evidencia ?? null,
      });
    }
    await guardarOrdenesOffline([
      {
        ...local,
        evidencias,
        estado_sincronizacion: 'sincronizado',
        pendiente_sync: false,
        sincronizado_en: confirmadoEn,
      },
    ]);
  }
};

const confirmarAccionSincronizada = async (accion, resultado, resumen, eliminarAlConfirmar = false) => {
  try {
    await reconciliarRegistrosLocales(accion, resultado);
  } catch {
    // El servidor ya aplicó la acción: un fallo al refrescar el caché local no debe reenviarla.
  }
  await actualizarEstadoAccionOffline(accion.id, 'sincronizado', {
    recurso_id: resultado?.recurso_id || null,
    ultimo_error: null,
  });
  if (eliminarAlConfirmar) {
    await eliminarAccionOffline(accion.id);
  }
  resumen.sincronizadas += 1;
  if (normalizarTipoAccionSincronizable(accion.tipo) === 'crear_incidencia') {
    resumen.incidenciasCreadas += 1;
  }
};

// ---------------------------------------------------------------------------
// Envío por lotes
// ---------------------------------------------------------------------------

const revertirAPendiente = async (acciones) => {
  for (const accion of acciones) {
    await actualizarEstadoAccionOffline(accion.id, 'pendiente', {
      intentos: accion.intentos || 0,
    });
  }
};

const marcarComoError = async (accion, motivo, resumen) => {
  await actualizarEstadoAccionOffline(accion.id, 'error', { ultimo_error: motivo });
  resumen.errores += 1;
};

const extraerMensajeError = (data, respaldo) => {
  const mensaje = data?.message ?? data?.mensaje;
  if (Array.isArray(mensaje)) return mensaje.join('; ');
  return mensaje || respaldo;
};

const aplicarRespuestaLote = async (acciones, respuesta, resumen) => {
  const status = Number(respuesta?.status);
  const data = respuesta?.data;

  if (status === 200 || status === 207) {
    const detalle = new Map(
      (Array.isArray(data?.detalle) ? data.detalle : []).map((item) => [
        String(item.id_accion_local),
        item,
      ]),
    );

    for (const accion of acciones) {
      const resultado = detalle.get(String(accion.id));
      if (!resultado) {
        await actualizarEstadoAccionOffline(accion.id, 'pendiente', {
          intentos: accion.intentos || 0,
        });
        resumen.pendientes += 1;
      } else if (resultado.estado === 'OK') {
        await confirmarAccionSincronizada(accion, resultado, resumen);
      } else {
        await marcarComoError(accion, resultado.motivo || 'Error al procesar la acción', resumen);
      }
    }
    return;
  }

  if (status === 401 || status === 403) {
    await revertirAPendiente(acciones);
    throw new ErrorSincronizacion('Sesión vencida o sin permisos para sincronizar.', 'AUTH', status);
  }

  if (status === 400) {
    const motivo = extraerMensajeError(data, 'El lote fue rechazado por el servidor.');
    for (const accion of acciones) {
      await marcarComoError(accion, motivo, resumen);
    }
    return;
  }

  await revertirAPendiente(acciones);
  throw new ErrorSincronizacion(
    extraerMensajeError(data, `El servidor respondió con estado ${status || 'desconocido'}.`),
    'TRANSITORIO',
    status || null,
  );
};

const enviarEnLotes = async (acciones, enviarLote, resumen) => {
  for (let inicio = 0; inicio < acciones.length; inicio += TAMANO_MAXIMO_LOTE) {
    const lote = acciones.slice(inicio, inicio + TAMANO_MAXIMO_LOTE);

    for (const accion of lote) {
      await actualizarEstadoAccionOffline(accion.id, 'sincronizando');
    }
    resumen.lotes += 1;

    let respuesta;
    try {
      respuesta = await enviarLote(lote.map(construirAccionLote));
    } catch (error) {
      await revertirAPendiente(lote);
      throw error instanceof ErrorSincronizacion
        ? error
        : new ErrorSincronizacion(error?.message || 'Error de red al sincronizar.', 'RED');
    }

    await aplicarRespuestaLote(lote, respuesta, resumen);
  }
};

/**
 * Procesa la cola de acciones pendientes.
 *
 * Orden de ejecución: primero las `crear_incidencia` (para obtener el id real) y luego el resto de
 * acciones, reescribiendo las referencias a incidencias creadas offline.
 *
 * @param {Object} params
 * @param {(acciones: Array<Object>) => Promise<{status: number, data: Object}>} params.enviarLote
 * @param {() => number} [params.ahora]
 * @returns {Promise<{total:number, sincronizadas:number, errores:number, pendientes:number, lotes:number, incidenciasCreadas:number}>}
 */
export const procesarColaOffline = async ({ enviarLote, ahora = () => Date.now() } = {}) => {
  if (typeof enviarLote !== 'function') {
    throw new Error('procesarColaOffline requiere una función enviarLote');
  }

  const resumen = {
    total: 0,
    sincronizadas: 0,
    errores: 0,
    pendientes: 0,
    lotes: 0,
    incidenciasCreadas: 0,
  };

  const inicial = await obtenerAccionesPendientes(ahora());
  resumen.total = inicial.length;
  if (inicial.length === 0) return resumen;

  // Sin dependencias entre acciones se envía todo junto (menos llamadas HTTP = menos batería y datos).
  const idsLocalesPendientes = new Set(
    inicial
      .filter(
        (accion) =>
          normalizarTipoAccionSincronizable(accion.tipo) === 'crear_incidencia' &&
          accion.id_registro_local,
      )
      .map((accion) => String(accion.id_registro_local)),
  );
  const hayDependencias = inicial.some(
    (accion) =>
      normalizarTipoAccionSincronizable(accion.tipo) !== 'crear_incidencia' &&
      accion.payload?.id_incidencia &&
      idsLocalesPendientes.has(String(accion.payload.id_incidencia)),
  );
  if (!hayDependencias) {
    await enviarEnLotes(inicial, enviarLote, resumen);
    return resumen;
  }

  // Fase 1: incidencias creadas offline.
  await enviarEnLotes(
    inicial.filter(
      (accion) => normalizarTipoAccionSincronizable(accion.tipo) === 'crear_incidencia',
    ),
    enviarLote,
    resumen,
  );

  // Fase 2: acciones que pueden depender de una incidencia local.
  const idsIniciales = new Set(inicial.map((accion) => accion.id));
  const colaActual = await obtenerColaAccionesOffline();
  const creacionesPorIdLocal = new Map(
    colaActual
      .filter(
        (accion) =>
          normalizarTipoAccionSincronizable(accion.tipo) === 'crear_incidencia' &&
          accion.id_registro_local,
      )
      .map((accion) => [String(accion.id_registro_local), accion]),
  );

  const listas = [];
  for (const accion of colaActual) {
    if (
      !idsIniciales.has(accion.id) ||
      normalizarTipoAccionSincronizable(accion.tipo) === 'crear_incidencia' ||
      !esPendiente(accion, ahora())
    ) {
      continue;
    }

    const referencia = accion.payload?.id_incidencia;
    const creacion = referencia ? creacionesPorIdLocal.get(String(referencia)) : null;

    if (!creacion) {
      listas.push(accion);
    } else if (creacion.estado_sincronizacion === 'error') {
      await marcarComoError(accion, 'La incidencia local asociada no pudo sincronizarse.', resumen);
    } else {
      resumen.pendientes += 1;
    }
  }

  await enviarEnLotes(listas, enviarLote, resumen);
  return resumen;
};

// ---------------------------------------------------------------------------
// Ejecución dentro del Service Worker
// ---------------------------------------------------------------------------

/**
 * Crea la función de envío del Service Worker (fetch directo con las credenciales guardadas en IndexedDB).
 */
export const crearEnviadorFetch =
  ({ fetchImpl, contexto }) =>
  async (acciones) => {
    const respuesta = await fetchImpl(`${contexto.apiBaseUrl}${SYNC_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${contexto.token}`,
      },
      body: JSON.stringify({ acciones }),
    });

    let data = null;
    try {
      data = await respuesta.json();
    } catch {
      data = null;
    }
    return { status: respuesta.status, data };
  };

/**
 * Manejador del evento `sync` del Service Worker.
 * - Sin credenciales guardadas: omite (la página sincronizará al abrirse).
 * - Token vencido: avisa a la página para que renueve la sesión y sincronice en primer plano.
 * - Fallos de red o del servidor: relanza el error para que el navegador reintente el evento `sync`.
 */
export const sincronizarColaEnServiceWorker = async ({
  fetchImpl = (...args) => globalThis.fetch(...args),
  notificar = async () => {},
  navigatorRef = globalThis.navigator,
} = {}) => {
  const contexto = await obtenerContextoSincronizacion();
  if (!contexto?.token || !contexto?.apiBaseUrl) {
    return { omitido: true, motivo: 'sin_credenciales' };
  }

  try {
    const resumen = await ejecutarConBloqueo(
      () => procesarColaOffline({ enviarLote: crearEnviadorFetch({ fetchImpl, contexto }) }),
      navigatorRef,
    );

    if (!resumen.omitido && (resumen.sincronizadas > 0 || resumen.errores > 0)) {
      await notificar({ type: MENSAJES_SYNC.COMPLETADA, resumen });
    }
    return resumen;
  } catch (error) {
    if (error instanceof ErrorSincronizacion && error.codigo === 'AUTH') {
      await notificar({ type: MENSAJES_SYNC.AUTH_REQUERIDA });
      return { omitido: true, motivo: 'auth' };
    }
    throw error;
  }
};
