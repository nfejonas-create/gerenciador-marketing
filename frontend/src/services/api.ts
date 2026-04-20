import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://gerenciador-marketing-backend.onrender.com';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  const impId = localStorage.getItem('impersonateUserId');
  if (impId) config.headers['X-Impersonate-User-Id'] = impId;
  return config;
});

export default api;
