import axios from 'axios';

// VITE_API_URL deve ser https://gerenciador-marketing-backend.onrender.com no Vercel
const BASE_URL = import.meta.env.VITE_API_URL || 'https://gerenciador-marketing-backend.onrender.com';

const api = axios.create({ baseURL: BASE_URL });

// Interceptor: sempre busca o token atualizado do localStorage em cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default api;
