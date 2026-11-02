import api from './api';

/**
 * Obtiene el listado de incidencias reales desde el backend.
 * Utiliza paginación por defecto si no se especifican parámetros.
 */
export const fetchIncidencias = async (params = {}) => {
  const response = await api.get('/incidencias', { params });
  return response.data.data || response.data || [];
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
  } catch {
    return [];
  }
};

/**
 * Crea una nueva incidencia en el backend a través del API Gateway.
 */
export const createIncidencia = async (payload) => {
  const response = await api.post('/incidencias', payload);
  return response.data;
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

  // Fallback si no viene el header
  if (!filename) {
    const timestamp = new Date().toISOString().slice(0, 10);
    filename = `reporte_incidencias_${timestamp}.${formato}`;
  }

  // Crear Blob y disparar la descarga por el navegador
  const blob = new Blob([response.data], {
    type:
      formato === 'csv'
        ? 'text/csv;charset=utf-8;'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

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
};


