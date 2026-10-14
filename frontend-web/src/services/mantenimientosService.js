import api from './api';

/**
 * Servicio para gestión y planificación de mantenimientos preventivos (TAL-7 / TAL-12)
 */

/**
 * Agenda un nuevo mantenimiento preventivo en el microservicio de activos a través del API Gateway.
 * @param {Object} payload
 * @param {string} payload.id_activo - UUID del activo a intervenir
 * @param {string} payload.fecha_programada - Fecha en formato ISO 8601 (futura)
 * @param {string} payload.descripcion - Detalle técnico del trabajo
 * @param {string} payload.tipo - Tipo de mantenimiento (ej. 'Preventivo', 'Calibración')
 * @param {string} [payload.estado] - Estado inicial (por defecto 'Pendiente')
 */
export const planificarMantenimiento = async (payload) => {
  try {
    const response = await api.post('/mantenimientos/planificar', payload);
    return response.data;
  } catch (error) {
    console.error('[mantenimientosService] Error al planificar mantenimiento:', error);
    throw error;
  }
};

/**
 * Obtiene el listado de activos disponibles para poblar el selector de planificación.
 */
export const fetchActivosParaMantenimiento = async () => {
  try {
    const response = await api.get('/activos');
    const data = response.data?.datos || (Array.isArray(response.data) ? response.data : []);
    return data;
  } catch (error) {
    console.error('[mantenimientosService] Error al obtener catálogo de activos:', error);
    return [];
  }
};
