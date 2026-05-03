import { useAppStore } from '@/src/store/useAppStore';
import axios from 'axios';

// Instancia base conectada a tu API de Azure
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de peticiones para inyectar automáticamente el JWT
api.interceptors.request.use(
  (config) => {
    // Al usar react-native, getState() nos permite leer del Store sin hooks (útil en archivos puramente JS)
    const token = useAppStore.getState().sessionToken;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
