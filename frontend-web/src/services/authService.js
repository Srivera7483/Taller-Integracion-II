import api from './api';
import axios from 'axios';

/**
 * Servicio de gestión de autenticación, almacenamiento de tokens y control de sesión.
 * Cumple estrictamente con la especificación OpenAPI v1.2.0 (SCGI API).
 */

const notifySessionChange = () => {
  window.dispatchEvent(new Event('tecnico-cambiado'));
};

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
  return (
    localStorage.getItem('refreshToken') ||
    localStorage.getItem('refresh_token')
  );
};

/**
 * Obtiene el usuario autenticado almacenado en la sesión.
 * @returns {Object|null}
 */
export const getUsuarioActual = () => {
  try {
    const usuarioRaw = localStorage.getItem('usuario');
    if (!usuarioRaw) return null;
    const parsed = JSON.parse(usuarioRaw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const decodeTokenPayload = (token) => {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const encodedPayload = parts[1];
    return JSON.parse(
      window.atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')),
    );
  } catch {
    return null;
  }
};

const isTokenValid = (token) => {
  const payload = decodeTokenPayload(token);
  if (!payload || typeof payload !== 'object') return false;
  if (payload.tokenUse === 'refresh') return false;
  if (typeof payload.exp === 'number') {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowInSeconds) return false;
  }
  return Boolean(payload.sub || payload.userId);
};

const hasValidUsuarioProfile = (usuario) => {
  if (!usuario || typeof usuario !== 'object') return false;
  return Boolean(
    usuario.id ||
      usuario.id_usuario ||
      usuario.sub ||
      usuario.correo ||
      usuario.email ||
      usuario.nombre,
  );
};

export const getPermissions = () => {
  const usuario = getUsuarioActual();
  const responsePermissions = Array.isArray(usuario?.permissions)
    ? usuario.permissions
    : [];
  if (responsePermissions.length > 0) return responsePermissions;

  const tokenPermissions = decodeTokenPayload(getAccessToken())?.permissions;
  return Array.isArray(tokenPermissions) ? tokenPermissions : [];
};

export const hasPermission = (permission) => {
  return Array.isArray(permission)
    ? permission.some((required) => getPermissions().includes(required))
    : getPermissions().includes(permission);
};

export const hasAllPermissions = (permissions) =>
  Array.isArray(permissions) &&
  permissions.every((permission) => getPermissions().includes(permission));

/**
 * Limpia el estado de autenticación de forma integral y notifica el cierre de sesión.
 */
export const limpiarSesion = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('usuario');
  notifySessionChange();
};

/**
 * Comprueba si existe una sesión activa válida en el cliente.
 * Evita sesiones fantasma verificando integridad/expiración del JWT y perfil de usuario.
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  const token = getAccessToken();
  const usuario = getUsuarioActual();

  if (!token || !isTokenValid(token) || !hasValidUsuarioProfile(usuario)) {
    if (token || usuario) {
      limpiarSesion();
    }
    return false;
  }

  return true;
};

/**
 * Almacena o actualiza los datos de sesión en localStorage de forma consistente.
 * @param {Object} params
 * @param {string} params.accessToken
 * @param {string} [params.refreshToken]
 * @param {Object} [params.usuario]
 */
export const guardarSesion = ({ accessToken, refreshToken, usuario }) => {
  if (!accessToken || !isTokenValid(accessToken)) {
    limpiarSesion();
    return;
  }

  const payload = decodeTokenPayload(accessToken) || {};
  const existingUsuario = getUsuarioActual();
  const baseUsuario = hasValidUsuarioProfile(usuario)
    ? usuario
    : hasValidUsuarioProfile(existingUsuario)
      ? existingUsuario
      : payload.correo || payload.email || payload.nombre
        ? {
            id: payload.sub || payload.userId,
            nombre: payload.nombre || payload.name,
            correo: payload.correo || payload.email,
            rol: payload.rol || payload.role,
          }
        : null;

  if (!hasValidUsuarioProfile(baseUsuario)) {
    limpiarSesion();
    throw new Error(
      'Respuesta de autenticación incompleta: falta perfil de usuario válido.',
    );
  }

  const permissions = Array.isArray(baseUsuario.permissions)
    ? baseUsuario.permissions
    : Array.isArray(payload.permissions)
      ? payload.permissions
      : [];

  localStorage.setItem('token', accessToken);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.removeItem('refresh_token');
  }

  localStorage.setItem(
    'usuario',
    JSON.stringify({
      ...baseUsuario,
      permissions,
    }),
  );

  notifySessionChange();
};

/**
 * Inicia sesión en la plataforma utilizando las credenciales acordadas en el contrato OpenAPI.
 * Endpoint principal: POST /autenticacion/inicio-sesion (con fallback a /auth/login).
 *
 * @param {Object} credenciales
 * @param {string} credenciales.correo Correo electrónico del usuario
 * @param {string} credenciales.contrasena Contraseña del usuario
 * @returns {Promise<Object>} Datos devueltos por el servidor (token y usuario)
 */
export const iniciarSesion = async ({ correo, contrasena }) => {
  let response;
  try {
    response = await api.post('/autenticacion/inicio-sesion', {
      correo,
      contrasena,
    });
  } catch (err) {
    if (err.response?.status === 404) {
      response = await api.post('/auth/login', {
        email: correo,
        password: contrasena,
      });
    } else {
      throw err;
    }
  }

  const data = response.data || {};
  const token = data.token || data.accessToken || data.access_token;
  const usuario = data.usuario || data.user;

  if (!token) {
    throw new Error('No se recibió un token de acceso válido del servidor');
  }

  guardarSesion({
    accessToken: token,
    refreshToken: data.refreshToken || data.refresh_token,
    usuario,
  });

  return data;
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

  const usuario = getUsuarioActual();
  const decoded = decodeTokenPayload(newAccessToken) || {};
  const permissions = Array.isArray(data.permissions)
    ? data.permissions
    : Array.isArray(decoded.permissions)
      ? decoded.permissions
      : [];

  guardarSesion({
    accessToken: newAccessToken,
    refreshToken: data.refreshToken || data.refresh_token || localRefreshToken,
    usuario: usuario ? { ...usuario, permissions } : data.usuario || data.user,
  });

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

/**
 * Registra un nuevo usuario en el sistema.
 * @param {Object} datosUsuario - Datos del usuario a registrar
 * @returns {Promise<Object>} Respuesta del servidor
 */
export const registrarUsuario = async (datosUsuario) => {
  try {
    const response = await api.post('/auth/register', datosUsuario);
    return response.data;
  } catch (err) {
    if (err.response?.status === 404) {
      const responseFallback = await api.post(
        '/autenticacion/registro',
        datosUsuario,
      );
      return responseFallback.data;
    }
    throw err;
  }
};