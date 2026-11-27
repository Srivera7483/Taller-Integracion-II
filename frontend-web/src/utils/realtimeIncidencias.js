/**
 * TAL-187: Utilidades puras para actualización reactiva en vivo de incidencias, órdenes y métricas
 * en menos de 500ms (< 2ms en memoria), sin parpadeos bruscos ni pérdida de scroll o foco.
 */

const normalizarTexto = (val = '') =>
  String(val)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const extraerNombreEstado = (estado) => {
  if (!estado) return 'Reportada';
  if (typeof estado === 'object') {
    return estado.nombre_estado || estado.nombre || 'Reportada';
  }
  return String(estado);
};

export const formatearNombreEstadoCanonico = (estadoRaw) => {
  const norm = normalizarTexto(estadoRaw);
  if (norm === 'asignada' || norm === 'en_proceso' || norm === 'en proceso' || norm === 'en progreso') {
    return 'Asignada';
  }
  if (norm === 'resuelta' || norm === 'completada' || norm === 'cerrada') return 'Resuelta';
  if (norm === 'rechazada' || norm === 'rechazado') return 'Rechazada';
  if (norm === 'reportada' || norm === 'pendiente') return 'Reportada';
  return estadoRaw || 'Reportada';
};

export const esEstadoResuelto = (estadoRaw) => {
  const norm = normalizarTexto(estadoRaw);
  return norm === 'resuelta' || norm === 'completada';
};

export const esEstadoFinalizado = (estadoRaw) => {
  const norm = normalizarTexto(estadoRaw);
  return (
    norm === 'resuelta' ||
    norm === 'completada' ||
    norm === 'cerrada' ||
    norm === 'rechazada' ||
    norm === 'rechazado'
  );
};

export const esPrioridadCriticaOAlta = (prioridadRaw) => {
  const norm = normalizarTexto(prioridadRaw);
  return norm === 'critica' || norm === 'alta';
};

/**
 * CA-1 y CA-3: Aplica en memoria (< 1ms) una actualización de estado, prioridad o asignación
 * sobre la lista actual, preservando la referencia de los demás elementos para evitar re-renders
 * innecesarios, parpadeos o pérdida de scroll/foco.
 *
 * @param {Array<Object>} listaActual
 * @param {Object} payload
 * @returns {{ lista: Array<Object>, itemAnterior: Object|null, itemActualizado: Object|null, modificado: boolean }}
 */
export const aplicarActualizacionIncidenciaEnVivo = (listaActual = [], payload = {}) => {
  if (!Array.isArray(listaActual) || !payload) {
    return { lista: listaActual, itemAnterior: null, itemActualizado: null, modificado: false };
  }

  const targetId = payload.id_incidencia || payload.id;
  if (!targetId) {
    return { lista: listaActual, itemAnterior: null, itemActualizado: null, modificado: false };
  }

  let itemAnterior = null;
  let itemActualizado = null;
  let modificado = false;

  const nuevaLista = listaActual.map((item) => {
    const itemId = item?.id_incidencia || item?.id;
    if (String(itemId) !== String(targetId)) {
      return item;
    }

    itemAnterior = item;
    modificado = true;

    const estadoCanónico = payload.nuevo_estado
      ? formatearNombreEstadoCanonico(payload.nuevo_estado)
      : extraerNombreEstado(item.estado);

    const estadoActualizado =
      typeof item.estado === 'object' && item.estado !== null
        ? { ...item.estado, nombre_estado: estadoCanónico }
        : { nombre_estado: estadoCanónico };

    const esAsignacion =
      payload.tipo_evento === 'ASIGNACION_ORDEN' ||
      normalizarTexto(payload.nuevo_estado) === 'asignada';

    const nuevoTecnicoId = esAsignacion
      ? payload.id_tecnico || payload.usuario_responsable || item.id_tecnico
      : item.id_tecnico;

    const ordenActualizada =
      esAsignacion && nuevoTecnicoId
        ? {
            ...(item.orden_trabajo || {}),
            id_incidencia: targetId,
            id_tecnico: nuevoTecnicoId,
          }
        : item.orden_trabajo;

    itemActualizado = {
      ...item,
      ...(payload.titulo ? { titulo: payload.titulo } : {}),
      ...(payload.prioridad ? { prioridad: payload.prioridad } : {}),
      estado: estadoActualizado,
      ...(nuevoTecnicoId
        ? {
            id_tecnico: nuevoTecnicoId,
            id_tecnico_asignado: nuevoTecnicoId,
            tecnico_asignado: item.nombre_tecnico || nuevoTecnicoId,
            orden_trabajo: ordenActualizada,
          }
        : {}),
      _ultimaActualizacionWs: payload.timestamp || new Date().toISOString(),
    };

    return itemActualizado;
  });

  return {
    lista: modificado ? nuevaLista : listaActual,
    itemAnterior,
    itemActualizado,
    modificado,
  };
};

/**
 * CA-1 y CA-3: Inserta o actualiza una nueva incidencia reportada por otro usuario en la parte
 * superior del tablero en < 1ms, evitando duplicados si ya se encontraba en memoria.
 *
 * @param {Array<Object>} listaActual
 * @param {Object} payload
 * @returns {{ lista: Array<Object>, esNueva: boolean, item: Object|null }}
 */
export const aplicarNuevaIncidenciaEnVivo = (listaActual = [], payload = {}) => {
  if (!Array.isArray(listaActual) || !payload) {
    return { lista: listaActual, esNueva: false, item: null };
  }

  const idIncidencia = payload.id_incidencia || payload.id;
  if (!idIncidencia) {
    return { lista: listaActual, esNueva: false, item: null };
  }

  const yaExiste = listaActual.some(
    (inc) => String(inc?.id_incidencia || inc?.id) === String(idIncidencia),
  );

  if (yaExiste) {
    const { lista, itemActualizado } = aplicarActualizacionIncidenciaEnVivo(listaActual, {
      ...payload,
      id_incidencia: idIncidencia,
      nuevo_estado: extraerNombreEstado(payload.estado),
    });
    return { lista, esNueva: false, item: itemActualizado };
  }

  const estadoNombre = formatearNombreEstadoCanonico(extraerNombreEstado(payload.estado));
  const nuevaNormalizada = {
    ...payload,
    id_incidencia: idIncidencia,
    id: idIncidencia,
    titulo: payload.titulo || 'Nueva incidencia reportada',
    descripcion: payload.descripcion || '',
    prioridad: payload.prioridad || 'media',
    estado:
      typeof payload.estado === 'object' && payload.estado !== null
        ? payload.estado
        : { id_estado: 1, nombre_estado: estadoNombre },
    fecha_creacion: payload.fecha_creacion || payload.timestamp || new Date().toISOString(),
    _ultimaActualizacionWs: payload.timestamp || new Date().toISOString(),
  };

  return {
    lista: [nuevaNormalizada, ...listaActual],
    esNueva: true,
    item: nuevaNormalizada,
  };
};

/**
 * CA-2: Actualiza en sincronía inmediata los contadores globales de métricas del Dashboard
 * (`total`, `pendientes`, `criticas`, `resueltas`) ante eventos de creación o transición.
 *
 * @param {Object|null} resumenActual
 * @param {Object} params
 * @param {'NUEVA'|'ACTUALIZADA'} params.tipo
 * @param {Object|null} [params.itemAnterior]
 * @param {Object|null} [params.itemNuevo]
 * @param {Object} [params.payload]
 * @returns {Object|null}
 */
export const sincronizarResumenMetricasEnVivo = (
  resumenActual,
  { tipo, itemAnterior = null, itemNuevo = null, payload = {} } = {},
) => {
  if (!resumenActual || typeof resumenActual.total !== 'number') {
    return resumenActual;
  }

  const siguiente = {
    ...resumenActual,
    total: resumenActual.total ?? 0,
    pendientes: resumenActual.pendientes ?? 0,
    criticas: resumenActual.criticas ?? 0,
    resueltas: resumenActual.resueltas ?? 0,
    cerradas: resumenActual.cerradas ?? 0,
  };

  if (tipo === 'NUEVA') {
    siguiente.total += 1;
    const estadoNuevo = extraerNombreEstado(itemNuevo?.estado ?? payload?.estado);
    if (!esEstadoFinalizado(estadoNuevo)) {
      siguiente.pendientes += 1;
      if (esPrioridadCriticaOAlta(itemNuevo?.prioridad ?? payload?.prioridad)) {
        siguiente.criticas += 1;
      }
    } else if (esEstadoResuelto(estadoNuevo)) {
      siguiente.resueltas += 1;
    }
    return siguiente;
  }

  if (tipo === 'ACTUALIZADA' && itemAnterior) {
    const estadoPrev = extraerNombreEstado(itemAnterior.estado);
    const estadoNext = extraerNombreEstado(itemNuevo?.estado ?? payload?.nuevo_estado ?? estadoPrev);
    const prioPrev = itemAnterior.prioridad || 'media';
    const prioNext = itemNuevo?.prioridad ?? payload?.prioridad ?? prioPrev;

    const eraFinalizada = esEstadoFinalizado(estadoPrev);
    const esFinalizadaAhora = esEstadoFinalizado(estadoNext);
    const eraResuelta = esEstadoResuelto(estadoPrev);
    const esResueltaAhora = esEstadoResuelto(estadoNext);

    if (!eraFinalizada && esFinalizadaAhora) {
      siguiente.pendientes = Math.max(0, siguiente.pendientes - 1);
      if (esPrioridadCriticaOAlta(prioPrev)) {
        siguiente.criticas = Math.max(0, siguiente.criticas - 1);
      }
    } else if (eraFinalizada && !esFinalizadaAhora) {
      siguiente.pendientes += 1;
      if (esPrioridadCriticaOAlta(prioNext)) {
        siguiente.criticas += 1;
      }
    } else if (!eraFinalizada && !esFinalizadaAhora) {
      const eraCritica = esPrioridadCriticaOAlta(prioPrev);
      const esCriticaAhora = esPrioridadCriticaOAlta(prioNext);
      if (!eraCritica && esCriticaAhora) {
        siguiente.criticas += 1;
      } else if (eraCritica && !esCriticaAhora) {
        siguiente.criticas = Math.max(0, siguiente.criticas - 1);
      }
    }

    if (!eraResuelta && esResueltaAhora) {
      siguiente.resueltas += 1;
    } else if (eraResuelta && !esResueltaAhora) {
      siguiente.resueltas = Math.max(0, siguiente.resueltas - 1);
    }
  }

  return siguiente;
};
