import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://gerenciador-marketing-backend.onrender.com';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Posts
export const postsApi = {
  getAll: (params?: { status?: string; platform?: string; limit?: number; page?: number }) =>
    api.get('/v3/posts', { params }),
  
  create: (data: { content: string; platform: string; category?: string; cta?: string; hashtags?: string }) =>
    api.post('/v3/posts', data),
  
  update: (id: string, data: any) =>
    api.put(`/v3/posts/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/v3/posts/${id}`),
  
  schedule: (id: string, scheduledAt: string) =>
    api.post(`/v3/posts/${id}/schedule`, { scheduledAt }),
  
  publish: (id: string) =>
    api.post(`/v3/posts/${id}/publish`),
};

// Content Generation
export const contentApi = {
  generate: (data: { theme: string; tone?: string; platform: string; category?: string }) =>
    api.post('/v3/content/generate', data),
  
  generateWeek: (data: { themes: string[]; tone?: string; platform: string; category?: string }) =>
    api.post('/v3/content/generate-week', data),
};

// Week Scheduling
export const weekApi = {
  schedule: (data: { postIds: string[]; schedule: { date: string; time: string }[] }) =>
    api.post('/v3/week/schedule', data),
  
  getWeek: (weekNumber: number, platform?: string) =>
    api.get(`/v3/week/${weekNumber}`, { params: { platform } }),
};

// Ideas
export const ideasApi = {
  getAll: () =>
    api.get('/ideas'),
  
  create: (data: { hook: string; breakText: string; pain: string; agitate: string; solution: string; proof: string; cta: string; category?: string }) =>
    api.post('/ideas', data),
  
  update: (id: string, data: any) =>
    api.put(`/ideas/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/ideas/${id}`),
};

// Settings
export const settingsApi = {
  get: () =>
    api.get('/settings'),
  
  update: (data: any) =>
    api.put('/settings', data),
};

// Analytics
export const analyticsApi = {
  getAll: (params?: { platform?: string; limit?: number }) =>
    api.get('/analytics', { params }),
  
  refresh: () =>
    api.post('/analytics/refresh'),
  
  getLatest: () =>
    api.get('/analytics/latest'),
};

export default api;
