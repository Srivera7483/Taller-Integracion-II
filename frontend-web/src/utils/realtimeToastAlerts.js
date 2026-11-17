/**
 * TAL-189: Utilidades y lógica de dominio para el Sistema de Notificaciones Toast
 * Flotantes en Tiempo Real integradas con el canal WebSocket (TAL-186).
 *
 * Criterios de Aceptación:
 * 1. Las alertas emergentes aparecen en la esquina superior derecha con sonido discreto opcional.
 * 2. Al hacer click en la alerta, navega a la orden de trabajo correspondiente (botón 'Ver Orden').
 * 3. Soporta cierre manual y auto-desvanecimiento tras 6 segundos.
 */

export const TOAST_AUTO_DISMISS_MS = 6000;
export const TOAST_DEDUPE_WINDOW_MS = 2000;
export const TOAST_SOUND_STORAGE_KEY = 'inframanager:toast_sound_enabled';
export const TOAST_ACTION_LABEL = 'Ver Orden';

const normalizarTexto = (valor = '') =>
  String(valor)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * Extrae el texto de prioridad o criticidad desde un string u objeto.
 * @param {string|Object|null|undefined} raw
 * @returns {string}
 */
export const extraerTextoPrioridad = (raw) => {
  if (!raw) return '';
  if (typeof raw === 'object') {
    return normalizarTexto(
      raw.nombre_prioridad || raw.prioridad || raw.criticidad || raw.nivel || raw.nombre || '',
    );
  }
  return normalizarTexto(raw);
};

/**
 * Determina si un nivel de prioridad o criticidad corresponde a ALTA o CRÍTICA.
 * @param {string|Object|null|undefined} rawPrioridad
 * @returns {boolean}
 */
export const esCriticidadAlta = (rawPrioridad) => {
  const norm = extraerTextoPrioridad(rawPrioridad);
  return norm === 'alta' || norm === 'critica' || norm === 'high' || norm === 'critical';
};

/**
 * Extrae los identificadores del usuario autenticado para comparar destinatarios.
 * @param {Object|null|undefined} usuario
 * @returns {{ userId: string, correo: string, rol: string }}
 */
export const extraerIdentidadUsuario = (usuario) => {
  if (!usuario || typeof usuario !== 'object') {
    return { userId: '', correo: '', rol: '' };
  }

  const rawId = usuario.id_usuario || usuario.id || usuario.userId || usuario.sub || '';
  const rawCorreo = usuario.correo || usuario.email || '';
  const rawRol =
    usuario.rol?.nombre_rol ||
    usuario.rol?.nombre ||
    (typeof usuario.rol === 'string' ? usuario.rol : '') ||
    usuario.nombre_rol ||
    '';

  return {
    userId: String(rawId).trim(),
    correo: String(rawCorreo).trim().toLowerCase(),
    rol: String(rawRol).trim().toUpperCase(),
  };
};

/**
 * Verifica si el evento corresponde a una asignación de orden dirigida al técnico logueado.
 * @param {string} rawEventName
 * @param {Object} payload
 * @param {Object|null} usuarioActual
 * @returns {boolean}
 */
export const esAsignacionParaTecnicoLogueado = (rawEventName, payload = {}, usuarioActual = null) => {
  if (!payload || typeof payload !== 'object') return false;

  const tipoEvento = String(payload.tipo_evento || payload.evento || '').toUpperCase();
  const estadoNorm = normalizarTexto(payload.nuevo_estado || payload.estado || '');
  const eventoNorm = normalizarTexto(rawEventName || '');

  const esEventoAsignacion =
    eventoNorm === 'orden_asignada' ||
    tipoEvento === 'ASIGNACION_ORDEN' ||
    tipoEvento === 'ORDEN_TRABAJO_ASIGNADA' ||
    (estadoNorm === 'asignada' && Boolean(payload.id_tecnico || payload.usuario_responsable));

  if (!esEventoAsignacion) return false;

  const { userId, correo } = extraerIdentidadUsuario(usuarioActual);
  const idTecnicoDestino = String(
    payload.id_tecnico || payload.tecnico_id || payload.usuario_responsable || '',
  ).trim();
  const correoTecnicoDestino = String(payload.correo_tecnico || payload.email_tecnico || '')
    .trim()
    .toLowerCase();

  if (payload.para_usuario_actual === true) {
    return true;
  }

  if (userId && idTecnicoDestino && userId === idTecnicoDestino) {
    return true;
  }

  if (correo && correoTecnicoDestino && correo === correoTecnicoDestino) {
    return true;
  }

  return false;
};

/**
 * Criterio 2: Resuelve la ruta de navegación directa hacia la orden de trabajo o ticket.
 * @param {Object} payload
 * @returns {string}
 */
export const resolverRutaOrdenTrabajo = (payload = {}) => {
  if (!payload || typeof payload !== 'object') {
    return '/incidencias';
  }

  const rutaExplicita = payload.actionUrl || payload.rutaDestino || payload.ruta || payload.url;
  if (typeof rutaExplicita === 'string' && rutaExplicita.trim().startsWith('/')) {
    return rutaExplicita.trim();
  }

  const idOrden =
    payload.id_orden ||
    payload.orden_id ||
    payload.idOrden ||
    payload.orden_trabajo?.id_orden ||
    null;

  if (idOrden) {
    return `/ordenes/${encodeURIComponent(String(idOrden).trim())}`;
  }

  const idIncidencia =
    payload.id_incidencia || payload.incidencia_id || payload.idIncidencia || payload.id || null;

  if (idIncidencia) {
    return `/ordenes/${encodeURIComponent(String(idIncidencia).trim())}`;
  }

  return '/incidencias';
};

/**
 * Evalúa un evento entrante de WebSocket y construye la configuración del Toast interactivo
 * si es una alerta de criticidad ALTA/CRÍTICA o una asignación al técnico logueado.
 *
 * @param {string} rawEventName
 * @param {Object} payload
 * @param {Object|null} usuarioActual
 * @returns {Object|null}
 */
export const construirAlertaToastDesdeWebSocket = (
  rawEventName,
  payload = {},
  usuarioActual = null,
) => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const asignadaAlUsuario = esAsignacionParaTecnicoLogueado(rawEventName, payload, usuarioActual);
  const rawPrioridad = payload.prioridad || payload.criticidad || payload.nivel || null;
  const criticidadAlta = esCriticidadAlta(rawPrioridad);

  // Si es una asignación explícita a otro técnico distinto y no es de criticidad alta, ignorar
  const { userId } = extraerIdentidadUsuario(usuarioActual);
  const idTecnicoEvento = String(
    payload.id_tecnico || payload.tecnico_id || payload.usuario_responsable || '',
  ).trim();
  const esAsignacion =
    normalizarTexto(rawEventName) === 'orden_asignada' ||
    String(payload.tipo_evento || '').toUpperCase() === 'ASIGNACION_ORDEN';

  if (esAsignacion && !asignadaAlUsuario && userId && idTecnicoEvento && userId !== idTecnicoEvento) {
    if (!criticidadAlta) {
      return null;
    }
  }

  if (!asignadaAlUsuario && !criticidadAlta) {
    return null;
  }

  const idOrden =
    payload.id_orden || payload.orden_id || payload.orden_trabajo?.id_orden || null;
  const idIncidencia = payload.id_incidencia || payload.incidencia_id || payload.id || null;
  const referenciaTicket = idOrden || idIncidencia || 'S/N';
  const tituloTicket = payload.titulo ? String(payload.titulo).trim() : '';
  const actionUrl = resolverRutaOrdenTrabajo(payload);

  if (asignadaAlUsuario) {
    const detalleOrden = tituloTicket
      ? `Se te asignó la orden "${tituloTicket}" (#${String(referenciaTicket).slice(0, 8)})`
      : `Se te ha asignado la orden de trabajo #${String(referenciaTicket).slice(0, 8)}`;

    return {
      type: criticidadAlta ? 'critical' : 'warning',
      title: 'Nueva Orden de Trabajo Asignada',
      message: detalleOrden,
      actionLabel: TOAST_ACTION_LABEL,
      actionUrl,
      idOrden,
      idIncidencia,
      prioridad: extraerTextoPrioridad(rawPrioridad) || 'alta',
      motivo: 'ORDEN_ASIGNADA',
      duration: TOAST_AUTO_DISMISS_MS,
      playSound: true,
      dedupeKey: `ORDEN:${idOrden || ''}:${idIncidencia || ''}:${idTecnicoEvento}`,
    };
  }

  const etiquetaPrioridad =
    extraerTextoPrioridad(rawPrioridad) === 'critica' ? 'CRÍTICA' : 'ALTA';
  const detalleAlerta = tituloTicket
    ? `Alerta de criticidad ${etiquetaPrioridad}: "${tituloTicket}"`
    : `Alerta de criticidad ${etiquetaPrioridad} en ticket #${String(referenciaTicket).slice(0, 8)}`;

  return {
    type: 'critical',
    title: `Alerta de Criticidad ${etiquetaPrioridad}`,
    message: detalleAlerta,
    actionLabel: TOAST_ACTION_LABEL,
    actionUrl,
    idOrden,
    idIncidencia,
    prioridad: extraerTextoPrioridad(rawPrioridad) || 'alta',
    motivo: 'CRITICIDAD_ALTA',
    duration: TOAST_AUTO_DISMISS_MS,
    playSound: true,
    dedupeKey: `ALTA:${idIncidencia || ''}:${idOrden || ''}:${etiquetaPrioridad}`,
  };
};

/**
 * Consulta si el sonido discreto opcional está habilitado en las preferencias del usuario.
 * Por defecto está habilitado (`true`) salvo que el usuario lo haya desactivado explícitamente.
 *
 * @param {Storage|null} [storage]
 * @returns {boolean}
 */
export const isToastSoundEnabled = (
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
) => {
  if (!storage || typeof storage.getItem !== 'function') {
    return true;
  }
  try {
    const raw = storage.getItem(TOAST_SOUND_STORAGE_KEY);
    if (raw === null || raw === undefined) return true;
    return raw !== 'false' && raw !== '0';
  } catch {
    return true;
  }
};

/**
 * Actualiza la preferencia del sonido discreto opcional en localStorage.
 *
 * @param {boolean} enabled
 * @param {Storage|null} [storage]
 * @returns {boolean}
 */
export const setToastSoundEnabled = (
  enabled,
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
) => {
  const normalized = Boolean(enabled);
  if (storage && typeof storage.setItem === 'function') {
    try {
      storage.setItem(TOAST_SOUND_STORAGE_KEY, normalized ? 'true' : 'false');
    } catch {
      // Ignorar errores de cuota en almacenamiento restringido
    }
  }
  return normalized;
};

/**
 * Criterio 1: Reproduce un sonido discreto opcional mediante Web Audio API
 * sin depender de archivos multimedia externos y respetando las políticas del navegador.
 *
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true]
 * @param {Function} [options.audioContextFactory]
 * @returns {boolean} `true` si el sonido se disparó, `false` si estaba silenciado o no soportado.
 */
export const reproducirSonidoDiscreto = ({ enabled = true, audioContextFactory } = {}) => {
  if (!enabled) return false;

  try {
    const Factory =
      audioContextFactory ||
      (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext));

    if (typeof Factory !== 'function') {
      return false;
    }

    const ctx = new Factory();
    const now = typeof ctx.currentTime === 'number' ? ctx.currentTime : 0;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5 suave
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5 armónico discreto

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.19);

    if (typeof ctx.close === 'function') {
      setTimeout(() => {
        try {
          void ctx.close();
        } catch {
          // Cierre silencioso
        }
      }, 250);
    }

    return true;
  } catch {
    return false;
  }
};
