import axios, { InternalAxiosRequestConfig } from 'axios';
import { router } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = useAuthStore.getState().accessToken;
  console.log(`[Request] URL: ${config.url} | Token: ${accessToken ? accessToken.substring(0, 10) + '...' : 'none'}`);
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    console.log(`[Response Error] Status: ${error.response?.status} | URL: ${originalRequest?.url}`);

    if (originalRequest?.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    // Evitamos reintentos infinitos y no intentamos refresh si es la misma ruta de refresh
    if (
      error.response?.status === 401 && 
      originalRequest && 
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const authStore = useAuthStore.getState();
      const currentRefreshToken = authStore.refreshToken;

      if (!currentRefreshToken) {
        authStore.clearTokens();
        router.replace('/(auth)/login');
        return Promise.reject(error);
      }

      try {
        console.log(`[Refresh] Iniciando renovación con: ${currentRefreshToken.substring(0, 10)}...`);
        // Usamos axios base para no trigerear los interceptores de nuevo si falla
        const response = await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/auth/refresh`, {
          refresh_token: currentRefreshToken,
        });

        const access_token = response.data.access_token;
        const refresh_token = response.data.refresh_token;

        if (!access_token || !refresh_token) {
            throw new Error("No token returned");
        }

        console.log(`[Refresh] ÉXITO. Nuevo Access Token: ${access_token.substring(0, 10)}...`);

        // Actualizamos store
        authStore.setTokens(access_token, refresh_token);

        // Notificar a las peticiones encoladas
        processQueue(null, access_token);

        // Actualizamos el header de la petición que falló originalmente
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);

      } catch (refreshError: any) {
        console.log(`[Refresh] FALLO. Error: ${refreshError.message || refreshError}`);
        processQueue(error, null); // Rechazamos la cola con el error original (401)
        authStore.clearTokens();
        router.replace('/(auth)/login');
        return Promise.reject(error); // Retornamos el error original en lugar de refreshError
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
