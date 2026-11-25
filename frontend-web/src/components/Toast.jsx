import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiBell,
  FiCheckCircle,
  FiExternalLink,
  FiInfo,
  FiVolume2,
  FiVolumeX,
  FiX,
} from 'react-icons/fi';
import { useToast } from '../context/ToastContext';
import { useWebSocket, WS_EVENTS } from '../hooks/useWebSocket';
import {
  getAccessToken,
  getPermissions,
  getUsuarioActual,
} from '../services/authService';
import {
  TOAST_ACTION_LABEL,
  TOAST_AUTO_DISMISS_MS,
  construirAlertaToastDesdeWebSocket,
  esEventoToastDuplicado,
  extraerIdentidadUsuario,
  resolverSalasSuscripcionToast,
} from '../utils/realtimeToastAlerts';

const TYPE_STYLES = {
  success: 'bg-emerald-700 text-white border-emerald-500/80',
  error: 'bg-red-700 text-white border-red-500/80',
  warning: 'bg-amber-600 text-white border-amber-400/80',
  critical: 'bg-gradient-to-r from-red-700 via-rose-700 to-amber-700 text-white border-amber-300/90',
  info: 'bg-primary text-white border-primary/80',
};

const ToastIcon = ({ type }) => {
  if (type === 'critical' || type === 'warning' || type === 'error') {
    return <FiAlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-200" aria-hidden="true" />;
  }
  if (type === 'success') {
    return <FiCheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-200" aria-hidden="true" />;
  }
  if (type === 'info') {
    return <FiInfo className="w-5 h-5 shrink-0 mt-0.5 text-blue-200" aria-hidden="true" />;
  }
  return <FiBell className="w-5 h-5 shrink-0 mt-0.5 text-white" aria-hidden="true" />;
};

/**
 * Subcomponente de suscripción WebSocket vinculado al ciclo de vida de la sesión autenticada.
 * - Solo se monta cuando existe una sesión válida (`sesionActiva === true`).
 * - Al cerrar sesión o cambiar de usuario (`key={sessionKey}`), se desmonta limpiando listeners
 *   y cerrando la conexión WebSocket inmediatamente.
 * - Suscribe únicamente a las salas permitidas según los permisos del usuario.
 */
const ToastRealtimeSubscriber = ({ salas, onEvent }) => {
  useWebSocket(
    {
      onOrdenAsignada: (payload) => onEvent(WS_EVENTS.ORDEN_ASIGNADA, payload),
      onIncidenciaActualizada: (payload) => onEvent(WS_EVENTS.INCIDENCIA_ACTUALIZADA, payload),
      onNuevaIncidencia: (payload) => onEvent(WS_EVENTS.NUEVA_INCIDENCIA, payload),
      onEstadoCambiado: (payload) => onEvent(WS_EVENTS.ESTADO_CAMBIADO, payload),
    },
    { autoConnect: true, salas },
  );

  return null;
};

/**
 * TAL-189: Sistema de Notificaciones Toast Flotantes en Tiempo Real.
 * - Criterio 1: Aparece en la esquina superior derecha (`fixed top-4 right-4 z-50`) con sonido discreto opcional.
 * - Criterio 2: Al hacer click en la alerta o en el botón 'Ver Orden', navega a la orden de trabajo o incidencia correspondiente.
 * - Criterio 3: Soporta cierre manual y auto-desvanecimiento tras 6 segundos (`TOAST_AUTO_DISMISS_MS = 6000`).
 */
const Toast = () => {
  const {
    isVisible,
    message,
    type,
    title,
    actionLabel,
    actionUrl,
    soundEnabled,
    showToast,
    hideToast,
    toggleSound,
  } = useToast();

  const navigate = useNavigate();
  const location = useLocation();
  const [, setSessionRevision] = useState(0);
  const dedupeMapRef = useRef(new Map());
  const prevSessionKeyRef = useRef('');

  // Evaluar estado de sesión actual en cada render (incluyendo cambios de ruta login/logout)
  const token = getAccessToken();
  const usuarioActual = getUsuarioActual();
  const { userId, correo, rol } = extraerIdentidadUsuario(usuarioActual);
  const sesionActiva = Boolean(token && usuarioActual && (userId || correo));
  const permisosUsuario = sesionActiva ? getPermissions() : [];
  const salasPermitidas = sesionActiva
    ? resolverSalasSuscripcionToast(usuarioActual, permisosUsuario)
    : [];
  const sessionKey = sesionActiva
    ? `${token}:${userId || correo}:${rol}:${salasPermitidas.join(',')}`
    : '';

  // Sincronizar cambios de inicio/cierre de sesión disparados por authService o storage
  useEffect(() => {
    const handleCambioSesion = () => {
      setSessionRevision((rev) => rev + 1);
    };

    window.addEventListener('tecnico-cambiado', handleCambioSesion);
    window.addEventListener('storage', handleCambioSesion);
    return () => {
      window.removeEventListener('tecnico-cambiado', handleCambioSesion);
      window.removeEventListener('storage', handleCambioSesion);
    };
  }, []);

  // Limpiar caché de deduplicación y alertas activas al cerrar o cambiar de sesión
  useEffect(() => {
    if (prevSessionKeyRef.current && prevSessionKeyRef.current !== sessionKey) {
      dedupeMapRef.current.clear();
      if (actionUrl) {
        hideToast();
      }
    }
    prevSessionKeyRef.current = sessionKey;
  }, [sessionKey, actionUrl, hideToast, location.pathname]);

  useEffect(() => {
    const mapActual = dedupeMapRef.current;
    return () => {
      mapActual.clear();
    };
  }, []);

  const procesarEventoTiempoReal = useCallback(
    (rawEventName, payload) => {
      const tokenVigente = getAccessToken();
      const usuarioVigente = getUsuarioActual();
      if (!tokenVigente || !usuarioVigente) return;

      const permisosVigentes = getPermissions();
      const alerta = construirAlertaToastDesdeWebSocket(
        rawEventName,
        payload,
        usuarioVigente,
        permisosVigentes,
      );
      if (!alerta) return;

      const dedupeKey = alerta.dedupeKey || `${rawEventName}:${alerta.actionUrl}`;
      if (esEventoToastDuplicado(dedupeMapRef.current, dedupeKey, Date.now())) {
        return;
      }

      showToast(alerta);
    },
    [showToast],
  );

  // Puente de eventos DOM para disparo programático y pruebas E2E
  useEffect(() => {
    const handleCustomWsToast = (event) => {
      const detail = event?.detail || {};
      const eventName = detail.evento || detail.event || WS_EVENTS.INCIDENCIA_ACTUALIZADA;
      const payload = detail.payload || detail;
      procesarEventoTiempoReal(eventName, payload);
    };

    window.addEventListener('ws-toast-alert', handleCustomWsToast);
    return () => {
      window.removeEventListener('ws-toast-alert', handleCustomWsToast);
    };
  }, [procesarEventoTiempoReal]);

  const currentStyle = TYPE_STYLES[type] || TYPE_STYLES.info;
  const esInteractivo = Boolean(actionUrl);
  const textoBoton = actionLabel || TOAST_ACTION_LABEL;

  const handleNavegarOrden = (event) => {
    if (event) {
      event.stopPropagation();
    }
    if (!actionUrl) return;
    hideToast();
    navigate(actionUrl);
  };

  const handleCerrarManual = (event) => {
    event.stopPropagation();
    hideToast();
  };

  const handleToggleSonido = (event) => {
    event.stopPropagation();
    toggleSound();
  };

  const handleKeyDownAlerta = (event) => {
    if (!esInteractivo) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavegarOrden(event);
    }
  };

  return (
    <>
      {sesionActiva && (
        <ToastRealtimeSubscriber
          key={sessionKey}
          salas={salasPermitidas}
          onEvent={procesarEventoTiempoReal}
        />
      )}

      {isVisible && (
        <div
          role={type === 'critical' || type === 'error' ? 'alert' : 'status'}
          id="toast-notification"
          data-cy="toast-notification"
          data-toast-type={type || 'info'}
          data-toast-duration={TOAST_AUTO_DISMISS_MS}
          data-action-url={actionUrl || ''}
          aria-live={type === 'critical' ? 'assertive' : 'polite'}
          tabIndex={esInteractivo ? 0 : undefined}
          onClick={esInteractivo ? handleNavegarOrden : undefined}
          onKeyDown={esInteractivo ? handleKeyDownAlerta : undefined}
          className={`fixed top-4 right-4 z-50 max-w-md w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[340px] px-4 py-3.5 rounded-xl border shadow-2xl transition-all duration-300 ${currentStyle} ${
            esInteractivo ? 'cursor-pointer hover:brightness-105' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            <ToastIcon type={type} />

            <div className="flex-1 min-w-0">
              {title && (
                <p
                  id="toast-title"
                  data-cy="toast-title"
                  className="text-xs font-extrabold uppercase tracking-wider text-white/95 mb-0.5"
                >
                  {title}
                </p>
              )}
              <p
                id="toast-message"
                data-cy="toast-message"
                className="text-sm font-medium leading-snug break-words"
              >
                {message}
              </p>

              {esInteractivo && (
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    id="toast-ver-orden"
                    data-cy="toast-ver-orden"
                    onClick={handleNavegarOrden}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-gray-900 hover:bg-gray-100 text-xs font-bold shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <span>{textoBoton}</span>
                    <FiExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                id="toast-sound-toggle"
                data-cy="toast-sound-toggle"
                onClick={handleToggleSonido}
                aria-label={
                  soundEnabled ? 'Silenciar sonido de alertas' : 'Activar sonido de alertas'
                }
                title={
                  soundEnabled ? 'Sonido discreto activado' : 'Sonido discreto silenciado'
                }
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {soundEnabled ? (
                  <FiVolume2 className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <FiVolumeX className="w-4 h-4" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                id="toast-close-btn"
                data-cy="toast-close-btn"
                onClick={handleCerrarManual}
                aria-label="Cerrar notificación"
                title="Cerrar notificación"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <FiX className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Toast;
