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
  try {
    const response = await api.get('/activos');
    const data = response.data?.datos || (Array.isArray(response.data) ? response.data : []);
    return data;
  } catch {
    return [];
  }
};

const crearItemMantenimiento = (id, id_activo, fecha_programada, fecha_creacion, nombre, codigoQr, ubicacion, categoria) => ({
  id,
  id_mantenimiento: id,
  id_activo,
  fecha_programada,
  fecha_creacion,
  activo: { id: id_activo, nombre, codigoQr, ubicacion, categoria },
});

export const MANTENIMIENTOS_FALLBACK = [
  crearItemMantenimiento('MANT-001', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-10-15T10:00:00.000Z', '2026-10-01T09:00:00.000Z', 'Proyector Láser Epson PowerLite', 'ACT-2026-0001', 'Edificio A - Auditorio Principal', 'Audiovisual'),
  crearItemMantenimiento('MANT-002', '550e8400-e29b-41d4-a716-446655440000', '2026-10-20T14:30:00.000Z', '2026-10-02T11:15:00.000Z', 'Computador Docente All-in-One Dell', 'ACT-2026-0002', 'Edificio B - Laboratorio 302', 'Cómputo'),
  crearItemMantenimiento('MANT-003', '3fa85f64-5717-4562-b3fc-2c963f66afa6', '2026-10-28T09:00:00.000Z', '2026-10-03T08:30:00.000Z', 'Estación de Trabajo Desincorporada', 'ACT-2026-0003', 'Edificio B - Rack Principal Piso 2', 'Cómputo'),
  crearItemMantenimiento('MANT-004', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-11-05T11:00:00.000Z', '2026-10-05T10:00:00.000Z', 'Proyector Láser Epson PowerLite', 'ACT-2026-0001', 'Edificio A - Auditorio Principal', 'Audiovisual'),
  crearItemMantenimiento('MANT-005', 'SW-CORE-01', '2026-11-12T16:00:00.000Z', '2026-10-06T15:20:00.000Z', 'Switch de Distribución Cisco Catalyst 9300', 'SW-CORE-01', 'Edificio Central - Sala de Comunicaciones 1', 'Redes'),
];

/**
 * Obtiene el listado de mantenimientos registrados con filtros de rango de fechas y activo.
 * @param {Object} [filtros]
 * @param {string} [filtros.startDate] - Fecha de inicio en formato ISO o YYYY-MM-DD
 * @param {string} [filtros.endDate] - Fecha de fin en formato ISO o YYYY-MM-DD
 * @param {string} [filtros.id_activo] - ID opcional del activo
 */
export const fetchMantenimientos = async (filtros = {}) => {
  try {
    const params = {};
    if (filtros.startDate) params.startDate = filtros.startDate;
    if (filtros.endDate) params.endDate = filtros.endDate;
    if (filtros.id_activo) params.id_activo = filtros.id_activo;

    const response = await api.get('/mantenimientos', { params });
    const data = response.data?.datos || (Array.isArray(response.data) ? response.data : []);
    return data;
  } catch {
    // Fallback estructurado a datos locales en memoria
    let data = [...MANTENIMIENTOS_FALLBACK];
    if (filtros.startDate) {
      const inicio = new Date(filtros.startDate);
      if (filtros.startDate.length === 10) inicio.setUTCHours(0, 0, 0, 0);
      data = data.filter((m) => new Date(m.fecha_programada) >= inicio);
    }
    if (filtros.endDate) {
      const fin = new Date(filtros.endDate);
      if (filtros.endDate.length === 10) fin.setUTCHours(23, 59, 59, 999);
      data = data.filter((m) => new Date(m.fecha_programada) <= fin);
    }
    if (filtros.id_activo) {
      data = data.filter((m) => m.id_activo === filtros.id_activo);
    }
    return data;
  }
};

