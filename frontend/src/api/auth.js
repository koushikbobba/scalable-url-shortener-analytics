import api from './client';

export const authApi = {
  login: async (email, password) => {
    const res = await api.post('/auth/login/', { email, password });
    return res.data;
  },
  register: async (email, full_name, password, password_confirm) => {
    const res = await api.post('/auth/register/', {
      email,
      full_name,
      password,
      password_confirm,
    });
    return res.data;
  },
  getProfile: async () => {
    const res = await api.get('/auth/me/');
    return res.data;
  },
  logout: async (refreshToken) => {
    try {
      await api.post('/auth/logout/', { refresh: refreshToken });
    } catch (e) {
      console.warn("Logout error:", e);
    }
  }
};
