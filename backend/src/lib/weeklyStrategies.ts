// Estratégias semanais por plataforma
// Horários otimizados baseados em dados de engajamento 2024

export interface DayStrategy {
  type: string;
  time: string;
  label: string;
  description: string;
}

export interface WeeklyStrategy {
  [day: string]: DayStrategy;
}

// LinkedIn - Melhores horários: 8h-10h (horário comercial)
export const LINKEDIN_WEEKLY_STRATEGY: WeeklyStrategy = {
  segunda: {
    type: 'confession',
    time: '08:00',
    label: 'Confissão Profissional',
    description: 'Abra a semana com uma história pessoal ou confissão profissional que humanize sua marca'
  },
  terca: {
    type: 'curiosity',
    time: '09:00',
    label: 'Segredo da Indústria',
    description: 'Compartilhe algo que poucos sabem sobre seu mercado'
  },
  quarta: {
    type: 'story',
    time: '08:30',
    label: 'História de Cliente',
    description: 'Case de sucesso ou história de transformação de um cliente'
  },
  quinta: {
    type: 'credibility',
    time: '09:30',
    label: 'Expertise/Educação',
    description: 'Demonstração de conhecimento profundo com dicas práticas'
  },
  sexta: {
    type: 'question',
    time: '08:00',
    label: 'Pergunta aos Seguidores',
    description: 'Engaje sua audiência com uma pergunta relevante'
  },
  sabado: {
    type: 'contrarian',
    time: '10:00',
    label: 'Opinião Impopular',
    description: 'Opinião diferente sobre um tema do seu mercado (gera discussão)'
  },
  domingo: {
    type: 'list',
    time: '11:00',
    label: 'Lista de Valor',
    description: 'Lista numerada com valor prático para a semana'
  }
};

// Facebook - Melhores horários: 19h-21h (horário de lazer)
export const FACEBOOK_WEEKLY_STRATEGY: WeeklyStrategy = {
  segunda: {
    type: 'story',
    time: '19:00',
    label: 'História do Dia',
    description: 'Comece a semana com uma história leve e inspiradora'
  },
  terca: {
    type: 'question',
    time: '20:00',
    label: 'Enquete/Interação',
    description: 'Pergunta para engajar a comunidade'
  },
  quarta: {
    type: 'curiosity',
    time: '19:30',
    label: 'Você Sabia?',
    description: 'Curiosidade sobre o nicho ou mercado'
  },
  quinta: {
    type: 'list',
    time: '20:30',
    label: 'Dicas Rápidas',
    description: 'Lista de dicas práticas e fáceis de aplicar'
  },
  sexta: {
    type: 'confession',
    time: '19:00',
    label: 'Desabafo Sincero',
    description: 'Confissão ou desabafo que crie conexão emocional'
  },
  sabado: {
    type: 'credibility',
    time: '21:00',
    label: 'Case de Sucesso',
    description: 'Resultado ou conquista para inspirar'
  },
  domingo: {
    type: 'contrarian',
    time: '20:00',
    label: 'Pensamento do Dia',
    description: 'Reflexão ou opinião sobre um tema relevante'
  }
};

// Dias da semana em português
export const WEEK_DAYS = [
  'domingo',
  'segunda',
  'terca',
  'quarta',
  'quinta',
  'sexta',
  'sabado'
];

// Labels dos dias
export const WEEK_DAY_LABELS: Record<string, string> = {
  domingo: 'Domingo',
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado'
};

// Função para obter estratégia semanal
export function getWeeklyStrategy(platform: 'linkedin' | 'facebook'): WeeklyStrategy {
  return platform === 'linkedin' ? LINKEDIN_WEEKLY_STRATEGY : FACEBOOK_WEEKLY_STRATEGY;
}

// Função para obter estratégia de um dia específico
export function getDayStrategy(platform: 'linkedin' | 'facebook', day: string): DayStrategy | null {
  const strategy = getWeeklyStrategy(platform);
  return strategy[day.toLowerCase()] || null;
}

// Função para obter próximo dia útil
export function getNextBusinessDay(currentDay: string): string {
  const days = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const currentIndex = days.indexOf(currentDay.toLowerCase());
  
  // Se for sexta, volta para segunda
  if (currentDay.toLowerCase() === 'sexta') return 'segunda';
  if (currentDay.toLowerCase() === 'sabado') return 'segunda';
  if (currentDay.toLowerCase() === 'domingo') return 'segunda';
  
  return days[currentIndex + 1];
}

// Sugestões de horários por plataforma
export const SUGGESTED_TIMES = {
  linkedin: ['08:00', '08:30', '09:00', '09:30', '10:00', '11:00', '12:00'],
  facebook: ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30']
};
