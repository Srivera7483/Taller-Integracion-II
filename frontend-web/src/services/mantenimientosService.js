import api from './api';

/**
 * Servicio para gestión y planificación de mantenimientos preventivos.
 * Alineado estrictamente con la tabla MANTENIMIENTOS_PREVENTIVOS del MER y OpenAPI v1.3.0:
 * - id_mantenimiento (uuid)
 * - id_activo (uuid)
 * - fecha_programada (date / ISO 8601)
 * - fecha_creacion (date-time)
 */

/**
 * Agenda un nuevo mantenimiento preventivo en el microservicio de activos a través del API Gateway.
 * @param {Object} payload
 * @param {string} payload.id_activo - UUID del activo a intervenir
 * @param {string} payload.fecha_programada - Fecha en formato ISO 8601 o YYYY-MM-DD (futura)
 */
export const planificarMantenimiento = async (payload) => {
  const body = {
    id_activo: payload.id_activo,
    fecha_programada: payload.fecha_programada,
  };

  try {
    const response = await api.post('/mantenimientos', body);
    return response.data;
  } catch (err) {
    if (err.response?.status === 404) {
      const fallbackResp = await api.post('/mantenimientos/planificar', body);
      return fallbackResp.data;
    }
    throw err;
  }
};

/**
 * Obtiene el listado de activos disponibles para poblar el selector de planificación.
 */
export const fetchActivosParaMantenimiento = async () => {
  const response = await api.get('/activos');
  return response.data?.datos || (Array.isArray(response.data) ? response.data : []);
};

/**
 * Obtiene el listado de mantenimientos registrados con filtros de rango de fechas y activo.
 * @param {Object} [filtros]
 * @param {string} [filtros.startDate] - Fecha de inicio en formato ISO o YYYY-MM-DD
 * @param {string} [filtros.endDate] - Fecha de fin en formato ISO o YYYY-MM-DD
 * @param {string} [filtros.id_activo] - ID opcional del activo
 */
export const fetchMantenimientos = async (filtros = {}) => {
  const params = {};
  if (filtros.startDate) params.startDate = filtros.startDate;
  if (filtros.endDate) params.endDate = filtros.endDate;
  if (filtros.id_activo) params.id_activo = filtros.id_activo;

  const response = await api.get('/mantenimientos', { params });
  return response.data?.datos || (Array.isArray(response.data) ? response.data : []);
};