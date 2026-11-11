import axios from 'axios';

export const MAX_RETRIES = 3;
export const RETRY_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s de backoff exponencial
export let currentRetryDelays = [...RETRY_DELAYS];

export const setTestRetryDelays = (delays) => {
  currentRetryDelays = Array.isArray(delays) ? delays : [...RETRY_DELAYS];
};

export const resetTestRetryDelays = () => {
  currentRetryDelays = [...RETRY_DELAYS];
};

const rawBaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:3000/api/v1';
const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, '');
const normalizedBaseUrl = cleanBaseUrl.endsWith('/api') ? `${cleanBaseUrl}/v1` : cleanBaseUrl;

const api = axios.create({
  baseURL: normalizedBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) promise.reject(error);
    else promise.resolve(token);
  });
  failedQueue = [];
};

/**
 * Obtiene la ruta o pantalla actual del navegador de forma segura.
 */
export const getCurrentScreen = () => {
  if (typeof window !== 'undefined' && window.location && window.location.pathname) {
    return window.location.pathname;
  }
  return '/';
};

/**
 * Determina si el método HTTP es idempotente (GET, HEAD, OPTIONS).
 */
export const isIdempotentMethod = (method = '') => {
  const m = String(method).toUpperCase();
  return m === 'GET' || m === 'HEAD' || m === 'OPTIONS';
};

/**
 * Identifica si un error es consecuencia de un fallo de red o timeout.
 */
export const isNetworkOrTimeoutError = (error) => {
  if (!error) return false;
  if (axios.isCancel(error) || error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
    return false;
  }
  if (error.code === 'ERR_NETWORK') return true;
  if (error.code === 'ECONNABORTED') return true;
  if (typeof error.message === 'string' && error.message.toLowerCase().includes('timeout')) {
    return true;
  }
  if (!error.response && Boolean(error.request)) return true;
  if (error.message === 'Network Error') return true;
  return false;
};

/**
 * Verifica si la URL corresponde a endpoints excluidos de reintentos (auth o health).
 */
export const isExcludedEndpoint = (url = '') => {
  return (
    /\/(?:auth|autenticacion)\/(?:login|inicio-sesion|refresh|renovar)(?:\?|$)/i.test(url) ||
    /\/health(?:\?|$)/i.test(url)
  );
};

// ---------------------------------------------------------------------------
// TAL-181: Gestión de Reintentos, Cancelación por Navegación y Pausa de Mutaciones
// ---------------------------------------------------------------------------

const pendingRetries = new Map();
let retrySequence = 0;
const pausedMutations = [];
const inFlightMutations = new Map();

/**
 * Serializa de forma determinista el cuerpo de una petición para deduplicación.
 */
export const serializePayload = (data) => {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    const entries = [];
    for (const [k, v] of data.entries()) {
      entries.push(`${k}:${typeof v === 'object' && v?.name ? v.name : String(v)}`);
    }
    return entries.sort().join('&');
  }
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
};

/**
 * Criterio 2: Cancela reintentos pendientes y mutaciones pausadas cuando el usuario navega a otra pantalla.
 */
export const cancelPendingRetries = (targetScreen = null) => {
  const currentScreen = targetScreen || getCurrentScreen();

  // Cancelar reintentos en backoff
  for (const [id, entry] of pendingRetries.entries()) {
    const shouldCancel = !targetScreen || entry.screen !== currentScreen;
    if (shouldCancel) {
      if (entry.timerId) {
        clearTimeout(entry.timerId);
        entry.timerId = null;
      }
      if (entry.abortController) {
        try {
          entry.abortController.abort();
        } catch {
          // ignorar error de abort
        }
      }
      entry.reject(
        new axios.CanceledError(
          `Reintento cancelado: el usuario navegó a otra pantalla (${currentScreen}).`
        )
      );
      pendingRetries.delete(id);
    }
  }

  // Cancelar mutaciones en pausa si se navegó a otra pantalla
  for (let i = pausedMutations.length - 1; i >= 0; i--) {
    const entry = pausedMutations[i];
    if (!targetScreen || entry.screen !== currentScreen) {
      entry.reject(
        new axios.CanceledError(
          `Solicitud mutante cancelada: el usuario navegó a otra pantalla (${currentScreen}) mientras esperaba conectividad.`
        )
      );
      pausedMutations.splice(i, 1);
    }
  }
};

/**
 * Reanuda inmediatamente todos los reintentos y mutaciones pausadas al restaurarse la conectividad (online).
 */
export const flushPendingRetriesAndMutations = () => {
  const currentScreen = getCurrentScreen();

  // Reanudar reintentos pendientes
  for (const [id, entry] of pendingRetries.entries()) {
    if (entry.screen === currentScreen) {
      if (entry.timerId) {
        clearTimeout(entry.timerId);
        entry.timerId = null;
      }
      pendingRetries.delete(id);
      entry.executeRetry();
    }
  }

  // Liberar mutaciones pausadas
  while (pausedMutations.length > 0) {
    const entry = pausedMutations.shift();
    if (entry.screen === currentScreen) {
      entry.resolve();
    } else {
      entry.reject(
        new axios.CanceledError(
          `Solicitud mutante cancelada: el usuario navegó a otra pantalla (${currentScreen}).`
        )
      );
    }
  }
};

// Listeners en navegador para reconexión y navegación
if (typeof window !== 'undefined') {
  window.addEventListener('online', flushPendingRetriesAndMutations);
  window.addEventListener('gateway-success', flushPendingRetriesAndMutations);
  window.addEventListener('popstate', () => {
    cancelPendingRetries(window.location?.pathname);
  });
  window.addEventListener('navigation-change', (event) => {
    cancelPendingRetries(event.detail?.pathname || window.location?.pathname);
  });
}

// Utilidades para pruebas y métricas
export const getActiveRetriesCount = () => pendingRetries.size;
export const getPausedMutationsCount = () => pausedMutations.length;
export const getInFlightMutationsCount = () => inFlightMutations.size;
export const clearAllRetriesAndMutations = () => {
  for (const [, entry] of pendingRetries.entries()) {
    if (entry.timerId) clearTimeout(entry.timerId);
  }
  pendingRetries.clear();
  pausedMutations.length = 0;
  inFlightMutations.clear();
};

/**
 * Pausa solicitudes mutantes si el dispositivo se encuentra offline hasta confirmar conectividad.
 */
export const pauseMutatingRequestUntilOnline = (config) => {
  return new Promise((resolve, reject) => {
    const originScreen = config._originScreen || getCurrentScreen();
    let timeoutId = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('gateway-success', handleOnline);
      }
      const idx = pausedMutations.indexOf(entry);
      if (idx !== -1) pausedMutations.splice(idx, 1);
    };

    const handleOnline = () => {
      cleanup();
      const current = getCurrentScreen();
      if (current !== originScreen) {
        reject(
          new axios.CanceledError(
            `Solicitud mutante cancelada: el usuario navegó de ${originScreen} a ${current} mientras esperaba conectividad.`
          )
        );
      } else {
        resolve(config);
      }
    };

    const entry = {
      config,
      screen: originScreen,
      resolve: handleOnline,
      reject: (err) => {
        cleanup();
        reject(err);
      },
    };

    pausedMutations.push(entry);

    timeoutId = setTimeout(() => {
      cleanup();
      const timeoutError = new Error('Tiempo de espera agotado esperando conectividad para la solicitud.');
      timeoutError.code = 'ERR_NETWORK';
      reject(timeoutError);
    }, 30000);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('gateway-success', handleOnline);
    }
  });
};

// ---------------------------------------------------------------------------
// Prevención de Duplicación en Vuelo para Peticiones Mutantes (Criterio 3)
// ---------------------------------------------------------------------------
const wrapMutatingMethod = (methodName) => {
  const originalMethod = api[methodName].bind(api);
  api[methodName] = function (url, data, config) {
    const isExcluded = isExcludedEndpoint(url || '') || config?.skipDeduplication === true;
    if (isExcluded) {
      return originalMethod(url, data, config);
    }
    const deduplicationKey = `${methodName.toUpperCase()}:${url}:${serializePayload(data)}`;
    if (inFlightMutations.has(deduplicationKey)) {
      return inFlightMutations.get(deduplicationKey);
    }
    const promise = originalMethod(url, data, config).finally(() => {
      inFlightMutations.delete(deduplicationKey);
    });
    inFlightMutations.set(deduplicationKey, promise);
    return promise;
  };
};

wrapMutatingMethod('post');
wrapMutatingMethod('put');
wrapMutatingMethod('patch');
wrapMutatingMethod('delete');

// Interceptor de peticiones
api.interceptors.request.use(
  async (config) => {
    // Si la petición envía FormData, dejar que el navegador/cliente calcule el boundary multipart
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (!config._originScreen) {
      config._originScreen = getCurrentScreen();
    }

    const method = String(config.method || 'get').toUpperCase();
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isMutating && isOffline && !isExcludedEndpoint(config.url || '')) {
      await pauseMutatingRequestUntilOnline(config);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Interceptor de respuestas (Refresh token 401 y Política de Reintento TAL-181)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isAuthEndpoint =
      /\/(?:auth|autenticacion)\/(?:login|inicio-sesion|refresh|renovar)(?:\?|$)/i.test(
        originalRequest?.url || '',
      );

    // 1. Manejo de expiración de sesión (401 Unauthorized) con Refresh Token
    if (error.response && error.response.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newAccessToken) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          })
          .catch((refreshError) => Promise.reject(refreshError));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
          },
        );
        const newAccessToken =
          refreshResponse.data?.accessToken ||
          refreshResponse.data?.token ||
          refreshResponse.data?.access_token;

        if (!newAccessToken) {
          throw new Error('El endpoint de refresh no retorno un access token valido.');
        }

        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('token', newAccessToken);
        }
        processQueue(null, newAccessToken);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('sesion-expirada', {
              detail: { motivo: 'refresh_invalido_o_expirado' },
            }),
          );
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login?expirado=true';
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 2. TAL-181: Política de Reintento Automático con Backoff Exponencial (1s, 2s, 4s)
    const method = String(originalRequest.method || 'get').toUpperCase();
    const isIdempotent = isIdempotentMethod(method);
    const isRetryableError = isNetworkOrTimeoutError(error);
    const isExcluded = isExcludedEndpoint(originalRequest.url || '') || originalRequest.skipRetry === true;

    // Criterio 3: Las solicitudes mutantes que fallaron NO se reintentan para evitar duplicaciones
    if (!isIdempotent) {
      return Promise.reject(error);
    }

    // Si es idempotente, falló por red/timeout y no está excluida
    if (isRetryableError && !isExcluded) {
      const currentRetry = (originalRequest._retryCount || 0) + 1;

      // Criterio 1: Se reintentan hasta un máximo de 3 veces
      if (currentRetry <= MAX_RETRIES) {
        originalRequest._retryCount = currentRetry;

        // Criterio 2: Validar si el usuario ya navegó a otra pantalla antes de programar
        const originScreen = originalRequest._originScreen || getCurrentScreen();
        const currentScreen = getCurrentScreen();
        if (originScreen !== currentScreen) {
          return Promise.reject(
            new axios.CanceledError(
              `Reintento cancelado: el usuario navegó a otra pantalla (${currentScreen}).`
            )
          );
        }

        const delayMs = currentRetryDelays[currentRetry - 1] ?? currentRetryDelays[currentRetryDelays.length - 1];

        return new Promise((resolve, reject) => {
          const retryId = ++retrySequence;
          const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;

          if (abortController) {
            if (originalRequest.signal && originalRequest.signal.aborted) {
              return reject(new axios.CanceledError('Petición cancelada por el usuario.'));
            }
            originalRequest.signal = abortController.signal;
          }

          const executeRetry = () => {
            const activeScreen = getCurrentScreen();
            if (originScreen !== activeScreen) {
              return reject(
                new axios.CanceledError(
                  `Reintento cancelado: el usuario navegó de ${originScreen} a ${activeScreen}.`
                )
              );
            }
            api(originalRequest).then(resolve).catch(reject);
          };

          const timerId = setTimeout(() => {
            pendingRetries.delete(retryId);
            executeRetry();
          }, delayMs);

          pendingRetries.set(retryId, {
            id: retryId,
            screen: originScreen,
            timerId,
            abortController,
            executeRetry,
            reject,
          });
        });
      }
    }

    return Promise.reject(error);
  },
);

export default api;
