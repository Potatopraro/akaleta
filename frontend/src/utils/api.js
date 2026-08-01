import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? 'https://akaleta-backend.onrender.com/api' : '/api'),
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('akaleta_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('akaleta_refresh');
      if (refreshToken) {
        try {
          const res = await api.post('/auth/refresh', { refreshToken });
          const { accessToken } = res.data;
          localStorage.setItem('akaleta_token', accessToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          original.headers.Authorization = `Bearer ${accessToken}`;
          return api(original);
        } catch {
          localStorage.removeItem('akaleta_token');
          localStorage.removeItem('akaleta_refresh');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
