import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FiBell,
  FiCheck,
  FiAlertCircle,
  FiClock,
  FiTool,
  FiArrowRight,
} from 'react-icons/fi';
import { useWebSocket } from '../hooks/useWebSocket';
import { getUsuarioActual } from '../services/authService';
import api from '../services/api';
import {
  NOTIFICACIONES_INICIALES,
  formatBadgeCount,
  normalizarEventoNotificacion,
  formatearPrioridadTexto,
  calcularTiempoRelativo,
  contarNoLeidas,
  marcarTodasComoLeidas,
  marcarNotificacionComoLeida,
  agregarNotificacionSinDuplicados,
  debeRecibirNotificacion,
  obtenerStorageKeyNotificaciones,
  obtenerRolUsuarioActual,
  hidratarNotificacionesDesdeApi,
} from '../utils/notificaciones.js';

export {
  NOTIFICACIONES_INICIALES,
  formatBadgeCount,
  normalizarEventoNotificacion,
  formatearPrioridadTexto,
  calcularTiempoRelativo,
  contarNoLeidas,
  marcarTodasComoLeidas,
  marcarNotificacionComoLeida,
  agregarNotificacionSinDuplicados,
  debeRecibirNotificacion,
  obtenerStorageKeyNotificaciones,
  obtenerRolUsuarioActual,
  hidratarNotificacionesDesdeApi,
};

/**
 * Componente NotificacionesDropdown (TAL-190).
 * Integra campana en el Header, badge dinámico, sincronización instantánea vía WebSocket,
 * animación de rebote y visualización de las últimas 5 notificaciones.
 * Inicialmente vacía hasta registrarse un suceso reciente, con deduplicación estricta para evitar repeticiones.
 */
const NotificacionesDropdown = ({
  initialNotifications = NOTIFICACIONES_INICIALES,
  maxDisplay = 5,
  wsSalas = ['incidencias'],
}) => {
  const [abierto, setAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState(() => {
    try {
      const usuario = getUsuarioActual();
      const storageKey = obtenerStorageKeyNotificaciones(usuario);
      if (storageKey && typeof localStorage !== 'undefined') {
        const guardadas = localStorage.getItem(storageKey);
        if (guardadas) {
          const parsed = JSON.parse(guardadas);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      }
    } catch {
      // Ignorar errores de lectura en storage
    }
    return initialNotifications;
  });
  const [animarRebote, setAnimarRebote] = useState(false);
  const dropdownRef = useRef(null);
  const bounceTimerRef = useRef(null);
  const recentProcessedRef = useRef(new Map());
  const notificacionesRef = useRef(notificaciones);

  useEffect(() => {
    notificacionesRef.current = notificaciones;
  }, [notificaciones]);

  // Cuenta notificaciones no leídas
  const noLeidas = notificaciones.filter((n) => !n.leida).length;
  const prevNoLeidasRef = useRef(noLeidas);

  // Sincronizar notificaciones en caso de cambio de usuario en la misma sesión
  const usuarioActual = getUsuarioActual();
  const idUsuarioActual = usuarioActual?.id_usuario || usuarioActual?.id || usuarioActual?.email || null;

  useEffect(() => {
    const storageKey = obtenerStorageKeyNotificaciones(usuarioActual);
    if (storageKey && typeof localStorage !== 'undefined') {
      try {
        const guardadas = localStorage.getItem(storageKey);
        if (guardadas) {
          const parsed = JSON.parse(guardadas);
          if (Array.isArray(parsed)) {
            setNotificaciones(parsed);
            return;
          }
        }
      } catch {}
    }
    setNotificaciones(initialNotifications);
  }, [idUsuarioActual]);

  // Hidratar notificaciones iniciales desde PostgreSQL vía API Gateway (Opción A) ante carga en frío o inicio de sesión
  useEffect(() => {
    let activo = true;

    const cargarHistorialServidor = async () => {
      const usuario = getUsuarioActual();
      if (!usuario) return;

      try {
        const alertasServidor = await hidratarNotificacionesDesdeApi(usuario, api);
        if (!activo || !alertasServidor || alertasServidor.length === 0) return;

        setNotificaciones((actuales) => {
          let resultado = [...actuales];
          for (const alerta of alertasServidor) {
            const yaExiste = resultado.some(
              (act) =>
                (act.id && alerta.id && act.id === alerta.id) ||
                (act.claveDeduplicacion &&
                  alerta.claveDeduplicacion &&
                  act.claveDeduplicacion === alerta.claveDeduplicacion) ||
                (act.idReferencia &&
                  alerta.idReferencia &&
                  act.idReferencia === alerta.idReferencia &&
                  act.tipo === alerta.tipo),
            );
            if (!yaExiste) {
              resultado = agregarNotificacionSinDuplicados(resultado, alerta);
            }
          }
          return resultado;
        });
      } catch {
        // En caso de fallo de red, mantener el estado local silenciosamente
      }
    };

    void cargarHistorialServidor();

    return () => {
      activo = false;
    };
  }, [idUsuarioActual]);

  // Persistir notificaciones en localStorage exclusivas para el usuario logueado
  useEffect(() => {
    try {
      const usuario = getUsuarioActual();
      const storageKey = obtenerStorageKeyNotificaciones(usuario);
      if (storageKey && typeof localStorage !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(notificaciones.slice(0, 30)));
      }
    } catch {
      // Ignorar errores de cuota o serialización
    }
  }, [notificaciones]);

  // Forzar actualización periódica para que los tiempos relativos avancen (Ahora mismo -> 1 minuto -> n minutos)
  const [, setRelojTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setRelojTick((tick) => tick + 1);
    }, 30000); // Recalcula cada 30 segundos

    return () => clearInterval(timer);
  }, []);

  // Disparar micro-animación de rebote (bounce)
  const dispararRebote = useCallback(() => {
    setAnimarRebote(true);
    if (bounceTimerRef.current) {
      clearTimeout(bounceTimerRef.current);
    }
    bounceTimerRef.current = setTimeout(() => {
      setAnimarRebote(false);
    }, 1000);
  }, []);

  // Limpiar timer de rebote al desmontar
  useEffect(() => {
    return () => {
      if (bounceTimerRef.current) {
        clearTimeout(bounceTimerRef.current);
      }
    };
  }, []);

  // Detectar incremento en el número de no leídas para activar rebote
  useEffect(() => {
    if (noLeidas > prevNoLeidasRef.current) {
      dispararRebote();
    }
    prevNoLeidasRef.current = noLeidas;
  }, [noLeidas, dispararRebote]);

  // Manejador centralizado para eventos en tiempo real provenientes del WebSocket con deduplicación estricta
  const procesarEventoWebSocket = useCallback(
    (payload, eventName) => {
      // 1. Filtrar si la notificación corresponde al usuario actual según su rol e ID
      const usuario = getUsuarioActual();
      if (!debeRecibirNotificacion(payload, eventName, usuario)) {
        return;
      }

      const idRecurso = payload?.id_incidencia || payload?.id_orden || payload?.id || payload?.titulo || '';

      const esCambioPrioridad =
        payload?.accion === 'CAMBIO_PRIORIDAD' ||
        payload?.tipo_cambio === 'CAMBIO_PRIORIDAD' ||
        payload?.cambio_prioridad === true ||
        payload?.tipo_evento === 'CAMBIO_PRIORIDAD' ||
        eventName === 'prioridad_cambiada' ||
        eventName === 'cambio_prioridad';

      const esAsignacionOrden =
        eventName === 'orden_asignada' ||
        payload?.tipo_evento === 'ASIGNACION_ORDEN' ||
        payload?.tipo_evento === 'REASIGNACION_ORDEN' ||
        payload?.evento === 'ORDEN_TRABAJO_ASIGNADA' ||
        payload?.evento === 'ORDEN_TRABAJO_REASIGNADA' ||
        payload?.accion === 'REASIGNACION' ||
        payload?.es_reasignacion === true ||
        Boolean(payload?.id_orden && (payload?.id_tecnico || payload?.usuario_responsable));

      const esReasignacion = Boolean(
        payload?.es_reasignacion === true ||
        payload?.accion === 'REASIGNACION' ||
        payload?.tipo_cambio === 'REASIGNACION' ||
        payload?.tipo_evento === 'REASIGNACION_ORDEN' ||
        payload?.evento === 'ORDEN_TRABAJO_REASIGNADA' ||
        payload?.tecnico_anterior_id ||
        (esAsignacionOrden &&
          notificacionesRef.current.some(
            (item) =>
              item.tipo === 'orden' &&
              item.idReferencia === (payload?.id_incidencia || payload?.id) &&
              item.idTecnico &&
              item.idTecnico !==
                String(payload?.id_tecnico || payload?.usuario_responsable || '')
                  .trim()
                  .toLowerCase(),
          ))
      );

      const payloadConReasignacion =
        esReasignacion && !payload?.es_reasignacion
          ? { ...payload, es_reasignacion: true }
          : payload;

      const subTipo = esCambioPrioridad && payload?.prioridad
        ? `prioridad_${String(payload.prioridad).trim().toLowerCase()}`
        : esAsignacionOrden
        ? `orden_${esReasignacion ? 'reasig' : 'asig'}_${payload?.id_tecnico || payload?.usuario_responsable || ''}_${payload?.id_orden || ''}`
        : payload?.accion ||
          payload?.tipo_cambio ||
          (payload?.cambio_prioridad ? `prioridad_${payload?.prioridad}` : null) ||
          payload?.nuevo_estado ||
          payload?.estado ||
          payload?.prioridad ||
          payload?.tipo_evento ||
          eventName;

      const normEvent = ['estado_cambiado', 'incidencia_actualizada', 'incidencia-actualizada'].includes(
        String(eventName).replace('-', '_').toLowerCase(),
      )
        ? 'actualizacion'
        : ['nueva_incidencia', 'nueva-incidencia'].includes(
            String(eventName).replace('-', '_').toLowerCase(),
          )
        ? 'nueva'
        : String(eventName).replace('-', '_').toLowerCase();

      const dedupKey = `${normEvent}:${idRecurso}:${subTipo}`;

      const ahora = Date.now();
      const previo = recentProcessedRef.current.get(dedupKey);

      // Si el mismo evento idéntico para el mismo recurso llegó en los últimos 2 segundos, descartar la réplica
      if (previo && ahora - previo < 2000) {
        return;
      }
      recentProcessedRef.current.set(dedupKey, ahora);

      if (recentProcessedRef.current.size > 50) {
        for (const [k, ts] of recentProcessedRef.current.entries()) {
          if (ahora - ts > 15000) {
            recentProcessedRef.current.delete(k);
          }
        }
      }

      const nuevaNotif = normalizarEventoNotificacion(payloadConReasignacion, eventName, usuario);

      setNotificaciones((prev) => {
        const listaActualizada = agregarNotificacionSinDuplicados(prev, nuevaNotif);
        if (listaActualizada !== prev) {
          dispararRebote();
        }
        return listaActualizada;
      });
    },
    [dispararRebote],
  );

  // Complementar salas WebSocket con 'coordinadores' según el rol del usuario autenticado (TAL-186)
  const rolActual = obtenerRolUsuarioActual(usuarioActual);
  const esCoordinador = ['COORDINADOR', 'SUPERVISOR', 'ADMINISTRADOR'].includes(rolActual);

  const salasComplementadas = useMemo(() => {
    const conjunto = new Set(Array.isArray(wsSalas) ? wsSalas : ['incidencias']);
    if (esCoordinador) {
      conjunto.add('coordinadores');
    }
    return Array.from(conjunto);
  }, [wsSalas, esCoordinador]);

  // Conexión reactiva en tiempo real mediante el hook useWebSocket (TAL-186)
  const { unirseSala, dejarSala } = useWebSocket(
    {
      onNuevaIncidencia: (payload) => procesarEventoWebSocket(payload, 'nueva_incidencia'),
      onIncidenciaActualizada: (payload) =>
        procesarEventoWebSocket(payload, 'incidencia_actualizada'),
      onOrdenAsignada: (payload) => procesarEventoWebSocket(payload, 'orden_asignada'),
      onEstadoCambiado: (payload) => procesarEventoWebSocket(payload, 'estado_cambiado'),
    },
    { autoConnect: true, salas: salasComplementadas },
  );

  // Sincronización reactiva de la sala coordinadores (TAL-186) ante cambios de sesión
  useEffect(() => {
    if (esCoordinador) {
      void unirseSala('coordinadores');
    } else {
      void dejarSala('coordinadores');
    }
  }, [idUsuarioActual, esCoordinador, unirseSala, dejarSala]);

  // Cierra el menú al hacer clic afuera (ClickAway listener)
  useEffect(() => {
    const handleClickAfuera = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAbierto(false);
      }
    };

    if (abierto) {
      document.addEventListener('mousedown', handleClickAfuera);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickAfuera);
    };
  }, [abierto]);

  // Marca una notificación individual como leída
  const marcarComoLeida = (id) => {
    setNotificaciones((prev) => marcarNotificacionComoLeida(prev, id));
  };

  // Marca todas las notificaciones como leídas (Criterio 2 y 3)
  const marcarTodasLeidas = () => {
    setNotificaciones((prev) => marcarTodasComoLeidas(prev));
  };

  // Últimas 5 notificaciones para desplegar en el menú según descripción
  const ultimasNotificaciones = notificaciones.slice(0, maxDisplay);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Botón de campana interactivo con badge dinámico */}
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        className="relative p-2 rounded-xl text-gray-500 hover:text-primary hover:bg-primary-50/70 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring"
        title="Notificaciones"
        aria-label={
          noLeidas > 0
            ? `Notificaciones: ${noLeidas} no leídas`
            : 'Abrir notificaciones'
        }
        aria-expanded={abierto}
        data-testid="notification-bell-btn"
      >
        <FiBell className="w-5 h-5 transition-transform duration-200 hover:rotate-6" />

        {/* Badge numérico en tiempo real con animación CSS ligera de rebote (Criterios 1 y 3 — TAL-203) */}
        {noLeidas > 0 && (
          <span
            key="notification-badge"
            data-testid="notification-badge"
            className={`absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[1.35rem] h-5 px-1.5 bg-red-600 text-white text-[11px] font-black rounded-full ring-2 ring-white shadow-md transition-all duration-300 ease-in-out pointer-events-none select-none animate-notif-badge ${
              animarRebote ? 'animate-bounce ring-red-300' : ''
            }`}
          >
            {formatBadgeCount(noLeidas)}
          </span>
        )}
      </button>

      {/* Popover con efecto Glassmorphism y lista de últimas 5 notificaciones */}
      {abierto && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white/95 backdrop-blur-md border border-white/60 shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden animate-notif-dropdown"
          data-testid="notification-dropdown-menu"
        >
            {/* Cabecera del popover con contador y botón 'Marcar todo como leído' (Criterio 2) */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/80 border-b border-gray-100 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-800">Notificaciones</span>
                {noLeidas > 0 ? (
                  <span
                    data-testid="badge-contador-dropdown"
                    className="px-2 py-0.5 text-[11px] font-black bg-red-50 text-red-600 rounded-full border border-red-100 shadow-2xs"
                  >
                    {formatBadgeCount(noLeidas)} nuevas
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                    Al día
                  </span>
                )}
              </div>

              {noLeidas > 0 && (
                <button
                  type="button"
                  onClick={marcarTodasLeidas}
                  data-testid="btn-marcar-todo-leido"
                  className="text-[11px] text-primary hover:text-primary-hover font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring rounded px-1.5 py-0.5"
                >
                  Marcar todo como leído
                </button>
              )}
            </div>

            {/* Lista con las últimas 5 notificaciones desplegadas con enlaces navegables */}
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100/80 p-1.5">
              {ultimasNotificaciones.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <FiBell className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-gray-600">No hay notificaciones recientes</p>
                </div>
              ) : (
                ultimasNotificaciones.map((item) => {
                  const enlaceDestino = item.enlace || '/incidencias';

                  return (
                    <Link
                      key={item.id}
                      to={enlaceDestino}
                      onClick={() => {
                        marcarComoLeida(item.id);
                        setAbierto(false);
                      }}
                      data-testid={`notif-item-${item.id}`}
                      className={`group relative flex items-start gap-3 p-3 rounded-xl transition-all duration-150 cursor-pointer ${
                        item.leida
                          ? 'bg-transparent hover:bg-gray-50/80 opacity-75'
                          : 'bg-primary-50/40 hover:bg-primary-50/80'
                      }`}
                    >
                      {/* Icono semántico del tipo de alerta */}
                      <div
                        className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-2xs ${
                          item.tipo === 'incidencia' || item.tipo === 'prioridad'
                            ? 'bg-amber-100/80 text-amber-600 group-hover:bg-amber-200/80'
                            : item.tipo === 'activo'
                            ? 'bg-indigo-100/80 text-indigo-600 group-hover:bg-indigo-200/80'
                            : item.tipo === 'orden'
                            ? 'bg-primary-50 text-primary group-hover:bg-primary-100'
                            : 'bg-emerald-100/80 text-emerald-600 group-hover:bg-emerald-200/80'
                        }`}
                      >
                        {item.tipo === 'incidencia' || item.tipo === 'prioridad' ? (
                          <FiAlertCircle className="w-4 h-4" />
                        ) : item.tipo === 'activo' ? (
                          <FiTool className="w-4 h-4" />
                        ) : item.tipo === 'orden' ? (
                          <FiTool className="w-4 h-4" />
                        ) : (
                          <FiCheck className="w-4 h-4" />
                        )}
                      </div>

                      {/* Contenido descriptivo de la notificación */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-gray-900 truncate group-hover:text-primary transition-colors">
                            {item.titulo}
                          </p>
                          <span className="text-[10px] text-gray-500 flex items-center gap-0.5 flex-shrink-0">
                            <FiClock className="w-2.5 h-2.5" />
                            {calcularTiempoRelativo(item.timestamp, item.tiempo)}
                          </span>
                        </div>

                        {/* Caja propia para el nombre de la incidencia con acople multilínea */}
                        <div className="mt-0.5 w-full min-w-0">
                          <p className="text-xs text-gray-700 font-medium leading-snug break-words whitespace-normal [overflow-wrap:anywhere]">
                            {item.mensaje}
                          </p>
                        </div>

                        {item.detalle && (
                          <p className="text-[11px] text-gray-500 mt-0.5 truncate break-words">
                            {item.detalle}
                          </p>
                        )}
                      </div>

                      {/* Indicador de estado no leído (dot azul) */}
                      {!item.leida ? (
                        <span
                          className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0 ring-2 ring-primary/20"
                          title="No leída"
                        />
                      ) : (
                        <FiArrowRight className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 mt-2 flex-shrink-0 transition-opacity" />
                      )}
                    </Link>
                  );
                })
              )}
            </div>

            {/* Pie del popover con enlace global a incidencias */}
            <div className="px-4 py-2.5 bg-gray-50/90 border-t border-gray-100 flex items-center justify-end text-xs">
              <Link
                to="/incidencias"
                onClick={() => setAbierto(false)}
                className="text-[11px] text-primary hover:text-primary-hover font-bold flex items-center gap-1 transition-colors"
              >
                <span>Ver incidencias</span>
                <FiArrowRight className="w-3 h-3" />
              </Link>
            </div>
        </div>
      )}
    </div>
  );
};

export default NotificacionesDropdown;
