/**
 * Servicio para la gestión y creación de órdenes de trabajo a través del API Gateway.
 */

/**
 * Obtiene la URL base configurada para el API Gateway.
 * Prioriza VITE_API_GATEWAY_URL o VITE_API_URL, con fallback al puerto 3000.
 */
export const getApiGatewayBaseUrl = () => {
  const envUrl =
    import.meta.env.VITE_API_GATEWAY_URL ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:3000/api';
  return envUrl.replace(/\/+$/, '');
};

/**
 * Construye la URL completa del endpoint de asignación de órdenes en el API Gateway.
 * Ruta esperada: /api/incidencias/ordenes-trabajo/asignar
 */
export const getAsignarOrdenEndpoint = () => {
  const baseUrl = getApiGatewayBaseUrl();
  if (baseUrl.endsWith('/api')) {
    return `${baseUrl}/incidencias/ordenes-trabajo/asignar`;
  }
  return `${baseUrl}/api/incidencias/ordenes-trabajo/asignar`;
};

/**
 * Consume de forma asíncrona el endpoint de creación/asignación de órdenes en el API Gateway.
 *
 * @param {Object} params
 * @param {string} params.incidencia_id - Identificador único de la incidencia
 * @param {string} params.tecnico_id - Identificador del técnico seleccionado
 * @param {string} [params.instrucciones] - Instrucciones u observaciones del supervisor
 * @param {string} [params.prioridad='Media'] - Nivel de prioridad asignado (Alta, Media, Baja)
 * @returns {Promise<{ ok: boolean, status: number, data: any, endpoint: string }>}
 */
export async function crearOrdenTrabajoApi({ incidencia_id, tecnico_id, instrucciones, prioridad = 'Media' }) {
  const endpoint = getAsignarOrdenEndpoint();

  const payload = {
    incidencia_id: String(incidencia_id).trim(),
    tecnico_id: String(tecnico_id).trim(),
    prioridad: typeof prioridad === 'string' ? prioridad.trim() : 'Media',
    instrucciones: typeof instrucciones === 'string' ? instrucciones.trim() : '',
  };


  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Respuesta sin cuerpo JSON
  }

  return {
    ok: response.status === 200 || response.status === 201,
    status: response.status,
    data,
    endpoint,
  };
}

/**
 * Construye la URL completa del endpoint para consultar órdenes de trabajo en el API Gateway.
 * Ruta esperada en ms-incidencias: /api/incidencias/ordenes-trabajo
 */
export const getOrdenesTrabajoEndpoint = () => {
  const baseUrl = getApiGatewayBaseUrl();
  if (baseUrl.endsWith('/api')) {
    return `${baseUrl}/incidencias/ordenes-trabajo`;
  }
  return `${baseUrl}/api/incidencias/ordenes-trabajo`;
};

/**
 * Dataset simulado de Órdenes de Trabajo conforme al esquema Prisma de ORDENES_TRABAJO.
 * Permite maquetar y probar de inmediato los indicadores de prioridad en la UI.
 */
export const MOCK_ORDENES_TRABAJO = [
  {
    id_orden: 'ORD-2026-001',
    incidencia_id: 'INC-1042',
    incidencia_titulo: 'Caída de enlace y switch de distribución',
    id_activo: 'SW-CORE-01',
    tecnico_id: 'tec-01',
    tecnico_nombre: 'Carlos Ruiz',
    estado: 'EnProceso',
    prioridad: 'Alta',
    instrucciones: 'Revisar inmediatamente el puerto de fibra óptica principal.',
    fecha_asignacion: '2026-09-27T10:30:00.000Z',
    fecha_inicio: '2026-09-27T10:45:00.000Z',
    fecha_termino: null,
  },
  {
    id_orden: 'ORD-2026-002',
    incidencia_id: 'INC-1041',
    incidencia_titulo: 'Mantenimiento de servidor de base de datos',
    id_activo: 'SRV-DB-02',
    tecnico_id: 'tec-02',
    tecnico_nombre: 'Ana Gómez',
    estado: 'Pendiente',
    prioridad: 'Media',
    instrucciones: 'Aplicar actualización de paquetes y verificar replicación.',
    fecha_asignacion: '2026-09-27T08:15:00.000Z',
    fecha_inicio: null,
    fecha_termino: null,
  },
  {
    id_orden: 'ORD-2026-003',
    incidencia_id: 'INC-1039',
    incidencia_titulo: 'Reemplazo programado de tóner y rodillo',
    id_activo: 'PRN-OFFICE-04',
    tecnico_id: 'tec-04',
    tecnico_nombre: 'Valentina Morales',
    estado: 'Pendiente',
    prioridad: 'Baja',
    instrucciones: 'Realizar calibración y limpieza de cabezal.',
    fecha_asignacion: '2026-09-26T16:00:00.000Z',
    fecha_inicio: null,
    fecha_termino: null,
  },
  {
    id_orden: 'ORD-2026-004',
    incidencia_id: 'INC-1038',
    incidencia_titulo: 'Falla crítica de UPS en sala de servidores',
    id_activo: 'UPS-APC-5000',
    tecnico_id: 'tec-03',
    tecnico_nombre: 'Matías Silva',
    estado: 'EnProceso',
    prioridad: 'Alta',
    instrucciones: 'Alerta de sobrecalentamiento en baterías del rack central.',
    fecha_asignacion: '2026-09-27T11:00:00.000Z',
    fecha_inicio: '2026-09-27T11:10:00.000Z',
    fecha_termino: null,
  },
];

/**
 * Función preparada para listar órdenes de trabajo desde el backend (ORDENES_TRABAJO).
 * Cuenta con fallback automático al dataset mock para permitir desarrollo y pruebas de UI
 * sin bloquearse si el backend o API Gateway están offline.
 *
 * @param {Object} [options]
 * @param {boolean} [options.usarMock=false] - Forzar uso de datos mockeados
 * @returns {Promise<{ ok: boolean, data: Array<Object>, origen: 'api' | 'mock' }>}
 */
export async function obtenerOrdenesTrabajoApi({ usarMock = false } = {}) {
  if (usarMock) {
    return { ok: true, data: MOCK_ORDENES_TRABAJO, origen: 'mock' };
  }

  const endpoint = getOrdenesTrabajoEndpoint();
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const response = await fetch(endpoint, { method: 'GET', headers });
    if (response.ok) {
      const data = await response.json();
      return { ok: true, data, origen: 'api' };
    }
  } catch (error) {
    console.warn('[ordenesService] No fue posible conectar con el backend; utilizando dataset preparado:', error);
  }

  // Fallback con datos preparados si el backend no responde
  return { ok: false, data: MOCK_ORDENES_TRABAJO, origen: 'mock' };
}

/**
 * Evalúa y extrae el nivel de prioridad de una entidad u orden de trabajo.
 * Soporta de forma resiliente tanto la entidad ORDENES_TRABAJO directa como
 * una relación de incidencia con su orden vinculada.
 *
 * @param {Object} item - Objeto orden de trabajo o incidencia
 * @returns {'Alta' | 'Media' | 'Baja' | 'No Asignada'}
 */
export function evaluarPrioridadOrden(item) {
  if (!item) return 'No Asignada';

  // 1. Campo directo de la entidad ORDENES_TRABAJO
  if (item.prioridad) {
    const p = String(item.prioridad).trim().toLowerCase();
    if (p === 'alta' || p === 'critica' || p === 'crítica') return 'Alta';
    if (p === 'media') return 'Media';
    if (p === 'baja') return 'Baja';
  }

  // 2. Relación inversa o anidada (Prisma: incidencia.ordenes_trabajo[0] o incidencia.orden_trabajo)
  const ordenAnidada = item.orden_trabajo || (Array.isArray(item.ordenes_trabajo) && item.ordenes_trabajo[0]);
  if (ordenAnidada && ordenAnidada.prioridad) {
    const p = String(ordenAnidada.prioridad).trim().toLowerCase();
    if (p === 'alta' || p === 'critica' || p === 'crítica') return 'Alta';
    if (p === 'media') return 'Media';
    if (p === 'baja') return 'Baja';
  }

  return 'No Asignada';
}

