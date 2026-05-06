import api from './apiClient';

export const authService = {
  login: async (email: string, password: string):Promise<{access_token: string, refresh_token: string, user: any}> => {
    const { data } = await api.post('/auth/login', { email, password });
    return { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
  },
  register: async (email: string, password: string):Promise<{access_token: string, refresh_token: string, user: any}> => {
    const { data } = await api.post('/auth/register', { email, password });
    return { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
  },
  refreshSession: async (refresh_token: string): Promise<{access_token: string, refresh_token: string}> => {
    const { data } = await api.post('/auth/refresh', { refresh_token });
    return { access_token: data.access_token, refresh_token: data.refresh_token };
  }
};