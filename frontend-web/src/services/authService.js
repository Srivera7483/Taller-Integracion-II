import api from './api';
import axios from 'axios';

/**
 * Servicio de gestión de autenticación, almacenamiento de tokens y control de sesión (TAL-131).
 */

/**
 * Obtiene el access token actual desde localStorage.
 * @returns {string|null}
 */
export const getAccessToken = () => {
  return localStorage.getItem('token');
};

/**
 * Obtiene el refresh token actual si reside en localStorage.
 * @returns {string|null}
 */
export const getRefreshToken = () => {
  return localStorage.getItem('refreshToken');
};

/**
 * Obtiene el usuario autenticado almacenado en la sesión.
 * @returns {Object|null}
 */
export const getUsuarioActual = () => {
  try {
    const usuarioRaw = localStorage.getItem('usuario');
    return usuarioRaw ? JSON.parse(usuarioRaw) : null;
  } catch {
    return null;
  }
};

/**
 * Comprueba si existe una sesión activa válida en el cliente.
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return Boolean(getAccessToken());
};

/**
 * Almacena o actualiza los datos de sesión en localStorage.
 * @param {Object} params
 * @param {string} params.accessToken
 * @param {string} [params.refreshToken]
 * @param {Object} [params.usuario]
 */
export const guardarSesion = ({ accessToken, refreshToken, usuario }) => {
  if (accessToken) {
    localStorage.setItem('token', accessToken);
  }
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
  if (usuario) {
    localStorage.setItem('usuario', JSON.stringify(usuario));
    window.dispatchEvent(new Event('tecnico-cambiado'));
  }
};

/**
 * Limpia el estado de autenticación de forma integral y notifica el cierre de sesión.
 */
export const limpiarSesion = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('usuario');
  window.dispatchEvent(new Event('tecnico-cambiado'));
};

/**
 * Fuerza una solicitud de renovación silenciosa manual al endpoint /autenticacion/renovar-token
 * acordado en el contrato OpenAPI (con fallback a /auth/refresh).
 * @returns {Promise<string>} Nuevo access token obtenido
 */
export const renovarTokenManualmente = async () => {
  const localRefreshToken = getRefreshToken();
  const payload = localRefreshToken ? { refreshToken: localRefreshToken } : {};

  let response;
  try {
    response = await axios.post(
      `${api.defaults.baseURL}/autenticacion/renovar-token`,
      payload,
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (err) {
    if (err.response?.status === 404) {
      response = await axios.post(
        `${api.defaults.baseURL}/auth/refresh`,
        payload,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    } else {
      throw err;
    }
  }

  const data = response.data || {};
  const newAccessToken = data.accessToken || data.token || data.access_token;

  if (!newAccessToken) {
    throw new Error('No se recibió un nuevo access token del servidor');
  }

  localStorage.setItem('token', newAccessToken);
  if (data.refreshToken || data.refresh_token) {
    localStorage.setItem('refreshToken', data.refreshToken || data.refresh_token);
  }

  return newAccessToken;
};

/**
 * Consulta la información del usuario autenticado en el backend
 * usando la ruta en español del contrato OpenAPI /autenticacion/usuario-actual.
 * @returns {Promise<Object>}
 */
export const obtenerUsuarioActualRemoto = async () => {
  try {
    const response = await api.get('/autenticacion/usuario-actual');
    return response.data;
  } catch (err) {
    if (err.response?.status === 404) {
      const legacy = await api.get('/auth/me');
      return legacy.data;
    }
    throw err;
  }
};

/**
 * Cierra la sesión activa en el backend y limpia el almacenamiento del cliente.
 * Notifica al endpoint /autenticacion/cerrar-sesion (o /auth/logout).
 */
export const cerrarSesion = async () => {
  try {
    await api.post('/autenticacion/cerrar-sesion').catch(async (err) => {
      if (err.response?.status === 404) {
        await api.post('/auth/logout').catch(() => {});
      }
    });
  } finally {
    limpiarSesion();
  }
};
