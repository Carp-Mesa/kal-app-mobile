import axios, { InternalAxiosRequestConfig } from 'axios';
import { router } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from './supabaseClient';
import { useWaterStore } from '../store/useWaterStore';
import { useNutritionStore } from '../store/useNutritionStore';
import { useSleepStore } from '../store/useSleepStore';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { useProfileStore } from '../store/useProfileStore';

// ═══════════════════════════════════════════════════════════════════════════════
// API Client — Axios instance with auth interceptors
// ═══════════════════════════════════════════════════════════════════════════════
//
// Key behaviours:
//   • Every outbound request injects the Bearer token from Zustand if present.
//   • Requests without a token pass through WITHOUT the Authorization header.
//     This allows public endpoints (if any) to work; the backend will reject
//     protected endpoints with 401 which the response interceptor will handle.
//   • On 401, the interceptor attempts a silent refresh via Supabase.
//     If refresh fails → wipe stores + redirect to login.
// ═══════════════════════════════════════════════════════════════════════════════

// Inline helper — avoids importing clearAllStores (circular dep via useShadowSyncStore → apiClient)
function wipeLocalStores() {
  useWaterStore.getState().clearLogs();
  useNutritionStore.getState().clearLogs();
  useSleepStore.getState().clearLogs();
  useWorkoutStore.getState().clearLogs();
  useProfileStore.getState().clearProfile();
}

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

// ── Request Interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// ── Response Interceptor (401 handling) ─────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401s on requests that had a token (i.e. authenticated requests)
    const hadToken = originalRequest?.headers?.Authorization;
    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      !hadToken
    ) {
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
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
      // No refresh token available → force logout
      processQueue(error, null);
      wipeLocalStores();
      authStore.clearTokens();
      router.replace('/(auth)/login');
      return Promise.reject(error);
    }

    try {
      const { data, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: currentRefreshToken,
      });

      if (refreshError || !data.session) {
        throw refreshError || new Error('No session returned from Supabase');
      }

      const access_token = data.session.access_token;
      const refresh_token = data.session.refresh_token;

      authStore.setTokens(access_token, refresh_token);
      processQueue(null, access_token);

      originalRequest.headers.Authorization = `Bearer ${access_token}`;
      return apiClient(originalRequest);

    } catch (refreshError: any) {
      processQueue(error, null);
      wipeLocalStores();
      authStore.clearTokens();
      router.replace('/(auth)/login');
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;