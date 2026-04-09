import api from '../api';

export interface GenerateWeeklyParams {
  theme: string;
  tone: string;
  platform: 'linkedin' | 'facebook' | 'both';
}

export interface GenerateSingleParams {
  theme: string;
  tone: string;
  platform: 'linkedin' | 'facebook';
  strategyType?: string;
}

export interface WeekPost {
  day: string;
  dayLabel: string;
  content: string;
  strategy: string;
  suggestedTime: string;
  status: 'pending' | 'approved' | 'rejected' | 'scheduled';
  platform: string;
}

export interface WeeklyContent {
  id: string;
  theme: string;
  tone: string;
  platform: string;
  posts: WeekPost[];
  status: string;
  createdAt: string;
}

// Gera conteúdo para uma semana completa - USA API V2 (Multi-IA)
export async function generateWeeklyContent(params: GenerateWeeklyParams) {
  const response = await api.post('/api/v2/generate-week', params);
  return response.data;
}

// Gera um post individual - USA API V2
export async function generateSinglePost(params: GenerateSingleParams) {
  const response = await api.post('/api/v2/generate-single', params);
  return response.data;
}

// Regenera um post específico - USA API V2
export async function regeneratePost(
  weeklyContentId: string,
  dayIndex: number,
  theme: string,
  tone: string,
  feedback?: string
) {
  const response = await api.post('/api/v2/regenerate', {
    weeklyContentId,
    dayIndex,
    theme,
    tone,
    feedback
  });
  return response.data;
}

// Atualiza um post específico - USA API V2
export async function updatePost(
  weeklyContentId: string,
  dayIndex: number,
  updates: {
    content?: string;
    status?: string;
    scheduledTime?: string;
  }
) {
  const response = await api.put('/api/v2/update-post', {
    weeklyContentId,
    dayIndex,
    ...updates
  });
  return response.data;
}

// Agenda posts aprovados - USA API V2
export async function schedulePosts(
  weeklyContentId: string,
  posts: Array<{
    dayIndex: number;
    scheduledDate: string;
    scheduledTime: string;
    status: string;
    content: string;
    platform: string;
  }>
) {
  const response = await api.post('/api/v2/schedule', {
    weeklyContentId,
    posts
  });
  return response.data;
}

// Lista conteúdos semanais do usuário - USA API V2
export async function getWeeklyContents(): Promise<WeeklyContent[]> {
  const response = await api.get('/api/v2/weekly-content');
  return response.data.weeklyContents;
}

// Busca detalhes de um conteúdo semanal - USA API V2
export async function getWeeklyContent(id: string): Promise<WeeklyContent> {
  const response = await api.get(`/api/v2/weekly-content/${id}`);
  return response.data.weeklyContent;
}
