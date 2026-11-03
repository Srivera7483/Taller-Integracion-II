import axios from 'axios';

/**
 * Instancia global de Axios configurada con soporte de cookies HttpOnly (TAL-125)
 * y reintento único ante respuestas 401 en rutas protegidas.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: true, // Vital para que el navegador envíe/reciba la cookie HttpOnly del refresh token
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

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
 * Interceptor de Solicitud: Inyecta el Access Token en cada petición.
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
 * Interceptor de Respuesta (TAL-125):
 * Si una petición protegida falla con 401, intenta renovar el access token
 * usando POST /auth/refresh (donde viaja la cookie HttpOnly automáticamente).
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Evitamos bucles infinitos si el 401 viene de endpoints de autenticación
    const isAuthEndpoint =
      /\/(?:auth|autenticacion)\/(?:login|inicio-sesion|refresh|renovar)(?:\?|$)/i.test(
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
      // Llamada al endpoint definido en la TAL-125
      const refreshResponse = await axios.post(
        `${api.defaults.baseURL}/auth/refresh`,
        {}, // El refresh token viaja seguro en la cookie HttpOnly, no en el body
        {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const data = refreshResponse.data || {};
      const newAccessToken = data.accessToken || data.token;

      if (!newAccessToken) {
        throw new Error('El endpoint de refresh no retornó un access token válido.');
      }

      // Guardamos el nuevo access token de 15 minutos
      localStorage.setItem('token', newAccessToken);

      processQueue(null, newAccessToken);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);

      // Si el refresh falla (expiró la cookie de 7 días o es inválida), limpiamos y botamos al login
      localStorage.removeItem('token');
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