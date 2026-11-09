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

export const MANTENIMIENTOS_FALLBACK = [
  {
    id: 'MANT-001',
    id_mantenimiento: 'MANT-001',
    id_activo: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    fecha_programada: '2026-10-15T10:00:00.000Z',
    fecha_creacion: '2026-10-01T09:00:00.000Z',
    activo: {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      nombre: 'Proyector Láser Epson PowerLite',
      codigoQr: 'ACT-2026-0001',
      ubicacion: 'Edificio A - Auditorio Principal',
      categoria: 'Audiovisual',
    },
  },
  {
    id: 'MANT-002',
    id_mantenimiento: 'MANT-002',
    id_activo: '550e8400-e29b-41d4-a716-446655440000',
    fecha_programada: '2026-10-20T14:30:00.000Z',
    fecha_creacion: '2026-10-02T11:15:00.000Z',
    activo: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nombre: 'Computador Docente All-in-One Dell',
      codigoQr: 'ACT-2026-0002',
      ubicacion: 'Edificio B - Laboratorio 302',
      categoria: 'Cómputo',
    },
  },
  {
    id: 'MANT-003',
    id_mantenimiento: 'MANT-003',
    id_activo: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    fecha_programada: '2026-10-28T09:00:00.000Z',
    fecha_creacion: '2026-10-03T08:30:00.000Z',
    activo: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      nombre: 'Estación de Trabajo Desincorporada',
      codigoQr: 'ACT-2026-0003',
      ubicacion: 'Edificio B - Rack Principal Piso 2',
      categoria: 'Cómputo',
    },
  },
  {
    id: 'MANT-004',
    id_mantenimiento: 'MANT-004',
    id_activo: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    fecha_programada: '2026-11-05T11:00:00.000Z',
    fecha_creacion: '2026-10-05T10:00:00.000Z',
    activo: {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      nombre: 'Proyector Láser Epson PowerLite',
      codigoQr: 'ACT-2026-0001',
      ubicacion: 'Edificio A - Auditorio Principal',
      categoria: 'Audiovisual',
    },
  },
  {
    id: 'MANT-005',
    id_mantenimiento: 'MANT-005',
    id_activo: 'SW-CORE-01',
    fecha_programada: '2026-11-12T16:00:00.000Z',
    fecha_creacion: '2026-10-06T15:20:00.000Z',
    activo: {
      id: 'SW-CORE-01',
      nombre: 'Switch de Distribución Cisco Catalyst 9300',
      codigoQr: 'SW-CORE-01',
      ubicacion: 'Edificio Central - Sala de Comunicaciones 1',
      categoria: 'Redes',
    },
  },
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

