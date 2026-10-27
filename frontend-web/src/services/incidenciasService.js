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

/**
 * Crea una nueva incidencia en el backend a través del API Gateway.
 */
export const createIncidencia = async (payload) => {
  try {
    const response = await api.post('/incidencias', payload);
    return response.data;
  } catch (error) {
    console.error('[incidenciasService] Error al crear incidencia:', error);
    throw error;
  }
};

/**
 * TAL-132: Exporta el historial de incidencias a Excel (.xlsx) o CSV.
 * Solicita los datos binarios en modo blob al backend (TAL-115 / TAL-117)
 * y fuerza la descarga en el navegador mediante window.URL.createObjectURL y <a> temporal.
 * 
 * @param {Object} [filtros={}] - Filtros opcionales para la exportación
 * @param {'xlsx'|'excel'|'csv'} [filtros.formato='xlsx'] - Formato de archivo deseado
 * @param {string} [filtros.id_activo] - Filtrar por UUID de activo
 * @param {number} [filtros.id_estado] - Filtrar por ID de estado
 * @param {string} [filtros.fecha_inicio] - Filtrar desde fecha (ISO)
 * @param {string} [filtros.fecha_fin] - Filtrar hasta fecha (ISO)
 * @returns {Promise<{ filename: string, totalBytes: number }>}
 */
export const exportarReporteIncidencias = async ({
  formato = 'xlsx',
  id_activo,
  id_estado,
  fecha_inicio,
  fecha_fin,
} = {}) => {
  try {
    const params = { formato };
    if (id_activo) params.id_activo = id_activo;
    if (id_estado !== undefined && id_estado !== null && id_estado !== '') {
      params.id_estado = id_estado;
    }
    if (fecha_inicio) params.fecha_inicio = fecha_inicio;
    if (fecha_fin) params.fecha_fin = fecha_fin;

    const response = await api.get('/incidencias/exportar', {
      params,
      responseType: 'blob',
    });

    // Intentar extraer el nombre del archivo desde el header Content-Disposition
    let filename = '';
    const disposition = response.headers?.['content-disposition'] || response.headers?.['Content-Disposition'];
    if (disposition && typeof disposition === 'string') {
      const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1].trim());
      }
    }

    // Nombre dinámico de fallback si el encabezado no está presente
    if (!filename) {
      const ahora = new Date();
      const pad = (n) => n.toString().padStart(2, '0');
      const dia = pad(ahora.getDate());
      const mes = pad(ahora.getMonth() + 1);
      const anio = ahora.getFullYear();
      const extension = formato === 'csv' ? 'csv' : 'xlsx';
      filename = `Reporte_Incidencias_${dia}-${mes}-${anio}.${extension}`;
    }

    const mimeType = formato === 'csv'
      ? 'text/csv;charset=utf-8;'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const blob = new Blob([response.data], { type: mimeType });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Limpieza de memoria y DOM
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    }, 150);

    return {
      filename,
      totalBytes: blob.size,
    };
  } catch (error) {
    console.error('[incidenciasService] Error al exportar reporte de incidencias:', error);
    throw error;
  }
};


