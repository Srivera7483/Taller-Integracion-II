/**
 * Utilidades y lógica de dominio para el sistema de notificaciones en tiempo real (TAL-190).
 */

/**
 * Datos iniciales de la campana de notificaciones:
 * Inicialmente vacía hasta que se registre un suceso reciente en el sistema.
 */
export const NOTIFICACIONES_INICIALES = [];

/**
 * Formatea el número de notificaciones no leídas para el badge visual.
 * Muestra el número exacto con prefijo '+', por ejemplo: '+1', '+3', '+99'.
 *
 * @param {number} count - Número de alertas no leídas.
 * @returns {string} Texto a mostrar en el badge (ej. '+1', '+3', '+99', o '' si es 0).
 */
export const formatBadgeCount = (count) => {
  if (typeof count !== 'number' || count <= 0) return '';
  if (count > 99) return '+99';
  return `+${count}`;
};

/**
 * Calcula el número exacto de notificaciones no leídas en una colección.
 *
 * @param {Array<{ leida?: boolean }>} notificaciones
 * @returns {number}
 */
export const contarNoLeidas = (notificaciones = []) => {
  if (!Array.isArray(notificaciones)) return 0;
  return notificaciones.filter((n) => !n.leida).length;
};

/**
 * Retorna una copia de la colección con todas las notificaciones marcadas como leídas.
 *
 * @param {Array<Object>} notificaciones
 * @returns {Array<Object>}
 */
export const marcarTodasComoLeidas = (notificaciones = []) => {
  if (!Array.isArray(notificaciones)) return [];
  return notificaciones.map((item) => ({ ...item, leida: true }));
};

/**
 * Marca como leída una notificación específica por su ID.
 *
 * @param {Array<Object>} notificaciones
 * @param {string|number} id
 * @returns {Array<Object>}
 */
export const marcarNotificacionComoLeida = (notificaciones = [], id) => {
  if (!Array.isArray(notificaciones)) return [];
  return notificaciones.map((item) => (item.id === id ? { ...item, leida: true } : item));
};

/**
 * Normaliza y formatea el texto de una prioridad para presentación visual legible.
 * Ejemplo: 'alta' -> 'Alta', 'critica' -> 'Crítica', 'media' -> 'Media', 'baja' -> 'Baja'.
 *
 * @param {string} [prioridad]
 * @returns {string}
 */
export const formatearPrioridadTexto = (prioridad) => {
  if (!prioridad || typeof prioridad !== 'string') return 'Media';
  const norm = prioridad.trim().toLowerCase();
  if (norm === 'critica' || norm === 'crítica') return 'Crítica';
  if (norm === 'alta') return 'Alta';
  if (norm === 'media') return 'Media';
  if (norm === 'baja') return 'Baja';
  return norm.charAt(0).toUpperCase() + norm.slice(1);
};

/**
 * Genera una clave canónica para identificar unívocamente un suceso notificativo
 * y prevenir duplicaciones causadas por re-emisiones de red o broadcasts múltiples de salas.
 *
 * @param {Object} payload
 * @param {string} [eventName='evento']
 * @returns {string}
 */
export const generarClaveDeduplicacion = (payload = {}, eventName = 'evento') => {
  const normEvent = ['estado_cambiado', 'incidencia_actualizada', 'incidencia-actualizada'].includes(
    String(eventName).replace('-', '_').toLowerCase(),
  )
    ? 'actualizacion'
    : ['nueva_incidencia', 'nueva-incidencia'].includes(
        String(eventName).replace('-', '_').toLowerCase(),
      )
    ? 'nueva'
    : String(eventName).replace('-', '_').toLowerCase();

  const incId = payload?.id_incidencia || payload?.id || '';
  const ordId = payload?.id_orden || '';
  const ref = incId || ordId || payload?.titulo || '';
  const subTipo =
    payload?.accion ||
    payload?.tipo_cambio ||
    (payload?.cambio_prioridad ? `prio_${payload?.prioridad}` : null) ||
    payload?.nuevo_estado ||
    payload?.estado ||
    payload?.tipo_evento ||
    payload?.prioridad ||
    '';
  return `${normEvent}:${ref}:${subTipo}`;
};

/**
 * Normaliza cualquier carga útil recibida por WebSocket en una notificación utilizable,
 * asignando un identificador determinista para evitar multiplicaciones en memoria.
 *
 * @param {Object} payload - Carga útil recibida desde el socket o API.
 * @param {string} [eventName='evento'] - Nombre del evento disparador.
 * @returns {Object} Estructura normalizada de notificación.
 */
export const normalizarEventoNotificacion = (payload, eventName = 'evento') => {
  const incId = payload?.id_incidencia || payload?.id || '';
  const ordenId = payload?.id_orden || '';
  const claveDeduplicacion = generarClaveDeduplicacion(payload, eventName);
  const timestamp = payload?.timestamp || new Date().toISOString();

  // Nombre representativo de la incidencia (prioriza título de la incidencia sobre IDs crudos)
  const nombreIncidencia =
    payload?.titulo ||
    payload?.nombre_incidencia ||
    payload?.incidencia_titulo ||
    payload?.nombre ||
    (incId ? `${incId}` : 'de servicio');

  const refIncidencia = String(nombreIncidencia).trim().startsWith('#')
    ? String(nombreIncidencia).trim()
    : `#${String(nombreIncidencia).trim()}`;

  // 1. Asignación de orden de trabajo
  if (
    eventName === 'orden_asignada' ||
    payload?.tipo_evento === 'ASIGNACION_ORDEN' ||
    payload?.evento === 'ORDEN_TRABAJO_ASIGNADA' ||
    Boolean(ordenId)
  ) {
    const numRef = ordenId ? `#${ordenId}` : refIncidencia;
    const idNotif = `orden_${ordenId || incId}_${payload?.id_tecnico || payload?.usuario_responsable || 'asig'}`;

    return {
      id: idNotif,
      claveDeduplicacion,
      idReferencia: incId || ordenId,
      titulo: 'Asignación de orden',
      mensaje: `Te han asignado la Orden ${numRef}`.trim(),
      detalle: payload?.detalle || payload?.titulo || 'Nueva orden de trabajo asignada a tu bandeja',
      tiempo: 'Ahora mismo',
      timestamp,
      leida: false,
      tipo: 'orden',
      enlace: incId ? `/incidencias/${incId}` : '/incidencias',
    };
  }

  // 2. Cambio de prioridad de incidencia (ej. Baja, Media, Alta, Crítica)
  const esCambioPrioridad =
    payload?.accion === 'CAMBIO_PRIORIDAD' ||
    payload?.tipo_cambio === 'CAMBIO_PRIORIDAD' ||
    payload?.cambio_prioridad === true ||
    eventName === 'prioridad_cambiada' ||
    eventName === 'cambio_prioridad' ||
    payload?.tipo_evento === 'CAMBIO_PRIORIDAD' ||
    Boolean(
      payload?.prioridad &&
      (payload?.tipo_evento === 'CAMBIO_ESTADO' || eventName === 'incidencia_actualizada') &&
      (!payload?.nuevo_estado ||
        payload?.nuevo_estado === 'Reportada' ||
        payload?.nuevo_estado === payload?.estado_anterior)
    );

  if (esCambioPrioridad) {
    const prioridadTexto = formatearPrioridadTexto(payload?.prioridad);
    const idNotif = `prioridad_${incId || nombreIncidencia}_${prioridadTexto.toLowerCase()}`;

    return {
      id: idNotif,
      claveDeduplicacion,
      idReferencia: incId,
      titulo: 'Prioridad actualizada',
      mensaje: `Incidencia ${refIncidencia} cambió a '${prioridadTexto}'`.trim(),
      detalle:
        payload?.detalle ||
        `Prioridad clasificada como ${prioridadTexto} en el sistema`,
      tiempo: 'Ahora mismo',
      timestamp,
      leida: false,
      tipo: 'incidencia',
      enlace: incId ? `/incidencias/${incId}` : '/incidencias',
    };
  }

  // 3. Cambio de estado de incidencia
  if (
    eventName === 'estado_cambiado' ||
    payload?.tipo_evento === 'CAMBIO_ESTADO' ||
    Boolean(payload?.nuevo_estado)
  ) {
    const estado = payload?.nuevo_estado || payload?.estado || 'Actualizado';
    const idNotif = `estado_${incId || nombreIncidencia}_${estado}`;

    return {
      id: idNotif,
      claveDeduplicacion,
      idReferencia: incId,
      titulo: 'Estado actualizado',
      mensaje: `Incidencia ${refIncidencia} cambió a ${estado}`.trim(),
      detalle:
        payload?.detalle ||
        `Transición registrada por ${payload?.usuario_responsable || 'el sistema'}`,
      tiempo: 'Ahora mismo',
      timestamp,
      leida: false,
      tipo: 'estado',
      enlace: incId ? `/incidencias/${incId}` : '/incidencias',
    };
  }

  // 4. Nueva incidencia reportada
  if (
    eventName === 'nueva_incidencia' ||
    eventName === 'nueva-incidencia' ||
    payload?.tipo_evento === 'NUEVA_INCIDENCIA' ||
    Boolean(payload?.titulo)
  ) {
    const tituloInc = payload?.titulo || 'Nueva incidencia';
    const idNotif = `nueva_${incId || tituloInc}`;

    return {
      id: idNotif,
      claveDeduplicacion,
      idReferencia: incId,
      titulo: 'Nueva incidencia reportada',
      mensaje: incId ? `${tituloInc} (#${incId})` : tituloInc,
      detalle:
        payload?.descripcion ||
        payload?.detalle ||
        `Prioridad: ${formatearPrioridadTexto(payload?.prioridad || 'Media')}`,
      tiempo: 'Ahora mismo',
      timestamp,
      leida: false,
      tipo: 'incidencia',
      enlace: incId ? `/incidencias/${incId}` : '/incidencias',
    };
  }

  // 5. Notificación general / genérica
  const idNotif = `notif_${claveDeduplicacion}`;
  return {
    id: idNotif,
    claveDeduplicacion,
    idReferencia: incId || ordenId,
    titulo: payload?.titulo || 'Notificación del sistema',
    mensaje: payload?.mensaje || 'Se ha registrado una nueva actividad en la plataforma',
    detalle: payload?.detalle || '',
    tiempo: 'Ahora mismo',
    timestamp,
    leida: false,
    tipo: payload?.tipo || 'sistema',
    enlace: payload?.enlace || '/incidencias',
  };
};

/**
 * Inserta una nueva notificación únicamente si no existe ya un registro equivalente,
 * eliminando duplicados provocados por salas múltiples, alias de eventos o re-emisiones.
 *
 * @param {Array<Object>} listaActual
 * @param {Object} nuevaNotif
 * @returns {Array<Object>}
 */
export const agregarNotificacionSinDuplicados = (listaActual = [], nuevaNotif) => {
  if (!nuevaNotif || !Array.isArray(listaActual)) {
    return listaActual;
  }

  const yaExiste = listaActual.some((item) => {
    // 1. Mismo ID exacto
    if (item.id && nuevaNotif.id && String(item.id) === String(nuevaNotif.id)) {
      return true;
    }
    // 2. Misma clave de deduplicación
    if (
      item.claveDeduplicacion &&
      nuevaNotif.claveDeduplicacion &&
      item.claveDeduplicacion === nuevaNotif.claveDeduplicacion
    ) {
      return true;
    }
    // 3. Mismo recurso objetivo (ej: id_incidencia) y mismo tipo/acción
    if (
      item.idReferencia &&
      nuevaNotif.idReferencia &&
      String(item.idReferencia) === String(nuevaNotif.idReferencia) &&
      item.tipo === nuevaNotif.tipo
    ) {
      if (item.titulo === nuevaNotif.titulo && item.mensaje === nuevaNotif.mensaje) {
        return true;
      }
    }
    return false;
  });

  if (yaExiste) {
    return listaActual;
  }

  return [nuevaNotif, ...listaActual];
};
