import axios from 'axios';

/**
 * Instancia global de Axios configurada con soporte de credenciales (cookies HttpOnly)
 * y cola de reintentos concurrentes para renovación silenciosa de tokens (TAL-131).
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Variables para gestión de concurrencia y cola de reintentos
let isRefreshing = false;
let failedQueue = [];

/**
 * Resuelve o rechaza las peticiones que quedaron pausadas durante el refresh del token.
 * @param {Error|null} error - Error si el refresh falló, null si fue exitoso
 * @param {string|null} token - Nuevo Access Token para inyectar en las peticiones encoladas
 */
const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Interceptor de Solicitud:
 * Inyecta el Access Token actual en la cabecera Authorization Bearer si existe en el almacenamiento.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * Interceptor de Respuesta (TAL-131):
 * Detecta respuestas HTTP 401 Unauthorized en peticiones protegidas y ejecuta la renovación
 * silenciosa (Silent Refresh) comunicándose con el endpoint /auth/refresh.
 *
 * Criterios de Aceptación:
 * 1. El usuario no es expulsado si el refresh token es válido (reintento silencioso transparente).
 * 2. Si el refresh token caduca o es inválido, se limpia el almacenamiento y se redirige a /login.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Endpoints de autenticación donde un 401 es una respuesta válida de credenciales incorrectas
    const isAuthEndpoint = /\/auth\/(login|register|refresh)(?:\?|$)/i.test(
      originalRequest?.url || '',
    );

    // Si no es un error 401, o no hay configuración original, o ya fue reintentada, o es auth:
    if (
      !error.response ||
      error.response.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint
    ) {
      return Promise.reject(error);
    }

    // Si ya hay un proceso de refresh en curso, encolamos esta petición para evitar llamadas simultáneas
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newAccessToken) => {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Como el refresh token puede residir en una cookie HttpOnly (withCredentials: true)
      // o en localStorage (en caso de clientes móviles o entornos sin soporte de cookies cross-site),
      // enviamos ambos canales de forma retrocompatible.
      const localRefreshToken = localStorage.getItem('refreshToken');
      const payload = localRefreshToken ? { refreshToken: localRefreshToken } : {};

      // Usamos axios base sin interceptores para evitar bucles si /auth/refresh respondiera 401
      const refreshResponse = await axios.post(
        `${api.defaults.baseURL}/auth/refresh`,
        payload,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const data = refreshResponse.data || {};
      const newAccessToken =
        data.accessToken || data.token || data.access_token;

      if (!newAccessToken) {
        throw new Error('El endpoint de refresh no retornó un access token válido.');
      }

      // 1. Guardar el nuevo access token renovado
      localStorage.setItem('token', newAccessToken);

      // Si el backend rota y devuelve un nuevo refresh token en el body, lo actualizamos
      if (data.refreshToken || data.refresh_token) {
        localStorage.setItem(
          'refreshToken',
          data.refreshToken || data.refresh_token,
        );
      }

      // Notificar a la aplicación que el token fue renovado exitosamente
      window.dispatchEvent(
        new CustomEvent('token-renovado', { detail: { token: newAccessToken } }),
      );

      // 2. Despachar las solicitudes encoladas con el nuevo token
      processQueue(null, newAccessToken);

      // 3. Reintentar la solicitud original con el nuevo token
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Criterio de Aceptación 2: El refresh token caducó o es inválido.
      // Rechazar todas las solicitudes encoladas
      processQueue(refreshError, null);

      // Limpiar datos de autenticación del almacenamiento local
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('usuario');

      // Notificar al sistema
      window.dispatchEvent(
        new CustomEvent('sesion-expirada', {
          detail: { motivo: 'refresh_invalido_o_expirado' },
        }),
      );

      // Redirigir forzosamente al login indicando que la sesión caducó
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expirado=true';
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
