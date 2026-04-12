import axios from 'axios';

const BASE_URL = 'https://gerenciador-marketing-backend.onrender.com/api';

const api = axios.create({ baseURL: BASE_URL });

// Interceptor: adiciona token mais recente em cada requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default api;
