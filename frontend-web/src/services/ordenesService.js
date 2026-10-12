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
    'http://localhost:3000/api/v1';
  return envUrl.replace(/\/+$/, '');
};

/**
 * Construye la URL completa del endpoint de asignación de órdenes en el API Gateway.
 * Ruta esperada en API Gateway: /api/v1/ordenes-trabajo/asignar
 */
export const getAsignarOrdenEndpoint = () => {
  const baseUrl = getApiGatewayBaseUrl();
  if (baseUrl.endsWith('/v1')) {
    return `${baseUrl}/ordenes-trabajo/asignar`;
  }
  if (baseUrl.endsWith('/api')) {
    return `${baseUrl}/v1/ordenes-trabajo/asignar`;
  }
  return `${baseUrl}/api/v1/ordenes-trabajo/asignar`;
};

/**
 * Consume de forma asíncrona el endpoint de creación/asignación de órdenes en el API Gateway.
 *
 * @param {Object} params
 * @param {string} [params.id_incidencia] - Identificador único de la incidencia (UUID)
 * @param {string} [params.incidencia_id] - Fallback de ID de incidencia
 * @param {string} [params.id_tecnico] - Identificador del técnico seleccionado (UUID)
 * @param {string} [params.tecnico_id] - Fallback de ID del técnico
 * @param {string} [params.diagnostico_tecnico] - Diagnóstico o instrucciones técnicas
 * @param {string} [params.instrucciones] - Fallback de instrucciones del supervisor
 * @returns {Promise<{ ok: boolean, status: number, data: any, endpoint: string }>}
 */
export async function crearOrdenTrabajoApi(params = {}) {
  const endpoint = getAsignarOrdenEndpoint();

  const idIncidencia = String(params.id_incidencia || params.incidencia_id || '').trim();
  const idTecnico = String(params.id_tecnico || params.tecnico_id || '').trim();
  const diagnostico = typeof params.diagnostico_tecnico === 'string'
    ? params.diagnostico_tecnico.trim()
    : (typeof params.instrucciones === 'string' ? params.instrucciones.trim() : '');

  const payload = {
    id_incidencia: idIncidencia,
    id_tecnico: idTecnico,
    diagnostico_tecnico: diagnostico,
    // Compatibilidad retroactiva para vistas anteriores:
    incidencia_id: idIncidencia,
    tecnico_id: idTecnico,
    instrucciones: diagnostico,
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
