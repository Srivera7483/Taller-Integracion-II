import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const AxiosInterceptor = ({ children }) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const resInterceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
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
