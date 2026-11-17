import { useState, useEffect, useRef, useCallback } from 'react';
import { io as createSocketClient } from 'socket.io-client';

/**
 * @typedef {Object} EstadoCambiadoPayload
 * @property {string} id_incidencia - Identificador UUID de la incidencia actualizada.
 * @property {string} nuevo_estado - Nombre del nuevo estado ('Reportada', 'Asignada', 'En Proceso', 'Resuelta', 'Cerrada', 'Rechazada').
 * @property {string} [estado_anterior] - Estado previo de la incidencia si está disponible.
 * @property {string|null} usuario_responsable - ID del usuario que ejecutó la transición de estado.
 * @property {string|null} [id_edificio] - Identificador o código del edificio asociado al activo.
 * @property {string} timestamp - Marca temporal ISO-8601 del evento.
 * @property {'CAMBIO_ESTADO'} [tipo_evento] - Discriminador del evento de cambio de estado.
 */

/**
 * @typedef {Object} OrdenAsignadaPayload
 * @property {string} id_incidencia - Identificador UUID de la incidencia asignada o reasignada.
 * @property {string} [id_orden] - Identificador UUID de la orden de trabajo emitida.
 * @property {string} [id_tecnico] - Identificador UUID del técnico asignado.
 * @property {string} nuevo_estado - Estado resultante de la asignación ('ASIGNADA' / 'Asignada').
 * @property {string|null} usuario_responsable - ID del técnico o usuario responsable asignado.
 * @property {string|null} [id_edificio] - Identificador del edificio del activo involucrado.
 * @property {string} timestamp - Marca temporal ISO-8601 del evento.
 * @property {'ASIGNACION_ORDEN'} [tipo_evento] - Discriminador del evento de asignación de orden.
 */

/**
 * @typedef {EstadoCambiadoPayload | OrdenAsignadaPayload} IncidenciaActualizadaPayload
 */

/**
 * @typedef {Object} NuevaIncidenciaPayload
 * @property {string} [id_incidencia] - Identificador UUID de la nueva incidencia.
 * @property {string} [id] - Alias del identificador de la incidencia.
 * @property {string} titulo - Título descriptivo de la incidencia reportada.
 * @property {string} [descripcion] - Descripción detallada del problema.
 * @property {string} [prioridad] - Nivel de prioridad ('baja', 'media', 'alta', 'critica').
 * @property {string} [id_activo] - Identificador del activo afectado.
 * @property {string} [estado] - Estado inicial de la incidencia.
 * @property {string} [fecha_creacion] - Fecha de creación en formato ISO-8601.
 */

/**
 * @typedef {Object} EventoWebSocketRegistrado
 * @property {string} tipo - Nombre normalizado del evento recibido ('orden_asignada' | 'estado_cambiado' | 'incidencia_actualizada' | 'nueva_incidencia').
 * @property {Object} payload - Carga útil recibida desde el servidor WebSocket.
 * @property {string} timestamp - Marca temporal ISO-8601 de recepción en el cliente.
 */

/**
 * @typedef {Object} UseWebSocketCallbacks
 * @property {(payload: OrdenAsignadaPayload) => void} [onOrdenAsignada] - Callback tipado al asignarse o reasignarse una orden de trabajo.
 * @property {(payload: OrdenAsignadaPayload) => void} [orden_asignada] - Alias directo del callback para el evento `orden_asignada`.
 * @property {(payload: EstadoCambiadoPayload) => void} [onEstadoCambiado] - Callback tipado al cambiar el estado de una incidencia.
 * @property {(payload: EstadoCambiadoPayload) => void} [estado_cambiado] - Alias directo del callback para el evento `estado_cambiado`.
 * @property {(payload: IncidenciaActualizadaPayload) => void} [onIncidenciaActualizada] - Callback general para cualquier actualización de incidencia (`TAL-185`).
 * @property {(payload: IncidenciaActualizadaPayload) => void} [incidencia_actualizada] - Alias directo para `incidencia_actualizada`.
 * @property {(payload: NuevaIncidenciaPayload) => void} [onNuevaIncidencia] - Callback al registrarse una nueva incidencia.
 * @property {(payload: NuevaIncidenciaPayload) => void} [nueva_incidencia] - Alias directo para `nueva_incidencia`.
 * @property {(socketId: string) => void} [onConnect] - Callback ejecutado al establecer o restablecer conexión.
 * @property {(reason: string) => void} [onDisconnect] - Callback ejecutado al cerrarse la conexión.
 * @property {(error: Error) => void} [onError] - Callback ejecutado ante errores de conexión o transporte.
 */

/**
 * @typedef {Object} UseWebSocketOptions
 * @property {boolean} [autoConnect=true] - Si debe conectar automáticamente al montar el componente (CA-1).
 * @property {string} [url] - URL explícita del servidor Socket.io (por defecto se resuelve desde el API Gateway).
 * @property {string[]} [salas] - Lista de salas iniciales a las cuales suscribirse automáticamente al conectar.
 * @property {string[]} [rooms] - Alias en inglés para `salas`.
 * @property {string} [idIncidencia] - ID de incidencia para auto-unirse a la sala `incidencia_${idIncidencia}`.
 * @property {string} [idEdificio] - ID de edificio para auto-unirse a la sala `edificio_${idEdificio}`.
 * @property {number} [baseDelayMs=1000] - Retraso base en milisegundos para el backoff exponencial (CA-2).
 * @property {number} [maxDelayMs=30000] - Tope máximo en milisegundos para el backoff exponencial (CA-2).
 * @property {number} [maxRetries=10] - Número máximo de reintentos ante cierres accidentales.
 * @property {number} [jitterFactor=0.3] - Factor de variación aleatoria (jitter) entre 0 y 1 (CA-2).
 * @property {Function} [socketFactory] - Fábrica inyectable para pruebas unitarias (por defecto `io` de `socket.io-client`).
 */

export const WS_DEFAULT_BASE_DELAY_MS = 1000;
export const WS_DEFAULT_MAX_DELAY_MS = 30000;
export const WS_DEFAULT_MAX_RETRIES = 10;
export const WS_DEFAULT_JITTER_FACTOR = 0.3;
export const WS_MAX_EVENT_HISTORY = 20;

export const WS_EVENTS = Object.freeze({
  INCIDENCIA_ACTUALIZADA: 'incidencia_actualizada',
  ORDEN_ASIGNADA: 'orden_asignada',
  ESTADO_CAMBIADO: 'estado_cambiado',
  NUEVA_INCIDENCIA: 'nueva_incidencia',
  NUEVA_INCIDENCIA_LEGACY: 'nueva-incidencia',
  UNIRSE_SALA: 'unirse_sala',
  DEJAR_SALA: 'dejar_sala',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
});

/**
 * Resuelve la URL base del servidor WebSocket a partir de las variables de entorno o del API Gateway.
 * Elimina sufijos `/api/v1` o `/api` para conectar al namespace raíz de Socket.io en el puerto unificado.
 *
 * @param {string} [customUrl]
 * @returns {string}
 */
export const resolveWebSocketUrl = (customUrl) => {
  const raw =
    customUrl ||
    (typeof import.meta !== 'undefined' &&
      (import.meta.env?.VITE_WS_URL || import.meta.env?.VITE_API_URL)) ||
    'http://localhost:3000';

  return String(raw)
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/i, '')
    .replace(/\/api$/i, '');
};

/**
 * Obtiene de forma segura el token JWT y los datos del usuario autenticado desde localStorage.
 *
 * @param {Storage} [storage]
 * @returns {{ token: string|null, usuario: Object|null, rol: string|null, userId: string|null }}
 */
export const resolveSocketAuthContext = (
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
) => {
  if (!storage || typeof storage.getItem !== 'function') {
    return { token: null, usuario: null, rol: null, userId: null };
  }

  let token = null;
  let usuario = null;

  try {
    token = storage.getItem('token') || null;
    const rawUser = storage.getItem('usuario');
    usuario = rawUser ? JSON.parse(rawUser) : null;
  } catch {
    usuario = null;
  }

  const rawRol =
    usuario?.rol?.nombre_rol ||
    usuario?.rol?.nombre ||
    (typeof usuario?.rol === 'string' ? usuario.rol : null) ||
    usuario?.nombre_rol ||
    null;

  const rol = rawRol ? String(rawRol).toUpperCase().trim() : null;
  const userId = usuario?.id_usuario || usuario?.id || usuario?.userId || null;

  return { token, usuario, rol, userId };
};

/**
 * CA-2: Calcula el tiempo de espera para reconexión mediante Backoff Exponencial con Jitter.
 * Fórmula: min(maxDelayMs, baseDelayMs * 2^attempt) + jitterAleatorio
 *
 * @param {number} attempt - Índice del intento de reconexión (0, 1, 2, ...).
 * @param {Object} [options]
 * @param {number} [options.baseDelayMs=1000]
 * @param {number} [options.maxDelayMs=30000]
 * @param {number} [options.jitterFactor=0.3]
 * @param {() => number} [options.randomFn=Math.random]
 * @returns {number} Tiempo en milisegundos redondeado a entero.
 */
export const calcularRetrasoReconexion = (
  attempt = 0,
  {
    baseDelayMs = WS_DEFAULT_BASE_DELAY_MS,
    maxDelayMs = WS_DEFAULT_MAX_DELAY_MS,
    jitterFactor = WS_DEFAULT_JITTER_FACTOR,
    randomFn = Math.random,
  } = {},
) => {
  const safeAttempt = Math.max(0, Number(attempt) || 0);
  const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** safeAttempt);
  const parsedJitter = Number(jitterFactor);
  const clampedJitter = Math.max(
    0,
    Math.min(1, Number.isFinite(parsedJitter) ? parsedJitter : WS_DEFAULT_JITTER_FACTOR),
  );
  const jitterWindow = exponentialDelay * clampedJitter;
  const randomOffset = (randomFn() * 2 - 1) * jitterWindow;
  const finalDelay = Math.max(baseDelayMs, Math.min(maxDelayMs, Math.round(exponentialDelay + randomOffset)));
  return finalDelay;
};

/**
 * CA-3: Clasifica y despacha un evento entrante hacia los callbacks tipados (`orden_asignada`, `estado_cambiado`, `incidencia_actualizada`, `nueva_incidencia`).
 *
 * @param {string} rawEventName
 * @param {Object} payload
 * @param {UseWebSocketCallbacks} callbacks
 * @returns {{ tipoNormalizado: string, payloadNormalizado: Object }}
 */
export const despacharEventoTipado = (rawEventName, payload = {}, callbacks = {}) => {
  const timestamp = payload?.timestamp || new Date().toISOString();
  const cbOrdenAsignada = callbacks.onOrdenAsignada || callbacks.orden_asignada;
  const cbEstadoCambiado = callbacks.onEstadoCambiado || callbacks.estado_cambiado;
  const cbIncidenciaActualizada = callbacks.onIncidenciaActualizada || callbacks.incidencia_actualizada;
  const cbNuevaIncidencia = callbacks.onNuevaIncidencia || callbacks.nueva_incidencia;

  if (
    rawEventName === WS_EVENTS.NUEVA_INCIDENCIA ||
    rawEventName === WS_EVENTS.NUEVA_INCIDENCIA_LEGACY
  ) {
    const payloadNormalizado = { ...payload, timestamp };
    if (typeof cbNuevaIncidencia === 'function') {
      cbNuevaIncidencia(payloadNormalizado);
    }
    return { tipoNormalizado: WS_EVENTS.NUEVA_INCIDENCIA, payloadNormalizado };
  }

  const esAsignacion =
    rawEventName === WS_EVENTS.ORDEN_ASIGNADA ||
    payload?.tipo_evento === 'ASIGNACION_ORDEN' ||
    payload?.evento === 'ORDEN_TRABAJO_ASIGNADA';

  if (esAsignacion) {
    /** @type {OrdenAsignadaPayload} */
    const payloadOrden = {
      ...payload,
      id_incidencia: payload?.id_incidencia || payload?.id || '',
      nuevo_estado: payload?.nuevo_estado || 'ASIGNADA',
      usuario_responsable: payload?.usuario_responsable ?? payload?.id_tecnico ?? null,
      timestamp,
      tipo_evento: 'ASIGNACION_ORDEN',
    };

    if (typeof cbOrdenAsignada === 'function') {
      cbOrdenAsignada(payloadOrden);
    }
    if (typeof cbIncidenciaActualizada === 'function') {
      cbIncidenciaActualizada(payloadOrden);
    }
    return { tipoNormalizado: WS_EVENTS.ORDEN_ASIGNADA, payloadNormalizado: payloadOrden };
  }

  /** @type {EstadoCambiadoPayload} */
  const payloadEstado = {
    ...payload,
    id_incidencia: payload?.id_incidencia || payload?.id || '',
    nuevo_estado: payload?.nuevo_estado || payload?.estado || 'DESCONOCIDO',
    usuario_responsable: payload?.usuario_responsable ?? null,
    timestamp,
    tipo_evento: 'CAMBIO_ESTADO',
  };

  if (typeof cbEstadoCambiado === 'function') {
    cbEstadoCambiado(payloadEstado);
  }
  if (typeof cbIncidenciaActualizada === 'function') {
    cbIncidenciaActualizada(payloadEstado);
  }

  return {
    tipoNormalizado:
      rawEventName === WS_EVENTS.INCIDENCIA_ACTUALIZADA
        ? WS_EVENTS.INCIDENCIA_ACTUALIZADA
        : WS_EVENTS.ESTADO_CAMBIADO,
    payloadNormalizado: payloadEstado,
  };
};

/**
 * Normaliza el argumento de entrada para `unirse_sala` / `join_room`.
 *
 * @param {string|Object|string[]} salaOConfig
 * @returns {{ payload: Object, nombresSalas: string[] }}
 */
export const normalizarSolicitudSala = (salaOConfig) => {
  const nombresSalas = [];

  if (typeof salaOConfig === 'string' && salaOConfig.trim()) {
    const clean = salaOConfig.trim();
    nombresSalas.push(clean);
    return { payload: { room: clean, sala: clean, rooms: [clean] }, nombresSalas };
  }

  if (Array.isArray(salaOConfig)) {
    for (const s of salaOConfig) {
      if (typeof s === 'string' && s.trim()) {
        nombresSalas.push(s.trim());
      }
    }
    return { payload: { rooms: nombresSalas, salas: nombresSalas }, nombresSalas };
  }

  if (salaOConfig && typeof salaOConfig === 'object') {
    const room = salaOConfig.room || salaOConfig.sala;
    if (room) nombresSalas.push(String(room).trim());

    const roomsList = Array.isArray(salaOConfig.rooms)
      ? salaOConfig.rooms
      : Array.isArray(salaOConfig.salas)
        ? salaOConfig.salas
        : [];
    for (const r of roomsList) {
      if (r) nombresSalas.push(String(r).trim());
    }

    if (salaOConfig.id_incidencia) {
      nombresSalas.push(`incidencia_${salaOConfig.id_incidencia}`);
    }
    if (salaOConfig.id_edificio) {
      nombresSalas.push(`edificio_${salaOConfig.id_edificio}`);
    }
    if (salaOConfig.rol) {
      const rolUpper = String(salaOConfig.rol).toUpperCase();
      nombresSalas.push(`rol_${rolUpper}`);
      if (['COORDINADOR', 'SUPERVISOR', 'ADMINISTRADOR'].includes(rolUpper)) {
        nombresSalas.push('coordinadores');
      }
    }

    const unicas = Array.from(new Set(nombresSalas));
    return {
      payload: { ...salaOConfig, rooms: unicas, salas: unicas },
      nombresSalas: unicas,
    };
  }

  return { payload: {}, nombresSalas: [] };
};

/**
 * Hook personalizado `useWebSocket` (TAL-186):
 * - CA-1: Conexión automática al montar con inyección de JWT y desconexión limpia al desmontar.
 * - CA-2: Reintentos exponenciales con jitter en caso de cierre accidental.
 * - CA-3: Callbacks tipados para `orden_asignada`, `estado_cambiado`, `incidencia_actualizada` y `nueva_incidencia`,
 *         gestión de salas (`unirse_sala`, `dejar_sala`) y exposición de los últimos eventos recibidos.
 *
 * @param {UseWebSocketCallbacks} [callbacks={}]
 * @param {UseWebSocketOptions} [options={}]
 */
export const useWebSocket = (callbacks = {}, options = {}) => {
  const {
    autoConnect = true,
    url,
    salas = [],
    rooms = [],
    idIncidencia,
    idEdificio,
    baseDelayMs = WS_DEFAULT_BASE_DELAY_MS,
    maxDelayMs = WS_DEFAULT_MAX_DELAY_MS,
    maxRetries = WS_DEFAULT_MAX_RETRIES,
    jitterFactor = WS_DEFAULT_JITTER_FACTOR,
    socketFactory = createSocketClient,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const [ultimoEvento, setUltimoEvento] = useState(null);
  const [ultimosEventos, setUltimosEventos] = useState([]);
  const [salasActivas, setSalasActivas] = useState(() => {
    const iniciales = new Set(['incidencias', ...salas, ...rooms]);
    if (idIncidencia) iniciales.add(`incidencia_${idIncidencia}`);
    if (idEdificio) iniciales.add(`edificio_${idEdificio}`);
    return Array.from(iniciales);
  });
  const [intentosReconexion, setIntentosReconexion] = useState(0);

  const socketRef = useRef(null);
  const callbacksRef = useRef(callbacks);
  const reconnectTimerRef = useRef(null);
  const retryCountRef = useRef(0);
  const manualDisconnectRef = useRef(false);
  const unmountedRef = useRef(false);
  const salasActivasRef = useRef(new Set(salasActivas));

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const limpiarTimerReconexion = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const sincronizarSalasEstado = useCallback(() => {
    if (!unmountedRef.current) {
      setSalasActivas(Array.from(salasActivasRef.current));
    }
  }, []);

  /**
   * Suscribe el socket a una o varias salas (`unirse_sala` / `join_room`).
   */
  const unirseSala = useCallback(
    (salaOConfig) => {
      const { payload, nombresSalas } = normalizarSolicitudSala(salaOConfig);
      if (nombresSalas.length === 0) {
        return Promise.resolve({ status: 'noop', rooms: [] });
      }

      for (const s of nombresSalas) {
        salasActivasRef.current.add(s);
      }
      sincronizarSalasEstado();

      const sock = socketRef.current;
      if (!sock || !sock.connected) {
        return Promise.resolve({ status: 'queued', rooms: nombresSalas });
      }

      return new Promise((resolve) => {
        let settled = false;
        const finish = (ack) => {
          if (settled) return;
          settled = true;
          resolve(ack || { status: 'joined', rooms: nombresSalas });
        };

        const timeoutId = setTimeout(() => finish({ status: 'joined', rooms: nombresSalas }), 1500);
        sock.emit(WS_EVENTS.JOIN_ROOM, payload, (ack) => {
          clearTimeout(timeoutId);
          finish(ack);
        });
        sock.emit(WS_EVENTS.UNIRSE_SALA, payload);
      });
    },
    [sincronizarSalasEstado],
  );

  /**
   * Cancela la suscripción del socket a una sala específica (`dejar_sala` / `leave_room`).
   */
  const dejarSala = useCallback(
    (salaOConfig) => {
      const room =
        typeof salaOConfig === 'string'
          ? salaOConfig.trim()
          : salaOConfig?.room || salaOConfig?.sala || '';

      if (!room) {
        return Promise.resolve({ status: 'error', message: 'Sala no especificada' });
      }

      salasActivasRef.current.delete(room);
      sincronizarSalasEstado();

      const sock = socketRef.current;
      if (!sock || !sock.connected) {
        return Promise.resolve({ status: 'left', room });
      }

      return new Promise((resolve) => {
        let settled = false;
        const finish = (ack) => {
          if (settled) return;
          settled = true;
          resolve(ack || { status: 'left', room });
        };

        const timeoutId = setTimeout(() => finish({ status: 'left', room }), 1500);
        sock.emit(WS_EVENTS.LEAVE_ROOM, { room, sala: room }, (ack) => {
          clearTimeout(timeoutId);
          finish(ack);
        });
        sock.emit(WS_EVENTS.DEJAR_SALA, { room, sala: room });
      });
    },
    [sincronizarSalasEstado],
  );

  /**
   * Programa un reintento exponencial con jitter ante desconexión accidental (CA-2).
   */
  const programarReintentoConBackoff = useCallback(() => {
    if (unmountedRef.current || manualDisconnectRef.current) return;
    if (retryCountRef.current >= maxRetries) return;

    limpiarTimerReconexion();
    const attempt = retryCountRef.current;
    const delayMs = calcularRetrasoReconexion(attempt, {
      baseDelayMs,
      maxDelayMs,
      jitterFactor,
    });

    retryCountRef.current = attempt + 1;
    if (!unmountedRef.current) {
      setIntentosReconexion(retryCountRef.current);
    }

    reconnectTimerRef.current = setTimeout(() => {
      if (unmountedRef.current || manualDisconnectRef.current) return;
      const sock = socketRef.current;
      if (sock && !sock.connected) {
        const { token } = resolveSocketAuthContext();
        if (token) {
          sock.auth = { ...(sock.auth || {}), token, bearer: `Bearer ${token}` };
        }
        sock.connect();
      }
    }, delayMs);
  }, [baseDelayMs, jitterFactor, limpiarTimerReconexion, maxDelayMs, maxRetries]);

  useEffect(() => {
    unmountedRef.current = false;
    manualDisconnectRef.current = false;

    if (!autoConnect) {
      return undefined;
    }

    const wsUrl = resolveWebSocketUrl(url);
    const { token, rol, userId } = resolveSocketAuthContext();

    if (rol) {
      salasActivasRef.current.add(`rol_${rol}`);
      if (['COORDINADOR', 'SUPERVISOR', 'ADMINISTRADOR'].includes(rol)) {
        salasActivasRef.current.add('coordinadores');
      }
    }
    if (idIncidencia) {
      salasActivasRef.current.add(`incidencia_${idIncidencia}`);
    }
    if (idEdificio) {
      salasActivasRef.current.add(`edificio_${idEdificio}`);
    }
    sincronizarSalasEstado();

    const query = {};
    if (userId) query.userId = userId;
    if (rol) query.rol = rol;
    if (idIncidencia) query.incidencia = idIncidencia;
    if (idEdificio) query.edificio = idEdificio;
    if (token) query.token = token;

    const sock = socketFactory(wsUrl, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxRetries,
      reconnectionDelay: baseDelayMs,
      reconnectionDelayMax: maxDelayMs,
      randomizationFactor: jitterFactor,
      auth: token ? { token, bearer: `Bearer ${token}` } : {},
      query,
      ...(token ? { extraHeaders: { Authorization: `Bearer ${token}` } } : {}),
    });

    socketRef.current = sock;

    const eventosRecientesRef = new Map();

    const registrarEventoRecibido = (rawEventName, rawPayload) => {
      if (unmountedRef.current) return;

      // Deduplicación contra ráfagas de red y alias (ej. 'nueva_incidencia' y 'nueva-incidencia')
      const idRecurso = rawPayload?.id_incidencia || rawPayload?.id_orden || rawPayload?.id || '';
      const subTipo = rawPayload?.nuevo_estado || rawPayload?.estado || rawPayload?.tipo_evento || '';
      if (idRecurso) {
        const ahora = Date.now();
        const clave = `${String(rawEventName).replace('-', '_')}:${idRecurso}:${subTipo}`;
        const previo = eventosRecientesRef.get(clave);
        if (previo && ahora - previo < 1500) {
          return;
        }
        eventosRecientesRef.set(clave, ahora);
        if (eventosRecientesRef.size > 50) {
          for (const [k, v] of eventosRecientesRef.entries()) {
            if (ahora - v > 10000) eventosRecientesRef.delete(k);
          }
        }
      }

      const { tipoNormalizado, payloadNormalizado } = despacharEventoTipado(
        rawEventName,
        rawPayload,
        callbacksRef.current,
      );

      const registro = {
        tipo: tipoNormalizado,
        eventoOriginal: rawEventName,
        payload: payloadNormalizado,
        timestamp: payloadNormalizado.timestamp,
      };

      setUltimoEvento(registro);
      setUltimosEventos((prev) => [registro, ...prev].slice(0, WS_MAX_EVENT_HISTORY));
    };

    sock.on('connect', () => {
      if (unmountedRef.current) return;
      limpiarTimerReconexion();
      retryCountRef.current = 0;
      setIntentosReconexion(0);
      setIsConnected(true);
      setSocketId(sock.id || null);

      const salasParaReunir = Array.from(salasActivasRef.current);
      if (salasParaReunir.length > 0) {
        sock.emit(WS_EVENTS.JOIN_ROOM, { rooms: salasParaReunir, salas: salasParaReunir });
        sock.emit(WS_EVENTS.UNIRSE_SALA, { rooms: salasParaReunir, salas: salasParaReunir });
      }

      if (typeof callbacksRef.current?.onConnect === 'function') {
        callbacksRef.current.onConnect(sock.id);
      }
    });

    sock.on('disconnect', (reason) => {
      if (unmountedRef.current) return;
      setIsConnected(false);
      setSocketId(null);

      if (typeof callbacksRef.current?.onDisconnect === 'function') {
        callbacksRef.current.onDisconnect(reason);
      }

      // Si el cierre fue accidental (no provocado manualmente por el cliente), aplicar backoff exponencial con jitter
      if (!manualDisconnectRef.current && reason !== 'io client disconnect') {
        programarReintentoConBackoff();
      }
    });

    sock.on('connect_error', (err) => {
      if (unmountedRef.current) return;
      if (typeof callbacksRef.current?.onError === 'function') {
        callbacksRef.current.onError(err);
      }
      if (!manualDisconnectRef.current) {
        programarReintentoConBackoff();
      }
    });

    sock.on(WS_EVENTS.INCIDENCIA_ACTUALIZADA, (payload) =>
      registrarEventoRecibido(WS_EVENTS.INCIDENCIA_ACTUALIZADA, payload),
    );
    sock.on(WS_EVENTS.ORDEN_ASIGNADA, (payload) =>
      registrarEventoRecibido(WS_EVENTS.ORDEN_ASIGNADA, payload),
    );
    sock.on(WS_EVENTS.ESTADO_CAMBIADO, (payload) =>
      registrarEventoRecibido(WS_EVENTS.ESTADO_CAMBIADO, payload),
    );
    sock.on(WS_EVENTS.NUEVA_INCIDENCIA, (payload) =>
      registrarEventoRecibido(WS_EVENTS.NUEVA_INCIDENCIA, payload),
    );
    sock.on(WS_EVENTS.NUEVA_INCIDENCIA_LEGACY, (payload) =>
      registrarEventoRecibido(WS_EVENTS.NUEVA_INCIDENCIA_LEGACY, payload),
    );

    const handleSessionChange = () => {
      if (unmountedRef.current || !socketRef.current) return;
      const { token: nuevoToken } = resolveSocketAuthContext();
      if (nuevoToken) {
        socketRef.current.auth = {
          ...(socketRef.current.auth || {}),
          token: nuevoToken,
          bearer: `Bearer ${nuevoToken}`,
        };
      }
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('tecnico-cambiado', handleSessionChange);
      window.addEventListener('storage', handleSessionChange);
    }

    // CA-1: Desconexión limpia al desmontar el componente
    return () => {
      unmountedRef.current = true;
      manualDisconnectRef.current = true;
      limpiarTimerReconexion();

      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('tecnico-cambiado', handleSessionChange);
        window.removeEventListener('storage', handleSessionChange);
      }

      if (socketRef.current) {
        socketRef.current.removeAllListeners?.();
        socketRef.current.disconnect?.();
        socketRef.current = null;
      }
    };
  }, [
    autoConnect,
    baseDelayMs,
    idEdificio,
    idIncidencia,
    jitterFactor,
    limpiarTimerReconexion,
    maxDelayMs,
    maxRetries,
    programarReintentoConBackoff,
    sincronizarSalasEstado,
    socketFactory,
    url,
  ]);

  const emitir = useCallback((evento, payload) => {
    const sock = socketRef.current;
    if (!sock || !sock.connected || !evento) return false;
    sock.emit(evento, payload);
    return true;
  }, []);

  const desconectar = useCallback(() => {
    manualDisconnectRef.current = true;
    limpiarTimerReconexion();
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    setIsConnected(false);
    setSocketId(null);
  }, [limpiarTimerReconexion]);

  const reconectar = useCallback(() => {
    manualDisconnectRef.current = false;
    retryCountRef.current = 0;
    setIntentosReconexion(0);
    limpiarTimerReconexion();
    if (socketRef.current) {
      const { token } = resolveSocketAuthContext();
      if (token) {
        socketRef.current.auth = {
          ...(socketRef.current.auth || {}),
          token,
          bearer: `Bearer ${token}`,
        };
      }
      socketRef.current.connect();
    }
  }, [limpiarTimerReconexion]);

  return {
    isConnected,
    conectado: isConnected,
    socketId,
    ultimoEvento,
    ultimosEventos,
    salasActivas,
    intentosReconexion,
    unirseSala,
    unirse_sala: unirseSala,
    joinRoom: unirseSala,
    dejarSala,
    dejar_sala: dejarSala,
    leaveRoom: dejarSala,
    emitir,
    reconectar,
    desconectar,
  };
};

export default useWebSocket;
