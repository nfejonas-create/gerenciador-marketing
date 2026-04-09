import Anthropic from '@anthropic-ai/sdk';
import { 
  getDailyStrategy, 
  generateStrategyPrompt,
  HOOKS,
  STRUCTURES,
  CTAS,
  ContentStrategy 
} from '../lib/contentStrategy';
import { 
  getWeeklyStrategy, 
  getDayStrategy,
  WEEK_DAYS,
  SUGGESTED_TIMES 
} from '../lib/weeklyStrategies';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface WeekPost {
  day: string;
  dayLabel: string;
  content: string;
  strategy: string;
  suggestedTime: string;
  status: 'pending' | 'approved' | 'rejected' | 'scheduled';
  platform: string;
}

export interface GenerateWeeklyParams {
  theme: string;
  tone: string;
  platform: 'linkedin' | 'facebook' | 'both';
  userId: string;
  knowledgeBase?: string[];
}

// Gera conteúdo para uma semana completa
export async function generateWeeklyContent(params: GenerateWeeklyParams): Promise<WeekPost[]> {
  const { theme, tone, platform, knowledgeBase } = params;
  const weekPosts: WeekPost[] = [];
  
  // Define plataformas a gerar
  const platforms = platform === 'both' ? ['linkedin', 'facebook'] : [platform];
  
  for (const plat of platforms) {
    const strategy = getWeeklyStrategy(plat as 'linkedin' | 'facebook');
    
    for (const day of WEEK_DAYS) {
      const dayStrategy = strategy[day];
      if (!dayStrategy) continue;
      
      const contentStrategy = getDailyStrategy(plat as 'linkedin' | 'facebook', day);
      const prompt = generateStrategyPrompt(contentStrategy, theme, tone);
      
      // Adiciona contexto da base de conhecimento se disponível
      const knowledgeContext = knowledgeBase && knowledgeBase.length > 0 
        ? `\n\nUse como referência este conteúdo da base de conhecimento:\n${knowledgeBase.slice(0, 3).join('\n---\n')}`
        : '';
      
      try {
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `${prompt}${knowledgeContext}\n\nGere o post completo em português do Brasil.`
          }]
        });
        
        const content = response.content[0].type === 'text' 
          ? response.content[0].text 
          : 'Erro ao gerar conteúdo';
        
        weekPosts.push({
          day,
          dayLabel: getDayLabel(day),
          content: content.trim(),
          strategy: dayStrategy.label,
          suggestedTime: dayStrategy.time,
          status: 'pending',
          platform: plat
        });
      } catch (error) {
        console.error(`Erro ao gerar post para ${day}:`, error);
        weekPosts.push({
          day,
          dayLabel: getDayLabel(day),
          content: `Erro ao gerar conteúdo para ${day}. Tente gerar novamente.`,
          strategy: dayStrategy.label,
          suggestedTime: dayStrategy.time,
          status: 'pending',
          platform: plat
        });
      }
    }
  }
  
  return weekPosts;
}

// Gera um post individual
export async function generateSinglePost(
  theme: string,
  tone: string,
  platform: 'linkedin' | 'facebook',
  strategyType: string,
  knowledgeBase?: string[]
): Promise<string> {
  const contentStrategy: ContentStrategy = {
    hook: strategyType as any,
    structure: 'aida',
    cta: CTAS.engagement[0],
    template: HOOKS[strategyType as keyof typeof HOOKS]?.templates[0] || HOOKS.curiosity.templates[0],
    example: ''
  };
  
  const prompt = generateStrategyPrompt(contentStrategy, theme, tone);
  
  const knowledgeContext = knowledgeBase && knowledgeBase.length > 0 
    ? `\n\nUse como referência:\n${knowledgeBase.slice(0, 3).join('\n---\n')}`
    : '';
  
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `${prompt}${knowledgeContext}\n\nGere o post completo em português do Brasil.`
    }]
  });
  
  return response.content[0].type === 'text' 
    ? response.content[0].text.trim() 
    : 'Erro ao gerar conteúdo';
}

// Adapta conteúdo do LinkedIn para Facebook
export async function generateFacebookVariant(linkedinContent: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Adapte o seguinte post do LinkedIn para o Facebook, tornando-o mais casual, com mais emojis, e mais conversacional:

POST ORIGINAL:
${linkedinContent}

INSTRUÇÕES:
1. Mantenha a mensagem principal
2. Use tom mais informal e próximo
3. Adicione emojis relevantes
4. Faça perguntas para engajar
5. Use frases mais curtas
6. Total: 100-200 palavras`
    }]
  });
  
  return response.content[0].type === 'text' 
    ? response.content[0].text.trim() 
    : linkedinContent;
}

// Regenera um post específico
export async function regeneratePost(
  weekPost: WeekPost,
  theme: string,
  tone: string,
  feedback?: string
): Promise<WeekPost> {
  const contentStrategy = getDailyStrategy(weekPost.platform as 'linkedin' | 'facebook', weekPost.day);
  let prompt = generateStrategyPrompt(contentStrategy, theme, tone);
  
  if (feedback) {
    prompt += `\n\nFEEDBACK PARA MELHORAR:\n${feedback}`;
  }
  
  prompt += `\n\nGere uma NOVA VERSÃO diferente do post anterior.`;
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    const content = response.content[0].type === 'text' 
      ? response.content[0].text.trim() 
      : 'Erro ao regenerar conteúdo';
    
    return {
      ...weekPost,
      content,
      status: 'pending'
    };
  } catch (error) {
    console.error('Erro ao regenerar post:', error);
    return weekPost;
  }
}

// Helper para obter label do dia
function getDayLabel(day: string): string {
  const labels: Record<string, string> = {
    domingo: 'Domingo',
    segunda: 'Segunda',
    terca: 'Terça',
    quarta: 'Quarta',
    quinta: 'Quinta',
    sexta: 'Sexta',
    sabado: 'Sábado'
  };
  return labels[day] || day;
}

// Sugere melhorias para um post
export async function suggestImprovements(content: string): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Analise este post e sugira 3 melhorias específicas para aumentar engajamento:

POST:
${content}

Responda apenas com as 3 sugestões, uma por linha.`
    }]
  });
  
  if (response.content[0].type === 'text') {
    return response.content[0].text.split('\n').filter(s => s.trim()).slice(0, 3);
  }
  
  return ['Adicionar mais emojis', 'Usar perguntas no final', 'Diminuir parágrafos'];
}
