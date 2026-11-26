import { useState, useEffect, useCallback, useRef } from 'react';
import {
  obtenerColaAccionesOffline,
  obtenerActivoPorIdOffline,
  obtenerOrdenPorIdOffline,
} from '../services/storage/offlineDb.js';
import { sincronizarEnPrimerPlano } from '../services/sync/syncManager.js';

/**
 * Normaliza las etiquetas textuales del estado de sincronización para presentarlas al usuario final.
 * Se centraliza aquí para mantener coherencia en toda la interfaz de usuario.
 */
export const formatearEstadoSincronizacion = (estadoSincronizacion) => {
  switch (estadoSincronizacion) {
    case 'sincronizando':
      return 'Sincronizando...';
    case 'error':
      return 'Error de sincronización';
    case 'sincronizado':
      return 'Sincronizado';
    case 'pendiente':
    default:
      return 'Pendiente de envío';
  }
};

/**
 * Traduce el tipo técnico de mutación encolada a una descripción legible de negocio.
 */
export const formatearTipoAccion = (tipoAccion) => {
  switch (tipoAccion) {
    case 'crear_incidencia':
      return 'Reporte de Incidencia';
    case 'actualizar_estado':
    case 'actualizar_estado_orden':
      return 'Actualización de Orden';
    case 'subir_evidencia':
      return 'Evidencia Fotográfica';
    default:
      return tipoAccion ? String(tipoAccion).replace(/_/g, ' ') : 'Operación Offline';
  }
};

/**
 * Formatea una marca temporal ISO a una cadena con fecha y hora legible por personas.
 */
export const formatearFechaHoraLocal = (marcaTemporalIso) => {
  if (!marcaTemporalIso) return 'Hora no registrada';
  try {
    const fecha = new Date(marcaTemporalIso);
    if (Number.isNaN(fecha.getTime())) {
      return 'Hora no registrada';
    }
    return fecha.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return 'Hora no registrada';
  }
};

/**
 * Enriquece un registro de cola con los datos descriptivos del activo y la orden asociada.
 * Esto resuelve la necesidad del técnico en terreno de identificar claramente qué elemento
 * está retenido en la cola sin tener que interpretar identificadores criptográficos o JSONs.
 */
export const enriquecerAccionConDetalles = async (registroAccion) => {
  const payload = registroAccion.payload || {};

  let identificadorActivo =
    payload.id_activo ||
    payload.activo_id ||
    payload.codigo_qr ||
    payload.codigoQr ||
    null;

  let identificadorOrden =
    payload.id_orden ||
    payload.id_incidencia ||
    payload.incidencia_id ||
    registroAccion.id_registro_local ||
    null;

  let ordenEncontrada = null;
  if (identificadorOrden) {
    try {
      ordenEncontrada = await obtenerOrdenPorIdOffline(identificadorOrden);
    } catch {
      ordenEncontrada = null;
    }
  }

  if (!identificadorActivo && ordenEncontrada) {
    identificadorActivo =
      ordenEncontrada.id_activo ||
      ordenEncontrada.codigo_qr_activo ||
      ordenEncontrada.incidencia?.id_activo ||
      null;
  }

  let activoEncontrado = null;
  if (identificadorActivo) {
    try {
      activoEncontrado = await obtenerActivoPorIdOffline(identificadorActivo);
    } catch {
      activoEncontrado = null;
    }
  }

  const nombreActivo =
    activoEncontrado?.nombre ||
    payload.nombre_activo ||
    ordenEncontrada?.nombre_activo ||
    (identificadorActivo ? `Activo #${identificadorActivo}` : 'Activo general o no especificado');

  const codigoActivo =
    activoEncontrado?.codigo_qr ||
    activoEncontrado?.codigoQr ||
    payload.codigo_qr ||
    payload.codigoQr ||
    ordenEncontrada?.codigo_qr_activo ||
    identificadorActivo ||
    'Sin código';

  const ubicacionActivo =
    activoEncontrado?.ubicacion ||
    activoEncontrado?.ubicacion_objeto?.nombre_espacio ||
    ordenEncontrada?.ubicacion ||
    null;

  const tituloOrden =
    payload.titulo ||
    ordenEncontrada?.titulo ||
    ordenEncontrada?.descripcion ||
    (identificadorOrden ? `Orden/Incidencia #${identificadorOrden}` : 'Operación independiente');

  const codigoOrden =
    ordenEncontrada?.id_orden ||
    ordenEncontrada?.id_incidencia ||
    identificadorOrden ||
    'Sin orden asociada';

  return {
    ...registroAccion,
    etiquetaTipo: formatearTipoAccion(registroAccion.tipo),
    etiquetaEstado: formatearEstadoSincronizacion(registroAccion.estado_sincronizacion),
    fechaFormateada: formatearFechaHoraLocal(registroAccion.creado_en || registroAccion.actualizado_en),
    activoDetalle: {
      nombre: nombreActivo,
      codigo: codigoActivo,
      ubicacion: ubicacionActivo,
    },
    ordenDetalle: {
      titulo: tituloOrden,
      codigo: codigoOrden,
      diagnostico: payload.diagnostico_tecnico || payload.resolucion || ordenEncontrada?.diagnostico_tecnico || null,
      prioridad: payload.prioridad || ordenEncontrada?.prioridad || null,
    },
  };
};

/**
 * Hook para monitorear en tiempo real la cola de acciones pendientes de sincronización
 * y proveer la capacidad de forzar una sincronización manual con retroalimentación de estado.
 */
export const useColaSincronizacion = () => {
  const [accionesPendientes, setAccionesPendientes] = useState([]);
  const [cantidadPendientes, setCantidadPendientes] = useState(0);
  const [estaSincronizando, setEstaSincronizando] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState(null);
  const estaMontadoRef = useRef(true);

  const cargarColaPendiente = useCallback(async () => {
    try {
      const colaCompleta = await obtenerColaAccionesOffline();
      const registrosFiltrados = (colaCompleta || []).filter((registro) =>
        registro.estado_sincronizacion === 'pendiente' ||
        registro.estado_sincronizacion === 'sincronizando' ||
        registro.estado_sincronizacion === 'error'
      );

      if (!estaMontadoRef.current) return;
      setCantidadPendientes(registrosFiltrados.length);

      const accionesEnriquecidas = await Promise.all(
        registrosFiltrados.map((registro) => enriquecerAccionConDetalles(registro))
      );

      if (!estaMontadoRef.current) return;
      setAccionesPendientes(accionesEnriquecidas);
    } catch {
      if (estaMontadoRef.current) {
        setAccionesPendientes([]);
        setCantidadPendientes(0);
      }
    }
  }, []);

  const forzarSincronizacionManual = useCallback(async () => {
    if (estaSincronizando) return null;
    setEstaSincronizando(true);
    setUltimoResultado(null);

    try {
      const resultado = await sincronizarEnPrimerPlano();
      if (estaMontadoRef.current) {
        setUltimoResultado(resultado);
      }
      await cargarColaPendiente();
      return resultado;
    } catch (error) {
      const resultadoError = {
        omitido: true,
        motivo: 'error_inesperado',
        error: error?.message || 'Error desconocido durante la sincronización',
      };
      if (estaMontadoRef.current) {
        setUltimoResultado(resultadoError);
      }
      await cargarColaPendiente();
      return resultadoError;
    } finally {
      if (estaMontadoRef.current) {
        setEstaSincronizando(false);
      }
    }
  }, [estaSincronizando, cargarColaPendiente]);

  useEffect(() => {
    estaMontadoRef.current = true;
    void cargarColaPendiente();

    const manejadorActualizacionCola = () => {
      void cargarColaPendiente();
    };

    const manejadorSincronizacionCompletada = (eventoPersonalizado) => {
      if (estaMontadoRef.current && eventoPersonalizado?.detail) {
        setUltimoResultado(eventoPersonalizado.detail);
      }
      void cargarColaPendiente();
    };

    const manejadorLimpiezaBaseDatos = () => {
      if (estaMontadoRef.current) {
        setAccionesPendientes([]);
        setCantidadPendientes(0);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('offline-queue-updated', manejadorActualizacionCola);
      window.addEventListener('offline-sync-completed', manejadorSincronizacionCompletada);
      window.addEventListener('offline-db-cleared', manejadorLimpiezaBaseDatos);
      window.addEventListener('online', manejadorActualizacionCola);
      window.addEventListener('offline', manejadorActualizacionCola);
      window.addEventListener('tecnico-cambiado', manejadorActualizacionCola);
    }

    return () => {
      estaMontadoRef.current = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('offline-queue-updated', manejadorActualizacionCola);
        window.removeEventListener('offline-sync-completed', manejadorSincronizacionCompletada);
        window.removeEventListener('offline-db-cleared', manejadorLimpiezaBaseDatos);
        window.removeEventListener('online', manejadorActualizacionCola);
        window.removeEventListener('offline', manejadorActualizacionCola);
        window.removeEventListener('tecnico-cambiado', manejadorActualizacionCola);
      }
    };
  }, [cargarColaPendiente]);

  return {
    accionesPendientes,
    cantidadPendientes,
    estaSincronizando,
    ultimoResultado,
    cargarColaPendiente,
    forzarSincronizacionManual,
  };
};

export default useColaSincronizacion;
