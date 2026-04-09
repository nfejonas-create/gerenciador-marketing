import axios from 'axios';

const BASE_URL = 'https://gerenciador-marketing-backend.onrender.com/api';

const api = axios.create({ baseURL: BASE_URL });

const token = localStorage.getItem('token');
if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

export default api;
