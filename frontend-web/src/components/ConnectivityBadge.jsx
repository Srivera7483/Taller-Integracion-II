import React, { useState, useEffect, useRef } from 'react';
import { FiWifiOff, FiAlertTriangle, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import { useNetworkStatus } from '../context/NetworkStatusContext';

/**
 * Constantes de configuración de animación y temporizadores
 * Cumplimiento SonarQube: Evita números mágicos y facilita mantenibilidad.
 */
export const AUTO_HIDE_DELAY_MS = 4000; // Criterio 1: 4 segundos
export const FADE_OUT_DURATION_MS = 500; // Transición sutil de desvanecimiento

/**
 * Micro-componente accesible para la micro-animación del punto de pulso (Beacon)
 */
const StatusBeacon = ({ pingClass, dotClass }) => (
  <span className="relative flex h-2.5 w-2.5 flex-shrink-0" aria-hidden="true">
    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pingClass}`} />
    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotClass}`} />
  </span>
);

/**
 * Micro-componente reutilizable para el botón "Comprobar ahora"
 * Criterio 2: Permanece accesible para reintentar la conexión de inmediato.
 */
const ComprobarButton = ({ isChecking, onCheck, bgClass }) => (
  <button
    type="button"
    onClick={onCheck}
    disabled={isChecking}
    aria-label="Comprobar conexión ahora"
    className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white text-white ${bgClass}`}
  >
    <FiRefreshCw
      className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`}
      aria-hidden="true"
    />
    <span>{isChecking ? 'Comprobando...' : 'Comprobar ahora'}</span>
  </button>
);

/**
 * TAL-182: Componente Flotante de Indicador de Estado de Conexión (ConnectivityBadge)
 *
 * Despliega una píldora flotante con micro-animaciones en la parte superior:
 * - Verde esmeralda: 'Conectado al Sistema' (se oculta tras 4s al volver online).
 * - Amarillo ámbar: 'Conexión inestable' (API Gateway inaccesible o fallo sostenido).
 * - Rojo carmesí: 'Sin conexión' (dispositivo sin señal de red, con botón 'Comprobar ahora').
 */
const ConnectivityBadge = ({ autoHideDelay = AUTO_HIDE_DELAY_MS }) => {
  const {
    isOnline,
    isServerReachable,
    gatewayStatus,
    isChecking,
    checkHeartbeat,
  } = useNetworkStatus();

  const [showRecovered, setShowRecovered] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const wasProblematicRef = useRef(false);

  useEffect(() => {
    const hasProblem = !isOnline || !isServerReachable;

    if (hasProblem) {
      wasProblematicRef.current = true;
      return undefined;
    }

    // Si hubo un problema previo y ahora todo está restablecido
    if (wasProblematicRef.current) {
      wasProblematicRef.current = false;
      setShowRecovered(true);
      setIsFadingOut(false);

      // Inicia desvanecimiento sutil antes de ocultar
      const fadeStartDelay = Math.max(0, autoHideDelay - FADE_OUT_DURATION_MS);
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, fadeStartDelay);

      // Oculta completamente tras cumplir el tiempo solicitado (4 segundos)
      const hideTimer = setTimeout(() => {
        setShowRecovered(false);
        setIsFadingOut(false);
      }, autoHideDelay);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }

    return undefined;
  }, [isOnline, isServerReachable, autoHideDelay]);

  // Si todo está operativo y no estamos en la ventana de recuperación temporal, no renderizar
  if (isOnline && isServerReachable && !showRecovered) {
    return null;
  }

  // Configuración reactiva según el estado de conectividad
  let config = null;

  if (!isOnline) {
    // Estado 1: Rojo carmesí ('Sin conexión')
    config = {
      role: 'alert',
      ariaLive: 'assertive',
      containerBg: 'bg-rose-700 text-white border-rose-600/90 shadow-rose-950/30',
      beaconPing: 'bg-rose-300',
      beaconDot: 'bg-rose-100',
      icon: <FiWifiOff className="w-4 h-4 text-rose-200 flex-shrink-0 animate-pulse" aria-hidden="true" />,
      title: 'Sin conexión',
      detail: 'Sin conexión a Internet',
      showButton: true,
      buttonBg: 'bg-rose-800 hover:bg-rose-900 active:bg-rose-950',
    };
  } else if (!isServerReachable) {
    // Estado 2: Amarillo ámbar ('Conexión inestable')
    config = {
      role: 'alert',
      ariaLive: 'assertive',
      containerBg: 'bg-amber-600 text-white border-amber-500/90 shadow-amber-950/25',
      beaconPing: 'bg-amber-200',
      beaconDot: 'bg-amber-100',
      icon: <FiAlertTriangle className="w-4 h-4 text-amber-200 flex-shrink-0 animate-pulse" aria-hidden="true" />,
      title: 'Conexión inestable',
      detail: `API Gateway Inaccesible (${gatewayStatus || '502/503'})`,
      showButton: true,
      buttonBg: 'bg-amber-700 hover:bg-amber-800 active:bg-amber-900',
    };
  } else {
    // Estado 3: Verde esmeralda ('Conectado al Sistema')
    config = {
      role: 'status',
      ariaLive: 'polite',
      containerBg: 'bg-emerald-600 text-white border-emerald-500/90 shadow-emerald-950/20',
      beaconPing: 'bg-emerald-300',
      beaconDot: 'bg-emerald-100',
      icon: <FiCheckCircle className="w-4 h-4 text-emerald-200 flex-shrink-0" aria-hidden="true" />,
      title: 'Conectado al Sistema',
      detail: 'Conexión restablecida con el servidor API Gateway',
      showButton: false,
      buttonBg: '',
    };
  }

  const animationClasses = isFadingOut
    ? 'opacity-0 -translate-y-2 pointer-events-none'
    : 'opacity-100 translate-y-0';

  return (
    <div
      className="fixed top-3 sm:top-4 inset-x-0 z-50 flex justify-center pointer-events-none px-3 sm:px-6"
      data-testid="connectivity-badge-wrapper"
    >
      <aside
        role={config.role}
        aria-live={config.ariaLive}
        className={`pointer-events-auto inline-flex items-center gap-2.5 sm:gap-3 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border shadow-lg text-xs sm:text-sm font-medium transition-all duration-500 ease-in-out max-w-full truncate ${config.containerBg} ${animationClasses}`}
      >
        {/* Micro-animación beacon */}
        <StatusBeacon pingClass={config.beaconPing} dotClass={config.beaconDot} />

        {/* Ícono de estado */}
        {config.icon}

        {/* Textos descriptivos */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold tracking-wide">{config.title}</span>
          <span className="hidden sm:inline text-xs opacity-90 truncate">
            • {config.detail}
          </span>
        </div>

        {/* Botón de acción 'Comprobar ahora' */}
        {config.showButton && (
          <ComprobarButton
            isChecking={isChecking}
            onCheck={() => checkHeartbeat()}
            bgClass={config.buttonBg}
          />
        )}
      </aside>
    </div>
  );
};

export default ConnectivityBadge;
