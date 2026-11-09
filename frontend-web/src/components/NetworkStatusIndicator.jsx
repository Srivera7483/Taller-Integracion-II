import React from 'react';
import { useNetworkStatus } from '../context/NetworkStatusContext';

/**
 * Indicador visual compacto para la barra superior (Header)
 * que refleja el estado de red del cliente y del API Gateway.
 */
const NetworkStatusIndicator = () => {
  const { isOnline, isServerReachable, gatewayStatus } = useNetworkStatus();

  if (!isOnline) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300"
        title="Dispositivo sin conexión a Internet"
      >
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
        <span className="hidden sm:inline">Desconectado</span>
      </div>
    );
  }

  if (!isServerReachable) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300"
        title={`Gateway inaccesible (${gatewayStatus || '502/503'})`}
      >
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="hidden sm:inline">Gateway {gatewayStatus || '502'}</span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
      title="Conectado y sincronizado con API Gateway"
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      <span className="hidden sm:inline">En línea</span>
    </div>
  );
};

export default NetworkStatusIndicator;

