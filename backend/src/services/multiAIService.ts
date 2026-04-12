import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface GenerateOptions {
  theme: string;
  tone: string;
  platform: 'LINKEDIN' | 'FACEBOOK' | 'BOTH';
  instructions?: string;
  context?: string;
}

interface GenerateResult {
  content: string;
  providerUsed: string;
  provider?: string;
  success: boolean;
  latencyMs?: number;
  error?: string;
}

const PLATFORM_LIMITS = {
  LINKEDIN: 1300,
  FACEBOOK: 2000,
  BOTH: 1300,
};

function buildPrompt(options: GenerateOptions): string {
  const { theme, tone, platform, instructions, context } = options;
  const maxChars = PLATFORM_LIMITS[platform];

  const basePrompt = `Você é um especialista em marketing digital para eletricistas.

TEMA: ${theme}
TOM DE VOZ: ${tone}
PLATAFORMA: ${platform}
MÁXIMO DE CARACTERES: ${maxChars}

ESTRUTURA DO POST (use obrigatoriamente):
1. GANCHO (Hook viral) - Primeira linha que prende atenção
2. QUEBRA - Quebra de expectativa ou curiosidade
3. DOR - Problema que o leitor enfrenta
4. AGITA - Intensifica a dor com consequências
5. SOLUÇÃO - Como resolver o problema
6. PROVA - Dado, case ou exemplo real
7. CTA (Call to Action) - O que o leitor deve fazer

ESTRATÉGIAS DE HOOKS (escolha uma):
- Confession: "Errei por 3 anos antes de descobrir..."
- Curiosity Gap: "O que os grandes eletricistas não te contam..."
- Contrarian: "Por que NÃO usar o método tradicional..."
- Data-driven: "98% dos eletricistas cometem esse erro..."

REGRAS:
- Máximo ${maxChars} caracteres
- Use 3-5 hashtags relevantes no final
- Linguagem profissional mas acessível
- Foco em valor real para o leitor
- Evite jargões excessivos
${instructions ? `\nINSTRUÇÕES ADICIONAIS:\n${instructions}` : ''}
${context ? `\nCONTEXTO DA BASE DE CONHECIMENTO:\n${context}` : ''}

Gere APENAS o texto do post, sem explicações adicionais.`;

  return basePrompt;
}

async function tryClaude(prompt: string, maxChars: number): Promise<string | null> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
    
    if (content.length <= maxChars + 100) {
      return content;
    }
    return content.substring(0, maxChars);
  } catch (error) {
    console.log('Claude failed:', error);
    return null;
  }
}

async function tryOpenAI(prompt: string, maxChars: number): Promise<string | null> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || '';
    
    if (content.length <= maxChars + 100) {
      return content;
    }
    return content.substring(0, maxChars);
  } catch (error) {
    console.log('OpenAI failed:', error);
    return null;
  }
}

async function tryGemini(prompt: string, maxChars: number): Promise<string | null> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const content = result.response.text();
    
    if (content.length <= maxChars + 100) {
      return content;
    }
    return content.substring(0, maxChars);
  } catch (error) {
    console.log('Gemini failed:', error);
    return null;
  }
}

export async function generatePost(options: GenerateOptions): Promise<GenerateResult> {
  const prompt = buildPrompt(options);
  const maxChars = PLATFORM_LIMITS[options.platform];

  // Try Claude first
  let content = await tryClaude(prompt, maxChars);
  if (content) {
    return { content, providerUsed: 'claude', success: true };
  }

  // Fallback to OpenAI
  content = await tryOpenAI(prompt, maxChars);
  if (content) {
    return { content, providerUsed: 'openai', success: true };
  }

  // Fallback to Gemini
  content = await tryGemini(prompt, maxChars);
  if (content) {
    return { content, providerUsed: 'gemini', success: true };
  }

  return {
    content: '',
    providerUsed: 'none',
    success: false,
    error: 'All AI providers failed',
  };
}

export async function generateWeekPosts(
  themes: string[],
  options: Omit<GenerateOptions, 'theme'>
): Promise<GenerateResult[]> {
  const promises = themes.map(theme => 
    generatePost({ ...options, theme })
  );

  return Promise.all(promises);
}

// Alias para compatibilidade com rotas v2
export function generateWithFallback(
  prompt: string,
  _timeout?: number,
  _requestId?: string
): Promise<GenerateResult> {
  return generatePost({
    theme: prompt,
    tone: 'mix',
    platform: 'LINKEDIN',
  });
}

export function generateBatchWithFallback(
  items: { day: string; platform: string; prompt: string }[],
  _timeout?: number,
  _requestId?: string
): Promise<GenerateResult[]> {
  const themes = items.map(i => i.prompt);
  const promises = themes.map(theme => 
    generatePost({ theme, tone: 'mix', platform: 'LINKEDIN' })
  );
  return Promise.all(promises);
}

export async function checkAIProvidersHealth(): Promise<{ claude: boolean; openai: boolean; gemini: boolean }> {
  return {
    claude: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
  };
}

export async function analyzePlatform(url: string): Promise<{
  followers: number;
  views: number;
  shares: number;
  likes: number;
  comments: number;
  sales: number;
  analysis: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Você é um analista de métricas de redes sociais. Analise a URL fornecida e retorne métricas estimadas e uma análise de desempenho.'
        },
        {
          role: 'user',
          content: `Analise esta página/perfil e retorne:\n1. Número estimado de seguidores\n2. Visualizações médias por post\n3. Compartilhamentos médios\n4. Curtidas médias\n5. Comentários médios\n6. Uma análise de desempenho em português\n\nURL: ${url}\n\nResponda em JSON com os campos: followers, views, shares, likes, comments, analysis`
        }
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    
    return {
      followers: result.followers || 0,
      views: result.views || 0,
      shares: result.shares || 0,
      likes: result.likes || 0,
      comments: result.comments || 0,
      sales: result.sales || 0,
      analysis: result.analysis || 'Análise não disponível',
    };
  } catch (error) {
    console.log('Analytics analysis failed:', error);
    return {
      followers: 0,
      views: 0,
      shares: 0,
      likes: 0,
      comments: 0,
      sales: 0,
      analysis: 'Não foi possível analisar a URL no momento.',
    };
  }
}
