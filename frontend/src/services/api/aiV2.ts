// Serviço para API v2 de IA (Multi-IA com fallback)
// URL hardcoded para evitar problemas de variável de ambiente

const API_BASE = 'https://gerenciador-marketing-backend.onrender.com/api/v2';

// Helper para fazer requests
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Gera conteúdo para uma semana completa
export async function generateWeeklyContentV2(params: {
  theme: string;
  tone: string;
  platform: 'linkedin' | 'facebook' | 'both';
}) {
  const token = localStorage.getItem('token');
  
  return fetchWithTimeout(`${API_BASE}/generate-week`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  }, 90000); // 90s timeout para geração semanal
}

// Gera um post individual
export async function generateSinglePostV2(params: {
  theme: string;
  tone: string;
  platform: 'linkedin' | 'facebook';
  strategyType?: string;
}) {
  const token = localStorage.getItem('token');
  
  return fetchWithTimeout(`${API_BASE}/generate-single`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  }, 30000);
}

// Regenera um post específico
export async function regeneratePostV2(params: {
  weeklyContentId: string;
  dayIndex: number;
  theme: string;
  tone: string;
  feedback?: string;
}) {
  const token = localStorage.getItem('token');
  
  return fetchWithTimeout(`${API_BASE}/regenerate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  }, 30000);
}

// Atualiza um post
export async function updatePostV2(params: {
  weeklyContentId: string;
  dayIndex: number;
  content?: string;
  status?: string;
  scheduledTime?: string;
}) {
  const token = localStorage.getItem('token');
  
  return fetchWithTimeout(`${API_BASE}/update-post`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  }, 15000);
}

// Agenda posts aprovados
export async function schedulePostsV2(params: {
  weeklyContentId: string;
  posts: Array<{
    content: string;
    platform: string;
    status: string;
    scheduledDate?: string;
    scheduledTime?: string;
  }>;
}) {
  const token = localStorage.getItem('token');
  
  return fetchWithTimeout(`${API_BASE}/schedule`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  }, 15000);
}

// Lista conteúdos semanais
export async function getWeeklyContentsV2() {
  const token = localStorage.getItem('token');
  
  return fetchWithTimeout(`${API_BASE}/weekly-content`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }, 15000);
}

// Detalhes de um conteúdo semanal
export async function getWeeklyContentV2(id: string) {
  const token = localStorage.getItem('token');
  
  return fetchWithTimeout(`${API_BASE}/weekly-content/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }, 15000);
}

// Health check dos providers
export async function checkAIHealthV2() {
  return fetchWithTimeout(`${API_BASE}/health`, {}, 10000);
}

export default {
  generateWeeklyContentV2,
  generateSinglePostV2,
  regeneratePostV2,
  updatePostV2,
  schedulePostsV2,
  getWeeklyContentsV2,
  getWeeklyContentV2,
  checkAIHealthV2,
};
