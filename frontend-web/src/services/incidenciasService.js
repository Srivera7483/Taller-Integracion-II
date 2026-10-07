import api from './api';

/**
 * Obtiene el listado de incidencias reales desde el backend.
 * Utiliza paginación por defecto si no se especifican parámetros.
 */
export const fetchIncidencias = async (params = {}) => {
  try {
    const response = await api.get('/incidencias', { params });
    // Soporte para respuestas paginadas (ej. response.data.data) o arrays directos
    return response.data.data || response.data || [];
  } catch (error) {
    console.error('[incidenciasService] Error al obtener incidencias:', error);
    throw error;
  }
};

/**
 * Obtiene el listado de las incidencias más recientes (las últimas 5)
 */
export const fetchIncidenciasRecientes = async () => {
  try {
    // Parámetros para forzar límite en 5
    const response = await api.get('/incidencias', { params: { limit: 5, sort: 'desc' } });
    const data = response.data.data || response.data || [];
    return data;
  } catch (error) {
    console.error('[incidenciasService] Error al obtener incidencias recientes:', error);
    return [];
  }
};
