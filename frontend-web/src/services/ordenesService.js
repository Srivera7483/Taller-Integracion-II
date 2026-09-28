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
 * @returns {Promise<{ ok: boolean, status: number, data: any, endpoint: string }>}
 */
export async function crearOrdenTrabajoApi({ incidencia_id, tecnico_id, instrucciones }) {
  const endpoint = getAsignarOrdenEndpoint();

  const payload = {
    incidencia_id: String(incidencia_id).trim(),
    tecnico_id: String(tecnico_id).trim(),
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
