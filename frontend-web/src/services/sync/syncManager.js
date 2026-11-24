/**
 * TAL-196: Orquestador de la sincronización en segundo plano (lado de la página).
 *
 * - Registra el evento Background Sync (`sync-cola-acciones`) cuando el navegador lo soporta.
 * - Criterio 3: si el navegador NO soporta Background Sync API (Safari, Firefox), sincroniza en primer
 *   plano al detectar conectividad (`online`), al encolar acciones y mediante un chequeo periódico.
 */
import api from '../api.js';
import {
  encolarAccionOffline,
  guardarContextoSincronizacion,
  limpiarContextoSincronizacion,
} from '../storage/offlineDb.js';
import {
  ErrorSincronizacion,
  MENSAJES_SYNC,
  SYNC_ENDPOINT,
  SYNC_TAG,
  TIPOS_ACCION_SINCRONIZABLES,
  ejecutarConBloqueo,
  obtenerAccionesPendientes,
  procesarColaOffline,
} from './backgroundSync.js';

export const INTERVALO_FALLBACK_MS = 30000;

const obtenerStorage = () => (typeof localStorage !== 'undefined' ? localStorage : null);

const obtenerIdUsuario = (storage) => {
  try {
    const usuario = JSON.parse(storage?.getItem('usuario') || 'null');
    return usuario?.id_usuario || usuario?.id || usuario?.userId || null;
  } catch {
    return null;
  }
};

/**
 * Indica si el navegador soporta Background Sync API (Service Worker + SyncManager).
 */
export const soportaBackgroundSync = ({
  windowRef = globalThis.window,
  navigatorRef = globalThis.navigator,
} = {}) =>
  Boolean(windowRef && navigatorRef) &&
  'serviceWorker' in navigatorRef &&
  'SyncManager' in windowRef;

const estaOnline = (navigatorRef) => navigatorRef?.onLine !== false;

/**
 * Guarda en IndexedDB el token y la URL base para que el Service Worker pueda autenticar el lote
 * aunque no haya ninguna pestaña abierta. Se elimina al cerrar sesión (`limpiarDatosOffline`).
 */
export const registrarContextoSincronizacion = async ({
  storage = obtenerStorage(),
  baseUrl = api.defaults.baseURL,
} = {}) => {
  const token = storage?.getItem('token');
  if (!token) {
    await limpiarContextoSincronizacion();
    return false;
  }
  await guardarContextoSincronizacion({
    token,
    apiBaseUrl: baseUrl,
    id_usuario: obtenerIdUsuario(storage),
  });
  return true;
};

/**
 * Encola una acción sincronizable (`crear_incidencia`, `subir_evidencia`, `actualizar_estado`).
 * La sincronización se dispara automáticamente al detectar el evento `offline-queue-updated`.
 */
export const encolarAccionSincronizable = async ({
  tipo,
  payload = {},
  id_registro_local = null,
  storage = obtenerStorage(),
} = {}) => {
  if (!TIPOS_ACCION_SINCRONIZABLES.includes(tipo)) {
    throw new Error(
      `Tipo de acción no sincronizable: ${tipo}. Valores válidos: ${TIPOS_ACCION_SINCRONIZABLES.join(', ')}`,
    );
  }
  return encolarAccionOffline({
    tipo,
    metodo: 'POST',
    endpoint: SYNC_ENDPOINT,
    payload,
    id_registro_local,
    id_usuario: obtenerIdUsuario(storage),
  });
};

export const hayAccionesPendientes = async () => (await obtenerAccionesPendientes()).length > 0;

/**
 * Envío del lote desde la página usando la instancia de axios (incluye renovación automática del token).
 */
export const enviarLoteConApi = async (acciones) => {
  try {
    const respuesta = await api.post(
      SYNC_ENDPOINT,
      { acciones },
      { skipRetry: true, skipDeduplication: true },
    );
    return { status: respuesta.status, data: respuesta.data };
  } catch (error) {
    if (error?.response) {
      return { status: error.response.status, data: error.response.data };
    }
    throw new ErrorSincronizacion(error?.message || 'Error de red al sincronizar.', 'RED');
  }
};

/**
 * Notifica a las vistas que la sincronización terminó para que refresquen sus datos locales.
 */
export const notificarSincronizacionCompletada = (resumen, windowRef = globalThis.window) => {
  if (!windowRef || typeof windowRef.dispatchEvent !== 'function') return;
  try {
    windowRef.dispatchEvent(new CustomEvent('offline-sync-completed', { detail: resumen }));
    if (resumen?.incidenciasCreadas > 0) {
      windowRef.dispatchEvent(new Event('incidencia-creada'));
    }
  } catch {
    // Entornos sin CustomEvent completo
  }
};

/**
 * Sincroniza la cola desde la página (fallback sin Background Sync API o renovación de sesión).
 * Nunca lanza: devuelve `{ omitido: true, motivo }` ante fallos reintentables.
 */
export const sincronizarEnPrimerPlano = async ({
  enviarLote = enviarLoteConApi,
  navigatorRef = globalThis.navigator,
  windowRef = globalThis.window,
} = {}) => {
  if (!estaOnline(navigatorRef)) {
    return { omitido: true, motivo: 'sin_conexion' };
  }

  try {
    const resumen = await ejecutarConBloqueo(() => procesarColaOffline({ enviarLote }), navigatorRef);
    if (!resumen.omitido && (resumen.sincronizadas > 0 || resumen.errores > 0)) {
      notificarSincronizacionCompletada(resumen, windowRef);
    }
    return resumen;
  } catch (error) {
    return {
      omitido: true,
      motivo: error instanceof ErrorSincronizacion ? error.codigo.toLowerCase() : 'error',
      error: error?.message,
    };
  }
};

/**
 * Solicita la sincronización de la cola:
 * - Con Background Sync API: registra el tag `sync-cola-acciones` para que el Service Worker procese la cola.
 * - Sin soporte (o si el registro falla): sincroniza en primer plano.
 * @returns {Promise<'sin_pendientes'|'background-sync'|'primer-plano'>}
 */
export const solicitarSincronizacion = async ({
  windowRef = globalThis.window,
  navigatorRef = globalThis.navigator,
  storage = obtenerStorage(),
  enviarLote = enviarLoteConApi,
} = {}) => {
  if (!(await hayAccionesPendientes())) return 'sin_pendientes';

  if (soportaBackgroundSync({ windowRef, navigatorRef })) {
    try {
      await registrarContextoSincronizacion({ storage });
      const registro = await navigatorRef.serviceWorker.ready;
      await registro.sync.register(SYNC_TAG);
      return 'background-sync';
    } catch {
      // Si el registro falla, se aplica el fallback en primer plano.
    }
  }

  await sincronizarEnPrimerPlano({ enviarLote, navigatorRef, windowRef });
  return 'primer-plano';
};

/**
 * Activa la sincronización automática (sin intervención manual del usuario).
 * @returns {() => void} Función para detener los escuchadores.
 */
export const iniciarSincronizacionAutomatica = ({
  windowRef = globalThis.window,
  navigatorRef = globalThis.navigator,
  storage = obtenerStorage(),
  enviarLote = enviarLoteConApi,
  intervaloFallbackMs = INTERVALO_FALLBACK_MS,
} = {}) => {
  if (!windowRef || typeof windowRef.addEventListener !== 'function') {
    return () => {};
  }

  const solicitar = () => {
    void solicitarSincronizacion({ windowRef, navigatorRef, storage, enviarLote }).catch(() => {});
  };

  const alRecuperarConexion = () => solicitar();

  const alCambiarCola = (evento) => {
    if (evento?.detail?.accion === 'encolada') solicitar();
  };

  const alCambiarSesion = () => {
    void registrarContextoSincronizacion({ storage }).catch(() => {});
  };

  const alRecibirMensajeDelServiceWorker = (evento) => {
    const tipo = evento?.data?.type;
    if (tipo === MENSAJES_SYNC.COMPLETADA) {
      notificarSincronizacionCompletada(evento.data.resumen, windowRef);
    } else if (tipo === MENSAJES_SYNC.AUTH_REQUERIDA) {
      void sincronizarEnPrimerPlano({ enviarLote, navigatorRef, windowRef });
    }
  };

  windowRef.addEventListener('online', alRecuperarConexion);
  windowRef.addEventListener('offline-queue-updated', alCambiarCola);
  windowRef.addEventListener('tecnico-cambiado', alCambiarSesion);
  navigatorRef?.serviceWorker?.addEventListener?.('message', alRecibirMensajeDelServiceWorker);

  // Fallback sin Background Sync API: chequeo periódico mientras la página esté abierta.
  const temporizador = soportaBackgroundSync({ windowRef, navigatorRef })
    ? null
    : setInterval(solicitar, intervaloFallbackMs);

  alCambiarSesion();
  solicitar();

  return () => {
    windowRef.removeEventListener('online', alRecuperarConexion);
    windowRef.removeEventListener('offline-queue-updated', alCambiarCola);
    windowRef.removeEventListener('tecnico-cambiado', alCambiarSesion);
    navigatorRef?.serviceWorker?.removeEventListener?.('message', alRecibirMensajeDelServiceWorker);
    if (temporizador) clearInterval(temporizador);
  };
};
