
export const authService = {
  login: async (email: string, password: string):Promise<{token: string, user: any}> => {
    // Ejemplo real de integración (Descomenta cuando Azure esté en pie):
    // const { data } = await api.post('/auth/login', { email, password });
    // return data;

    console.log('Simulating login to Azure backend with', email);
    return new Promise((resolve) => 
      setTimeout(() => resolve({ token: 'dummy_jwt_token_123', user: { email, name: email.split('@')[0] } }), 1000)
    );
  },
  register: async (email: string, password: string):Promise<{token: string, user: any}> => {
    // const { data } = await api.post('/auth/register', { email, password });
    // return data;

    console.log('Simulating register to Azure backend with', email);
    return new Promise((resolve) => 
      setTimeout(() => resolve({ token: 'dummy_jwt_token_123', user: { email, name: email.split('@')[0] } }), 1000)
    );
  }
};