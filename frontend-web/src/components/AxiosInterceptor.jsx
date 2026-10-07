import { useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const AxiosInterceptor = ({ children }) => {
  const { showToast } = useToast();

  useEffect(() => {
    const resInterceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Al detectar cualquier código 4xx o 5xx
        if (error.response && error.response.status >= 400 && error.response.status < 600) {
          // Extrae el mensaje de error del JSON estándar devuelto por el backend
          let errorMessage = error.response.data?.message || error.response.data?.error || 'Error en la solicitud al servidor';
          
          // Si el error proviene de Cloudinary o del nuevo endpoint de evidencias local (TAL-14)
          if (error.config?.url?.includes('cloudinary') || error.config?.url?.includes('/evidencias/upload')) {
            errorMessage = 'Error al subir imagen';
          }
          
          // No mostramos el toast global si es 401 en login, porque en Login ya se maneja (o podríamos dejar que el global lo haga)
          // El requerimiento dice: "Al detectar cualquier código 4xx o 5xx... dispara automáticamente el componente Toast variante error."
          showToast(errorMessage, 'error');
        } else if (error.request) {
          let errorMessage = 'Error de red: No se pudo contactar al servidor';
          
          // Si falla la conexión directamente durante la subida (ej. se corta el internet local)
          if (error.config?.url?.includes('cloudinary') || error.config?.url?.includes('/evidencias/upload')) {
            errorMessage = 'Error al subir imagen';
          }
          
          showToast(errorMessage, 'error');
        } else {
          showToast('Ocurrió un error inesperado', 'error');
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(resInterceptor);
    };
  }, [showToast]);

  return children;
};

export default AxiosInterceptor;
