import axios, { InternalAxiosRequestConfig } from 'axios';
import { router } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from './supabaseClient';
// Store imports for inline clearAllStores on forced logout
import { useWaterStore } from '../store/useWaterStore';
import { useNutritionStore } from '../store/useNutritionStore';
import { useSleepStore } from '../store/useSleepStore';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { useProfileStore } from '../store/useProfileStore';

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inline helper — avoids importing clearAllStores (circular dep via useShadowSyncStore → apiClient)
function wipeLocalStores() {
  useWaterStore.getState().clearLogs();
  useNutritionStore.getState().clearLogs();
  useSleepStore.getState().clearLogs();
  useWorkoutStore.getState().clearLogs();
  useProfileStore.getState().clearProfile();
}

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

    // Evitamos reintentos infinitos
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
        wipeLocalStores();
        authStore.clearTokens();
        router.replace('/(auth)/login');
        return Promise.reject(error);
      }

      try {
        console.log(`[Refresh] Iniciando renovación con Supabase...`);

        // Llamamos a Supabase para refrescar la sesión
        const { data, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: currentRefreshToken,
        });

        if (refreshError || !data.session) {
          throw refreshError || new Error('No session returned from Supabase');
        }

        const access_token = data.session.access_token;
        const refresh_token = data.session.refresh_token;

        console.log(`🔄 Token refrescado con éxito`);
        console.log(`[Refresh] Nuevo Access Token: ${access_token.substring(0, 10)}...`);

        // Actualizamos store
        authStore.setTokens(access_token, refresh_token);

        // Notificar a las peticiones encoladas
        processQueue(null, access_token);

        // Actualizamos el header de la petición que falló originalmente
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);

      } catch (refreshError: any) {
        console.log(`[Refresh] FALLO. Error: ${refreshError.message || refreshError}`);
        processQueue(error, null);
        wipeLocalStores();
        authStore.clearTokens();
        router.replace('/(auth)/login');
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
