import api from './api.js';

/**
 * TAL-188: Utilidades del cliente para el Kill Switch (suspensión de emergencia) del API Gateway.
 */

export const MODO_MANTENIMIENTO_PATH = '/modo-mantenimiento';
export const KILL_SWITCH_POLL_SECONDS = 15;
export const KILL_SWITCH_STORAGE_KEY = 'kill_switch_info';
export const MOTIVO_POR_DEFECTO = 'Sistema en suspensión por mantenimiento de emergencia.';

/**
 * Detecta si un error de Axios corresponde a la suspensión de emergencia:
 * HTTP 503 con cabecera X-Kill-Switch: true (o bandera killSwitch en el cuerpo).
 */
export const isKillSwitchError = (error) => {
  if (error?.response?.status !== 503) return false;
  const header = error.response.headers?.['x-kill-switch'];
  return String(header).toLowerCase() === 'true' || error.response.data?.killSwitch === true;
};

/**
 * Obtiene el motivo exacto enviado por el backend.
 */
export const extraerMotivo = (data) =>
  (typeof data?.motivo === 'string' && data.motivo.trim()) ||
  (typeof data?.mensaje === 'string' && data.mensaje.trim()) ||
  MOTIVO_POR_DEFECTO;

export const guardarInfoKillSwitch = (info) => {
  try {
    sessionStorage.setItem(KILL_SWITCH_STORAGE_KEY, JSON.stringify(info));
  } catch {
    // almacenamiento no disponible
  }
};

export const leerInfoKillSwitch = () => {
  try {
    const raw = sessionStorage.getItem(KILL_SWITCH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const limpiarInfoKillSwitch = () => {
  try {
    sessionStorage.removeItem(KILL_SWITCH_STORAGE_KEY);
  } catch {
    // almacenamiento no disponible
  }
};

/**
 * Consulta el estado del Kill Switch (GET, no bloqueado por el Gateway).
 * Retorna { activo, motivo, servicios_afectados, fecha_activacion }.
 */
export const consultarEstadoKillSwitch = async () => {
  const response = await api.get('/kill-switch/status', { skipRetry: true });
  return response.data;
};
