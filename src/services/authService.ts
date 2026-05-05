
import api from '@/src/services/api';

export const authService = {
  login: async (email: string, password: string):Promise<{token: string, user: any}> => {
    const { data } = await api.post('/auth/login', { email, password });
    return { token: data.access_token || data.token, user: data.user };
  },
  register: async (email: string, password: string):Promise<{token: string, user: any}> => {
    const { data } = await api.post('/auth/register', { email, password });
    return { token: data.access_token || data.token, user: data.user };
  }
};