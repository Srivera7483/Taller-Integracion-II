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
 * @param {Error|null} error Error si el refresh falló, null si fue exitoso
 * @param {string|null} token Nuevo Access Token para inyectar en las peticiones encoladas
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
 * silenciosa (Silent Refresh).
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthEndpoint =
      /\/(?:autenticacion|auth)\/(?:inicio-sesion|usuario-actual|renovar-token|refrescar-token|refrescar|renovar|registro|login|register|refresh)(?:\?|$)/i.test(
        originalRequest?.url || '',
      );

    if (
      !error.response ||
      error.response.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint
    ) {
      return Promise.reject(error);
    }

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
      const localRefreshToken = localStorage.getItem('refreshToken');
      const payload = localRefreshToken ? { refreshToken: localRefreshToken } : {};

      let refreshResponse;
      try {
        refreshResponse = await axios.post(
          `${api.defaults.baseURL}/autenticacion/renovar-token`,
          payload,
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      } catch (err) {
        if (err.response?.status === 404) {
          refreshResponse = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            payload,
            {
              withCredentials: true,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        } else {
          throw err;
        }
      }

      const data = refreshResponse.data || {};
      const newAccessToken = data.accessToken || data.token || data.access_token;

      if (!newAccessToken) {
        throw new Error('El endpoint de refresh no retornó un access token válido.');
      }

      localStorage.setItem('token', newAccessToken);

      if (data.refreshToken || data.refresh_token) {
        localStorage.setItem(
          'refreshToken',
          data.refreshToken || data.refresh_token,
        );
      }

      window.dispatchEvent(
        new CustomEvent('token-renovado', { detail: { token: newAccessToken } }),
      );

      processQueue(null, newAccessToken);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);

      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('usuario');

      window.dispatchEvent(
        new CustomEvent('sesion-expirada', {
          detail: { motivo: 'refresh_invalido_o_expirado' },
        }),
      );

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