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
 * Calcula el tiempo relativo dinámico transcurrido desde una fecha/timestamp.
 * Ejemplos:
 *  - Menos de 60 segundos: 'Ahora mismo'
 *  - 1 minuto: '1 minuto'
 *  - 2 a 59 minutos: '2 minutos', ..., 'n minutos'
 *  - 1 hora: '1 hora'
 *  - 2 a 23 horas: '2 horas', ..., 'n horas'
 *  - 1 día: '1 día'
 *  - Más de 1 día: 'n días'
 *
 * @param {string|Date|number} timestamp - Marca de tiempo ISO o Date.
 * @param {string} [fallback='Ahora mismo'] - Valor por defecto ante fecha inválida.
 * @returns {string} Texto de tiempo relativo formateado.
 */
export const calcularTiempoRelativo = (timestamp, fallback = 'Ahora mismo') => {
  if (!timestamp) return fallback;
  const fecha = new Date(timestamp);
  if (Number.isNaN(fecha.getTime())) return fallback;

  const ahora = Date.now();
  const diffSegundos = Math.max(0, Math.floor((ahora - fecha.getTime()) / 1000));

  if (diffSegundos < 60) {
    return 'Ahora mismo';
  }

  const minutos = Math.floor(diffSegundos / 60);
  if (minutos === 1) {
    return '1 minuto';
  }
  if (minutos < 60) {
    return `${minutos} minutos`;
  }

  const horas = Math.floor(minutos / 60);
  if (horas === 1) {
    return '1 hora';
  }
  if (horas < 24) {
    return `${horas} horas`;
  }

  const dias = Math.floor(horas / 24);
  if (dias === 1) {
    return '1 día';
  }
  return `${dias} días`;
};

/**
 * Obtiene el ID canónico del usuario autenticado a partir de su objeto de sesión.
 *
 * @param {Object|null} usuario
 * @returns {string}
 */
export const obtenerIdUsuarioActual = (usuario) => {
  if (!usuario) return '';
  return String(
    usuario.id_usuario ||
    usuario.id ||
    usuario.userId ||
    usuario.sub ||
    ''
  ).trim().toLowerCase();
};

/**
 * Obtiene y normaliza el nombre del rol del usuario autenticado.
 *
 * @param {Object|null} usuario
 * @returns {string} 'ADMINISTRADOR' | 'SUPERVISOR' | 'TECNICO' | 'REPORTANTE' | ''
 */
export const obtenerRolUsuarioActual = (usuario) => {
  if (!usuario) return '';
  const rolRaw =
    usuario?.rol?.nombre_rol ||
    usuario?.rol?.nombre ||
    usuario?.rol ||
    usuario?.role ||
    '';
  return String(rolRaw)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Obtiene la clave exclusiva de localStorage para almacenar las notificaciones de un usuario.
 *
 * @param {Object|null} usuario
 * @returns {string|null}
 */
export const obtenerStorageKeyNotificaciones = (usuario) => {
  if (!usuario) return null;
  const id =
    usuario.id_usuario ||
    usuario.id ||
    usuario.userId ||
    usuario.rut_o_id ||
    usuario.correo ||
    usuario.email ||
    null;
  return id ? `notificaciones_${id}` : null;
};

/**
 * Determina si el usuario autenticado tiene visibilidad autorizada para recibir
 * una notificación según su rol y el tipo de evento:
 *
 * 1. Cambios de prioridad: ÚNICAMENTE rol 'supervisor'.
 * 2. Nueva incidencia: El creador/reportante de la incidencia, 'supervisor' y 'administrador'.
 * 3. Asignación de orden: El técnico a quien se le asignó la orden, 'supervisor' y 'administrador'.
 *
 * @param {Object} payload - Carga útil del evento recibido por WebSocket.
 * @param {string} [eventName='evento'] - Nombre del evento Socket.io.
 * @param {Object|null} usuario - Usuario autenticado actual.
 * @returns {boolean} True si el usuario debe recibir y visualizar la notificación.
 */
export const debeRecibirNotificacion = (payload = {}, eventName = 'evento', usuario = null) => {
  if (!usuario) {
    return false;
  }

  const rol = obtenerRolUsuarioActual(usuario);
  const idUsuario = obtenerIdUsuarioActual(usuario);

  // 1. Detección de cambio de prioridad
  const esCambioPrioridad =
    payload?.accion === 'CAMBIO_PRIORIDAD' ||
    payload?.tipo_cambio === 'CAMBIO_PRIORIDAD' ||
    payload?.cambio_prioridad === true ||
    payload?.tipo_evento === 'CAMBIO_PRIORIDAD' ||
    eventName === 'prioridad_cambiada' ||
    eventName === 'cambio_prioridad' ||
    Boolean(
      payload?.prioridad &&
      (payload?.tipo_evento === 'CAMBIO_ESTADO' || eventName === 'incidencia_actualizada') &&
      (!payload?.nuevo_estado ||
        payload?.nuevo_estado === 'Reportada' ||
        payload?.nuevo_estado === payload?.estado_anterior)
    );

  if (esCambioPrioridad) {
    // REGLA 1: Usuarios con el rol de "supervisor" y "administrador"
    return rol === 'SUPERVISOR' || rol === 'ADMINISTRADOR';
  }

  // 2. Detección de asignación o reasignación de orden
  const esAsignacionOrden =
    eventName === 'orden_asignada' ||
    payload?.tipo_evento === 'ASIGNACION_ORDEN' ||
    payload?.tipo_evento === 'REASIGNACION_ORDEN' ||
    payload?.evento === 'ORDEN_TRABAJO_ASIGNADA' ||
    payload?.evento === 'ORDEN_TRABAJO_REASIGNADA' ||
    payload?.accion === 'REASIGNACION' ||
    payload?.es_reasignacion === true ||
    Boolean(payload?.id_orden && (payload?.id_tecnico || payload?.usuario_responsable));

  if (esAsignacionOrden) {
    // REGLA 3: Aparecerá ESPECÍFICAMENTE al usuario a quien se le asignó la orden,
    // a todos los usuarios con rol de supervisor, y a todos los usuarios con rol de administrador
    if (rol === 'SUPERVISOR' || rol === 'ADMINISTRADOR') {
      return true;
    }

    const idAsignado = String(
      payload?.id_tecnico ||
      payload?.usuario_responsable ||
      payload?.id_tecnico_asignado ||
      payload?.tecnico_id ||
      payload?.id_usuario ||
      ''
    ).trim().toLowerCase();

    return Boolean(idUsuario && idAsignado && idUsuario === idAsignado);
  }

  // 3. Detección de nueva incidencia reportada
  const esNuevaIncidencia =
    eventName === 'nueva_incidencia' ||
    eventName === 'nueva-incidencia' ||
    payload?.tipo_evento === 'NUEVA_INCIDENCIA' ||
    Boolean(payload?.titulo && !payload?.id_orden && !payload?.cambio_prioridad && payload?.accion !== 'CAMBIO_PRIORIDAD');

  if (esNuevaIncidencia) {
    // REGLA 2: ÚNICAMENTE al usuario quien creó esa incidencia, a todos los usuarios
    // con rol de supervisor y a todos los usuarios con rol de administrador
    if (rol === 'SUPERVISOR' || rol === 'ADMINISTRADOR') {
      return true;
    }

    const idCreador = String(
      payload?.id_reportante ||
      payload?.id_usuario ||
      payload?.usuarioId ||
      payload?.creador_id ||
      payload?.id_usuario_reportante ||
      payload?.usuario_reportante ||
      payload?.reportante_id ||
      ''
    ).trim().toLowerCase();

    return Boolean(idUsuario && idCreador && idUsuario === idCreador);
  }

  // 4. Otros eventos del sistema (ej: cambios de estado generales)
  if (rol === 'SUPERVISOR' || rol === 'ADMINISTRADOR') {
    return true;
  }
  const idReportante = String(payload?.id_reportante || payload?.id_usuario || '').trim().toLowerCase();
  const idResponsable = String(payload?.usuario_responsable || payload?.id_tecnico || '').trim().toLowerCase();

  return Boolean(idUsuario && (idUsuario === idReportante || idUsuario === idResponsable));
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

  // Detección de asignación o reasignación de orden de trabajo
  const esAsignacionOrden =
    eventName === 'orden_asignada' ||
    payload?.tipo_evento === 'ASIGNACION_ORDEN' ||
    payload?.tipo_evento === 'REASIGNACION_ORDEN' ||
    payload?.evento === 'ORDEN_TRABAJO_ASIGNADA' ||
    payload?.evento === 'ORDEN_TRABAJO_REASIGNADA' ||
    payload?.accion === 'REASIGNACION' ||
    payload?.es_reasignacion === true ||
    Boolean(payload?.id_orden && (payload?.id_tecnico || payload?.usuario_responsable));

  if (esAsignacionOrden) {
    const idTecnico = String(
      payload?.id_tecnico ||
      payload?.usuario_responsable ||
      payload?.id_tecnico_asignado ||
      payload?.tecnico_id ||
      '',
    ).trim().toLowerCase();
    const esReasig = Boolean(
      payload?.es_reasignacion === true ||
      payload?.accion === 'REASIGNACION' ||
      payload?.tipo_cambio === 'REASIGNACION' ||
      payload?.tipo_evento === 'REASIGNACION_ORDEN' ||
      payload?.evento === 'ORDEN_TRABAJO_REASIGNADA' ||
      payload?.tecnico_anterior_id,
    );
    // Asignaciones y reasignaciones poseen claves deterministas propias por técnico/orden
    return `orden_${esReasig ? 'reasig' : 'asig'}:${incId}:${ordId || idTecnico || 'asig'}`;
  }

  const esCambioPrioridad =
    payload?.accion === 'CAMBIO_PRIORIDAD' ||
    payload?.tipo_cambio === 'CAMBIO_PRIORIDAD' ||
    payload?.cambio_prioridad === true ||
    payload?.tipo_evento === 'CAMBIO_PRIORIDAD' ||
    eventName === 'prioridad_cambiada' ||
    eventName === 'cambio_prioridad' ||
    Boolean(
      payload?.prioridad &&
      (payload?.tipo_evento === 'CAMBIO_ESTADO' || eventName === 'incidencia_actualizada') &&
      (!payload?.nuevo_estado ||
        payload?.nuevo_estado === 'Reportada' ||
        payload?.nuevo_estado === payload?.estado_anterior)
    );

  const subTipo = esCambioPrioridad && payload?.prioridad
    ? `prio_${String(payload.prioridad).trim().toLowerCase()}`
    : payload?.accion ||
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
export const normalizarEventoNotificacion = (payload, eventName = 'evento', usuarioActual = null) => {
  const incId = payload?.id_incidencia || payload?.id || '';
  const ordenId = payload?.id_orden || '';
  const claveDeduplicacion = generarClaveDeduplicacion(payload, eventName);
  const timestamp = payload?.timestamp || new Date().toISOString();

  // Obtener usuario autenticado para personalizar el mensaje según destinatario
  let user = usuarioActual;
  if (!user && typeof localStorage !== 'undefined') {
    try {
      const rawUser = localStorage.getItem('usuario');
      if (rawUser) user = JSON.parse(rawUser);
    } catch {}
  }
  const idUsuarioActual = obtenerIdUsuarioActual(user);

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

  // 1. Asignación o reasignación de orden de trabajo
  const esAsignacionOrden =
    eventName === 'orden_asignada' ||
    payload?.tipo_evento === 'ASIGNACION_ORDEN' ||
    payload?.tipo_evento === 'REASIGNACION_ORDEN' ||
    payload?.evento === 'ORDEN_TRABAJO_ASIGNADA' ||
    payload?.evento === 'ORDEN_TRABAJO_REASIGNADA' ||
    payload?.accion === 'REASIGNACION' ||
    payload?.es_reasignacion === true ||
    Boolean(ordenId);

  if (esAsignacionOrden) {
    const esReasignacion = Boolean(
      payload?.es_reasignacion === true ||
      payload?.accion === 'REASIGNACION' ||
      payload?.tipo_cambio === 'REASIGNACION' ||
      payload?.tipo_evento === 'REASIGNACION_ORDEN' ||
      payload?.evento === 'ORDEN_TRABAJO_REASIGNADA' ||
      payload?.tecnico_anterior_id,
    );

    const idAsignado = String(
      payload?.id_tecnico ||
      payload?.usuario_responsable ||
      payload?.id_tecnico_asignado ||
      payload?.tecnico_id ||
      ''
    ).trim().toLowerCase();

    const esTecnicoAsignado = Boolean(idUsuarioActual && idAsignado && idUsuarioActual === idAsignado);

    const idNotif = `orden_${esReasignacion ? 'reasig' : 'asig'}_${ordenId || incId}_${idAsignado || 'asig'}`;

    const nombreTecnico =
      payload?.nombre_tecnico ||
      payload?.tecnico_asignado ||
      payload?.nombre_tecnico_asignado ||
      payload?.tecnico?.nombre_completo ||
      payload?.tecnico?.nombre ||
      (payload?.id_tecnico ? `ID ${String(payload.id_tecnico).substring(0, 8)}` : null) ||
      'Técnico asignado';

    let mensaje = '';
    if (esTecnicoAsignado) {
      mensaje = `Te han asignado la Incidencia ${refIncidencia}`;
    } else if (esReasignacion) {
      mensaje = `Se ha reasignado la Incidencia ${refIncidencia}, al Tecnico: ${nombreTecnico}`;
    } else {
      mensaje = `Se le ha asignado la Incidencia ${refIncidencia}, al Tecnico: ${nombreTecnico}`;
    }

    return {
      id: idNotif,
      claveDeduplicacion,
      idReferencia: incId || ordenId,
      idTecnico: idAsignado,
      esReasignacion,
      titulo: 'Asignación de orden',
      mensaje: mensaje.trim(),
      detalle: '',
      tiempo: calcularTiempoRelativo(timestamp, 'Ahora mismo'),
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
      detalle: '',
      tiempo: calcularTiempoRelativo(timestamp, 'Ahora mismo'),
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
      tiempo: calcularTiempoRelativo(timestamp, 'Ahora mismo'),
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
      titulo: 'Nueva incidencia reportada:',
      mensaje: tituloInc,
      detalle: '',
      tiempo: calcularTiempoRelativo(timestamp, 'Ahora mismo'),
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
    tiempo: calcularTiempoRelativo(timestamp, 'Ahora mismo'),
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

  // Detectar duplicados de red provenientes de la misma ráfaga temporal o salas múltiples
  const esDuplicadoRafaga = listaActual.some((item) => {
    const mismoId = item.id && nuevaNotif.id && String(item.id) === String(nuevaNotif.id);
    const mismaClave =
      item.claveDeduplicacion &&
      nuevaNotif.claveDeduplicacion &&
      item.claveDeduplicacion === nuevaNotif.claveDeduplicacion;
    const mismoMensaje =
      item.idReferencia &&
      nuevaNotif.idReferencia &&
      String(item.idReferencia) === String(nuevaNotif.idReferencia) &&
      item.tipo === nuevaNotif.tipo &&
      item.titulo === nuevaNotif.titulo &&
      item.mensaje === nuevaNotif.mensaje;

    if (mismoId || mismaClave || mismoMensaje) {
      if (item.timestamp && nuevaNotif.timestamp) {
        // Mismo timestamp exacto del payload de backend: réplica de broadcast
        if (item.timestamp === nuevaNotif.timestamp) {
          return true;
        }
        // Diferencia temporal menor a 2 segundos: descarte de ráfaga duplicada en tránsito
        const diff = Math.abs(new Date(item.timestamp).getTime() - new Date(nuevaNotif.timestamp).getTime());
        if (!Number.isNaN(diff) && diff < 2000) {
          return true;
        }
      } else {
        // Sin marcas de tiempo para comparar: comportamiento estricto por identidad
        return true;
      }
    }
    return false;
  });

  if (esDuplicadoRafaga) {
    return listaActual;
  }

  // Si existe una notificación anterior con el mismo ID o clave (por ejemplo, una prioridad
  // o estado previo que vuelve a cambiar o actualizarse posteriormente), removemos la versión obsoleta
  // para posicionar la notificación fresca arriba de todo como no leída
  const listaLimpia = listaActual.filter((item) => {
    if (item.id && nuevaNotif.id && String(item.id) === String(nuevaNotif.id)) {
      return false;
    }
    if (
      item.claveDeduplicacion &&
      nuevaNotif.claveDeduplicacion &&
      item.claveDeduplicacion === nuevaNotif.claveDeduplicacion
    ) {
      return false;
    }
    return true;
  });

  return [nuevaNotif, ...listaLimpia];
};

/**
 * Hidrata las notificaciones iniciales consultando los registros reales en PostgreSQL
 * a través del API Gateway según el rol del usuario autenticado (Opción A).
 *
 * @param {Object} usuario - Usuario actualmente autenticado.
 * @param {Object} clienteApi - Cliente Axios configurado con el interceptor de autenticación.
 * @returns {Promise<Array<Object>>} Lista de notificaciones normalizadas.
 */
export const hidratarNotificacionesDesdeApi = async (usuario, clienteApi) => {
  if (!usuario || !clienteApi) return [];

  const idUsuario = obtenerIdUsuarioActual(usuario);
  const rol = obtenerRolUsuarioActual(usuario);
  if (!idUsuario) return [];

  const permisosUsuario = Array.isArray(usuario?.permissions)
    ? usuario.permissions
    : Array.isArray(usuario?.permisos)
      ? usuario.permisos
      : [];
  const tienePermiso = (permiso) => permisosUsuario.includes(permiso);
  const opcionesSilenciosas = { skipGlobalErrorHandler: true };

  const notificacionesCargadas = [];

  try {
    if (tienePermiso('ordenes:diagnosticar') || (permisosUsuario.length === 0 && rol === 'TECNICO')) {
      // 1. Obtener órdenes de trabajo asignadas al técnico
      let ordenes = [];
      try {
        const res = await clienteApi.get('/ordenes-trabajo/mis-ordenes?limit=10', opcionesSilenciosas);
        ordenes = res.data?.data || res.data?.ordenes || (Array.isArray(res.data) ? res.data : []);
      } catch {
        try {
          const resFallback = await clienteApi.get(`/ordenes-trabajo/tecnico/${idUsuario}?limit=10`, opcionesSilenciosas);
          ordenes = resFallback.data?.data || (Array.isArray(resFallback.data) ? resFallback.data : []);
        } catch {}
      }

      for (const ot of ordenes) {
        const inc = ot.incidencia || {};
        const payload = {
          id_orden: ot.id_orden,
          id_incidencia: ot.id_incidencia || inc.id_incidencia,
          titulo: inc.titulo || ot.titulo || ot.incidencia_titulo,
          id_tecnico: ot.id_tecnico || idUsuario,
          nombre_tecnico: `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || usuario.nombre,
          timestamp: ot.fecha_creacion || inc.fecha_creacion,
          tipo_evento: 'ASIGNACION_ORDEN',
          nuevo_estado: 'ASIGNADA',
          es_reasignacion: Boolean(ot.es_reasignacion),
        };
        const notif = normalizarEventoNotificacion(payload, 'orden_asignada', usuario);
        if (notif) notificacionesCargadas.push(notif);
      }
    } else if (rol === 'SUPERVISOR' || rol === 'ADMINISTRADOR') {
      // 2. Obtener órdenes solo si posee permiso PBAC `ordenes:asignar` (evita 403 en ADMINISTRADOR)
      if (tienePermiso('ordenes:asignar') || (permisosUsuario.length === 0 && rol === 'SUPERVISOR')) {
        try {
          const resOt = await clienteApi.get('/ordenes-trabajo?limit=10', opcionesSilenciosas);
          const ordenes = resOt.data?.data || (Array.isArray(resOt.data) ? resOt.data : []);
          for (const ot of ordenes) {
            const inc = ot.incidencia || {};
            const nombreTec =
              ot.tecnico?.nombre
                ? `${ot.tecnico.nombre} ${ot.tecnico.apellido || ''}`.trim()
                : ot.nombre_tecnico || null;
            const payload = {
              id_orden: ot.id_orden,
              id_incidencia: ot.id_incidencia || inc.id_incidencia,
              titulo: inc.titulo || ot.titulo,
              id_tecnico: ot.id_tecnico,
              nombre_tecnico: nombreTec,
              timestamp: ot.fecha_creacion || inc.fecha_creacion,
              tipo_evento: 'ASIGNACION_ORDEN',
              nuevo_estado: 'ASIGNADA',
              es_reasignacion: Boolean(ot.es_reasignacion),
            };
            const notif = normalizarEventoNotificacion(payload, 'orden_asignada', usuario);
            if (notif) notificacionesCargadas.push(notif);
          }
        } catch {}
      }

      try {
        const resInc = await clienteApi.get('/incidencias?limit=10', opcionesSilenciosas);
        const incidencias = resInc.data?.datos || resInc.data?.data || (Array.isArray(resInc.data) ? resInc.data : []);
        for (const inc of incidencias) {
          const payload = {
            id_incidencia: inc.id_incidencia,
            titulo: inc.titulo,
            id_reportante: inc.id_reportante,
            timestamp: inc.fecha_creacion,
            tipo_evento: 'NUEVA_INCIDENCIA',
          };
          const notif = normalizarEventoNotificacion(payload, 'nueva_incidencia', usuario);
          if (notif) notificacionesCargadas.push(notif);
        }
      } catch {}
    } else {
      // 3. Reportante: incidencias creadas por él
      try {
        const resInc = await clienteApi.get('/incidencias?limit=10', opcionesSilenciosas);
        const incidencias = resInc.data?.datos || resInc.data?.data || (Array.isArray(resInc.data) ? resInc.data : []);
        for (const inc of incidencias) {
          if (inc.id_reportante && String(inc.id_reportante).toLowerCase() === idUsuario) {
            const payload = {
              id_incidencia: inc.id_incidencia,
              titulo: inc.titulo,
              id_reportante: inc.id_reportante,
              timestamp: inc.fecha_creacion,
              tipo_evento: 'NUEVA_INCIDENCIA',
            };
            const notif = normalizarEventoNotificacion(payload, 'nueva_incidencia', usuario);
            if (notif) notificacionesCargadas.push(notif);
          }
        }
      } catch {}
    }
  } catch {
    // Si falla la red silenciosamente retorna lo recolectado
  }

  // Ordenar cronológicamente descendente
  notificacionesCargadas.sort((a, b) => {
    const tsA = new Date(a.timestamp || 0).getTime();
    const tsB = new Date(b.timestamp || 0).getTime();
    return tsB - tsA;
  });

  return notificacionesCargadas;
};
