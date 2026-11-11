import api from './api';

export * from './incidenciasStorage';

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
 * Exporta el historial de incidencias a Excel (.xlsx) o CSV.
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

  let filename = '';
  const disposition = response.headers?.['content-disposition'] || response.headers?.['Content-Disposition'];
  if (disposition && typeof disposition === 'string') {
    const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i);
    if (match && match[1]) {
      filename = decodeURIComponent(match[1].trim());
    }
  }

  if (!filename) {
    const timestamp = new Date().toISOString().slice(0, 10);
    filename = `reporte_incidencias_${timestamp}.${formato}`;
  }

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

  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }, 150);

  return {
    filename,
    totalBytes: blob.size,
  };
};
