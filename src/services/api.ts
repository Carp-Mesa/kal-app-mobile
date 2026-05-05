import { useAppStore } from '@/src/store/useAppStore';
import axios from 'axios';
import { router } from 'expo-router';

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

// Interceptor de respuestas para manejar expiración del Token globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Solo deslogueamos si el 401 NO viene de un intento de login/registro
    const isAuthRoute = error.config?.url?.includes('/auth/');
    
    if (error.response && error.response.status === 401 && !isAuthRoute) {
      console.log('Token inválido o expirado (401). Cerrando sesión...');
      // Limpiamos el token del estado (y por ende de AsyncStorage)
      useAppStore.getState().logout();
      // Redirigimos al usuario a iniciar sesión nuevamente
      router.replace('/(auth)/login');
    }
    return Promise.reject(error);
  }
);

export default api;
