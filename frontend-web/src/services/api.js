import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshRequest;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = /\/auth\/(login|refresh|register)(?:\?|$)/.test(
      originalRequest?.url ?? '',
    );

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshRequest) {
        refreshRequest = api
          .post('/auth/refresh')
          .finally(() => {
            refreshRequest = undefined;
          });
      }

      const { accessToken } = (await refreshRequest).data;
      if (!accessToken) {
        throw new Error('Refresh endpoint did not return an access token');
      }

      localStorage.setItem('token', accessToken);
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;

      return api(originalRequest);
    } catch {
      localStorage.removeItem('token');
      return Promise.reject(error);
    }
  },
);

export default api;
