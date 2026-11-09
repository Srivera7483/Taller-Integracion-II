import React, { useState, useEffect, useRef } from 'react';
import { FiWifiOff, FiAlertTriangle, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import { useNetworkStatus } from '../context/NetworkStatusContext';

/**
 * Banner Global de Estado de Red y Conectividad con API Gateway.
 * Alerta de forma inmediata si el dispositivo pierde la señal de red (isOnline = false)
 * o si el Gateway responde de manera sostenida con 502/503 (isServerReachable = false).
 */
const NetworkStatusBanner = () => {
  const {
    isOnline,
    isServerReachable,
    gatewayStatus,
    isChecking,
    checkHeartbeat,
    consecutiveFailures,
  } = useNetworkStatus();

  const [showRecovered, setShowRecovered] = useState(false);
  const wasProblematicRef = useRef(false);

  useEffect(() => {
    const hasProblem = !isOnline || !isServerReachable;

    if (hasProblem) {
      wasProblematicRef.current = true;
    } else if (wasProblematicRef.current) {
      // Se resolvió el problema: mostrar banner temporal de éxito
      setShowRecovered(true);
      wasProblematicRef.current = false;
      const timer = setTimeout(() => {
        setShowRecovered(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isServerReachable]);

  // Si todo está bien y no hay mensaje de recuperación, no renderizar nada
  if (isOnline && isServerReachable && !showRecovered) {
    return null;
  }

  // 1. Caso de recuperación exitosa
  if (showRecovered && isOnline && isServerReachable) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="w-full bg-emerald-600 text-white px-4 py-2.5 flex items-center justify-between shadow-md transition-all duration-300 z-50 text-sm font-medium"
      >
        <div className="flex items-center gap-2.5 mx-auto">
          <FiCheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-200" aria-hidden="true" />
          <span>Conexión restablecida con el servidor API Gateway.</span>
        </div>
      </aside>
    );
  }

  // 2. Caso Offline nativo (Criterio 1: isOnline = false)
  if (!isOnline) {
    return (
      <aside
        role="alert"
        aria-live="assertive"
        className="w-full bg-rose-600 text-white px-4 py-2.5 flex items-center justify-between shadow-lg transition-all duration-300 z-50 text-sm"
      >
        <div className="flex items-center gap-3 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <FiWifiOff className="w-5 h-5 flex-shrink-0 text-rose-200 animate-pulse" aria-hidden="true" />
            <div className="truncate">
              <span className="font-bold">Sin conexión a Internet: </span>
              <span className="text-rose-100">
                El dispositivo ha perdido la señal de red. Operando en modo desconectado.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => checkHeartbeat()}
            disabled={isChecking}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-700 hover:bg-rose-800 text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
            title="Verificar conexión de red"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Comprobando...' : 'Reintentar'}</span>
          </button>
        </div>
      </aside>
    );
  }

  // 3. Caso Gateway Inaccesible (Criterio 2: isServerReachable = false ante 502/503 sostenido)
  return (
    <aside
      role="alert"
      aria-live="assertive"
      className="w-full bg-amber-600 text-white px-4 py-2.5 flex items-center justify-between shadow-lg transition-all duration-300 z-50 text-sm"
    >
      <div className="flex items-center gap-3 max-w-7xl mx-auto w-full justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <FiAlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-200" aria-hidden="true" />
          <div className="truncate">
            <span className="font-bold">
              API Gateway Inaccesible ({gatewayStatus || '502/503'}):{' '}
            </span>
            <span className="text-amber-100">
              Fallo de servidor sostenido ({consecutiveFailures} intento{consecutiveFailures === 1 ? '' : 's'}). Reintentando en segundo plano cada 30 segundos...
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => checkHeartbeat()}
          disabled={isChecking}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-700 hover:bg-amber-800 text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
          title="Forzar ping hacia /api/v1/health"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          <span>{isChecking ? 'Comprobando...' : 'Reintentar'}</span>
        </button>
      </div>
    </aside>
  );
};

export default NetworkStatusBanner;

