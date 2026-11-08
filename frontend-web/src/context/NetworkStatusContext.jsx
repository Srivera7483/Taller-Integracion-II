import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const NetworkStatusContext = createContext(null);

export const CONSECUTIVE_FAILURES_THRESHOLD = 2;
export const DEFAULT_HEARTBEAT_INTERVAL = 30000; // 30 segundos

/**
 * Resuelve la URL absoluta o relativa del endpoint de salud del API Gateway.
 */
export const resolveHealthEndpoint = (customEndpoint) => {
  if (customEndpoint) return customEndpoint;
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) {
    return 'http://localhost:3000/api/v1/health';
  }
  const clean = envUrl.replace(/\/+$/, '');
  if (clean.endsWith('/api/v1')) {
    return `${clean}/health`;
  }
  return `${clean}/api/v1/health`;
};

/**
 * Provider global para el monitoreo de conectividad del cliente (online/offline)
 * y alcance real del API Gateway mediante ping ligero periódico (/api/v1/health).
 */
export const NetworkStatusProvider = ({
  children,
  intervalMs = DEFAULT_HEARTBEAT_INTERVAL,
  failureThreshold = CONSECUTIVE_FAILURES_THRESHOLD,
  endpoint,
}) => {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isServerReachable, setIsServerReachable] = useState(true);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [lastHeartbeat, setLastHeartbeat] = useState(null);
  const [gatewayStatus, setGatewayStatus] = useState(200);
  const [isChecking, setIsChecking] = useState(false);

  const failuresRef = useRef(0);
  const isMountedRef = useRef(true);

  /**
   * Realiza un ping ligero HTTP hacia /api/v1/health con timeout de 5 segundos
   * y cache: 'no-store' para evitar respuestas en memoria del navegador.
   */
  const checkHeartbeat = useCallback(async () => {
    // Si el navegador reporta offline, no es necesario hacer ping
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (isMountedRef.current) {
        setIsOnline(false);
        setIsServerReachable(false);
      }
      return false;
    }

    if (isMountedRef.current) {
      setIsChecking(true);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const url = resolveHealthEndpoint(endpoint);
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!isMountedRef.current) return false;

      const status = response.status;
      setGatewayStatus(status);
      setLastHeartbeat(new Date());

      if (response.ok) {
        // Respuesta 2xx exitosa
        failuresRef.current = 0;
        setConsecutiveFailures(0);
        setIsServerReachable(true);
        return true;
      }

      // El servidor respondió con código de error (502 Bad Gateway, 503 Service Unavailable, etc.)
      failuresRef.current += 1;
      const count = failuresRef.current;
      setConsecutiveFailures(count);

      // Criterio de aceptación 2: Si responde con 502/503 de manera sostenida (>= failureThreshold)
      if (count >= failureThreshold) {
        setIsServerReachable(false);
      }

      return false;
    } catch {
      clearTimeout(timeoutId);

      if (!isMountedRef.current) return false;

      setGatewayStatus(0);
      setLastHeartbeat(new Date());

      failuresRef.current += 1;
      const count = failuresRef.current;
      setConsecutiveFailures(count);

      if (count >= failureThreshold) {
        setIsServerReachable(false);
      }

      return false;
    } finally {
      if (isMountedRef.current) {
        setIsChecking(false);
      }
    }
  }, [endpoint, failureThreshold]);

  // Manejo de eventos nativos del navegador 'online' y 'offline'
  useEffect(() => {
    isMountedRef.current = true;

    const handleOnline = () => {
      if (isMountedRef.current) {
        setIsOnline(true);
      }
      // Al recuperar la señal de red, forzar verificación inmediata con el Gateway
      checkHeartbeat();
    };

    const handleOffline = () => {
      if (isMountedRef.current) {
        setIsOnline(false);
        setIsServerReachable(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Integración opcional con errores de Gateway reportados por interceptores HTTP
    const handleGatewayError = (event) => {
      const status = event.detail?.status || 502;
      failuresRef.current += 1;
      const count = failuresRef.current;
      if (isMountedRef.current) {
        setConsecutiveFailures(count);
        setGatewayStatus(status);
        if (count >= failureThreshold) {
          setIsServerReachable(false);
        }
      }
    };

    const handleGatewaySuccess = () => {
      failuresRef.current = 0;
      if (isMountedRef.current) {
        setConsecutiveFailures(0);
        setIsServerReachable(true);
        setGatewayStatus(200);
      }
    };

    window.addEventListener('gateway-error', handleGatewayError);
    window.addEventListener('gateway-success', handleGatewaySuccess);

    // Ping inicial diferido ligeramente para no bloquear la hidratación inicial
    const initialCheckTimer = setTimeout(() => {
      checkHeartbeat();
    }, 100);

    // Heartbeat recurrente cada 30 segundos
    const heartbeatIntervalId = setInterval(() => {
      checkHeartbeat();
    }, intervalMs);

    return () => {
      isMountedRef.current = false;
      clearTimeout(initialCheckTimer);
      clearInterval(heartbeatIntervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('gateway-error', handleGatewayError);
      window.removeEventListener('gateway-success', handleGatewaySuccess);
    };
  }, [checkHeartbeat, failureThreshold, intervalMs]);

  const value = {
    isOnline,
    isServerReachable,
    consecutiveFailures,
    lastHeartbeat,
    gatewayStatus,
    isChecking,
    checkHeartbeat,
  };

  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
    </NetworkStatusContext.Provider>
  );
};

// oxlint-disable-next-line react/only-export-components
export const useNetworkStatus = () => {
  const context = useContext(NetworkStatusContext);
  if (!context) {
    throw new Error('useNetworkStatus debe ser usado dentro de un NetworkStatusProvider');
  }
  return context;
};

export default NetworkStatusContext;

