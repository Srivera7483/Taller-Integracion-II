import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import api, { cancelPendingRetries } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  MODO_MANTENIMIENTO_PATH,
  extraerMotivo,
  guardarInfoKillSwitch,
  isKillSwitchError,
} from '../services/killSwitchService';

const AxiosInterceptor = ({ children }) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // TAL-181: Cancelar reintentos en curso si el usuario navega a otra pantalla
    cancelPendingRetries(location.pathname);

    const resInterceptor = api.interceptors.response.use(
      (response) => {
        window.dispatchEvent(new CustomEvent('gateway-success'));
        return response;
      },
      (error) => {
        // TAL-181: Ignorar peticiones canceladas explícitamente (por navegación u orden de usuario)
        if (axios.isCancel(error) || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
          return Promise.reject(error);
        }

        // Ignorar verificaciones de salud y consultas de estado del Kill Switch en segundo plano
        if (error.config?.url?.includes('/health') || error.config?.url?.includes('/kill-switch')) {
          return Promise.reject(error);
        }

        // TAL-188: Kill Switch activo (503 + X-Kill-Switch) -> pantalla global de mantenimiento.
        // No se tocan los borradores locales (localStorage "draft:*").
        if (isKillSwitchError(error)) {
          const info = {
            killSwitch: true,
            motivo: extraerMotivo(error.response.data),
            servicios_afectados: error.response.data?.servicios_afectados || [],
            from: location.pathname === MODO_MANTENIMIENTO_PATH ? '/dashboard' : location.pathname,
          };
          if (location.pathname !== MODO_MANTENIMIENTO_PATH) {
            guardarInfoKillSwitch(info);
            navigate(MODO_MANTENIMIENTO_PATH, { state: info });
          }
          return Promise.reject(error);
        }

        // TAL-180: Notificar al contexto de red ante 502/503 del Gateway
        if (error.response?.status === 502 || error.response?.status === 503) {
          window.dispatchEvent(new CustomEvent('gateway-error', { detail: { status: error.response.status } }));
        }

        // TAL-207: Permitir manejo local controlado en consultas analíticas con fallback sin redirigir a /500
        if (error.config?.skipGlobalErrorHandler) {
          return Promise.reject(error);
        }

        // TAL-169: Si el servidor devuelve error 5xx (500, 502, 503, 504)
        if (error.response && error.response.status >= 500 && error.response.status < 600) {
          const errorMessage =
            error.response.data?.message ||
            error.response.data?.error ||
            'Error interno en los microservicios del sistema';

          showToast(errorMessage, 'error');

          // Redirigir a la página global de Error 500 si no estamos ya en ella
          if (location.pathname !== '/500') {
            navigate('/500', {
              state: {
                status: error.response.status,
                message: errorMessage,
                from: location.pathname,
              },
            });
          }
        } else if (error.response && error.response.status >= 400 && error.response.status < 500) {
          // Errores de cliente (400, 403, 404, etc.)
          let errorMessage =
            error.response.data?.message ||
            error.response.data?.error ||
            'Error en la solicitud al servidor';

          // Si el error proviene de Cloudinary o subida de evidencias
          if (error.config?.url?.includes('cloudinary') || error.config?.url?.includes('/evidencias/upload')) {
            errorMessage = 'Error al subir imagen';
          }

          showToast(errorMessage, 'error');
        } else if (error.request) {
          // TAL-195: Si el dispositivo está offline, no redirigir a /500 para permitir consulta del catálogo local IndexedDB
          const isDeviceOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
          if (isDeviceOffline) {
            return Promise.reject(error);
          }

          // TAL-169: Error de red o servidor completamente apagado (ECONNREFUSED / Bad Gateway)
          let errorMessage = 'Error de red: No se pudo contactar al servidor API Gateway';

          if (error.config?.url?.includes('cloudinary') || error.config?.url?.includes('/evidencias/upload')) {
            errorMessage = 'Error al subir imagen';
          }

          showToast(errorMessage, 'error');

          if (location.pathname !== '/500' && location.pathname !== '/login') {
            navigate('/500', {
              state: {
                status: 503,
                message: 'No se pudo establecer conexión con el API Gateway o los microservicios. Verifica que los servicios estén activos.',
                from: location.pathname,
              },
            });
          }
        } else {
          showToast('Ocurrió un error inesperado', 'error');
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(resInterceptor);
    };
  }, [showToast, navigate, location.pathname]);

  return children;
};

export default AxiosInterceptor;
