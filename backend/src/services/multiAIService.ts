import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Configuração das APIs
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Tipos
export interface AIProvider {
  name: 'claude' | 'openai' | 'gemini';
  generate: (prompt: string, maxTokens?: number) => Promise<string>;
}

export interface GenerationResult {
  content: string;
  provider: string;
  success: boolean;
  error?: string;
  latencyMs: number;
}

// Configurações
const AI_CONFIG = {
  claude: {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 1000,
    timeoutMs: 15000,
  },
  openai: {
    model: 'gpt-4-turbo-preview',
    maxTokens: 1000,
    timeoutMs: 15000,
  },
  gemini: {
    model: 'gemini-pro',
    maxTokens: 1000,
    timeoutMs: 15000,
  },
};

// Provider: Claude
async function generateWithClaude(prompt: string, maxTokens: number = 1000): Promise<string> {
  const response = await anthropic.messages.create({
    model: AI_CONFIG.claude.model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });

  if (response.content[0].type === 'text') {
    return response.content[0].text;
  }
  throw new Error('Resposta inválida do Claude');
}

// Provider: OpenAI
async function generateWithOpenAI(prompt: string, maxTokens: number = 1000): Promise<string> {
  const response = await openai.chat.completions.create({
    model: AI_CONFIG.openai.model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.choices[0]?.message?.content || '';
}

// Provider: Gemini
async function generateWithGemini(prompt: string, maxTokens: number = 1000): Promise<string> {
  const model = genAI.getGenerativeModel({ model: AI_CONFIG.gemini.model });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Função com timeout
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  providerName: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${providerName} timeout`)), timeoutMs)
    ),
  ]);
}

// Tenta um provider com retry
async function tryProvider(
  provider: 'claude' | 'openai' | 'gemini',
  prompt: string,
  maxTokens: number,
  retries: number = 2
): Promise<GenerationResult> {
  const startTime = Date.now();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      let content: string;
      
      switch (provider) {
        case 'claude':
          content = await withTimeout(
            generateWithClaude(prompt, maxTokens),
            AI_CONFIG.claude.timeoutMs,
            'Claude'
          );
          break;
        case 'openai':
          content = await withTimeout(
            generateWithOpenAI(prompt, maxTokens),
            AI_CONFIG.openai.timeoutMs,
            'OpenAI'
          );
          break;
        case 'gemini':
          content = await withTimeout(
            generateWithGemini(prompt, maxTokens),
            AI_CONFIG.gemini.timeoutMs,
            'Gemini'
          );
          break;
        default:
          throw new Error('Provider desconhecido');
      }

      return {
        content,
        provider,
        success: true,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      console.warn(`[${provider}] Tentativa ${attempt}/${retries} falhou:`, errorMsg);
      
      if (attempt === retries) {
        return {
          content: '',
          provider,
          success: false,
          error: errorMsg,
          latencyMs: Date.now() - startTime,
        };
      }
      
      // Espera antes de retry (exponential backoff)
      await new Promise(r => setTimeout(r, attempt * 1000));
    }
  }

  return {
    content: '',
    provider,
    success: false,
    error: 'Todas as tentativas falharam',
    latencyMs: Date.now() - startTime,
  };
}

// Gera conteúdo com fallback entre providers
export async function generateWithFallback(
  prompt: string,
  maxTokens: number = 1000,
  requestId?: string
): Promise<GenerationResult> {
  const providers: ('claude' | 'openai' | 'gemini')[] = ['claude', 'openai', 'gemini'];
  
  if (requestId) {
    console.log(`[${requestId}] Iniciando geração com fallback`);
  }

  for (const provider of providers) {
    const result = await tryProvider(provider, prompt, maxTokens);
    
    if (result.success) {
      if (requestId) {
        console.log(`[${requestId}] Sucesso com ${provider} em ${result.latencyMs}ms`);
      }
      return result;
    }
    
    if (requestId) {
      console.log(`[${requestId}] ${provider} falhou, tentando próximo...`);
    }
  }

  // Todos falharam
  const error = 'Todos os providers de IA falharam';
  if (requestId) {
    console.error(`[${requestId}] ${error}`);
  }
  
  return {
    content: '',
    provider: 'none',
    success: false,
    error,
    latencyMs: 0,
  };
}

// Gera múltiplos posts em paralelo com fallback
export async function generateBatchWithFallback(
  prompts: { day: string; platform: string; prompt: string }[],
  maxTokens: number = 1000,
  requestId?: string
): Promise<GenerationResult[]> {
  if (requestId) {
    console.log(`[${requestId}] Iniciando geração em lote: ${prompts.length} posts`);
  }

  // Gera todos em paralelo
  const promises = prompts.map(async ({ day, platform, prompt }) => {
    const result = await generateWithFallback(prompt, maxTokens, `${requestId}-${day}`);
    return {
      ...result,
      day,
      platform,
    };
  });

  const results = await Promise.all(promises);

  const successCount = results.filter(r => r.success).length;
  if (requestId) {
    console.log(`[${requestId}] Lote concluído: ${successCount}/${prompts.length} sucessos`);
  }

  return results;
}

// Verifica quais providers estão disponíveis
export function getAvailableProviders(): string[] {
  const available: string[] = [];
  
  if (process.env.ANTHROPIC_API_KEY) available.push('claude');
  if (process.env.OPENAI_API_KEY) available.push('openai');
  if (process.env.GEMINI_API_KEY) available.push('gemini');
  
  return available;
}

// Health check de todos os providers
export async function checkAIProvidersHealth(): Promise<Record<string, boolean>> {
  const health: Record<string, boolean> = {};
  
  const checks = [
    { name: 'claude', check: !!process.env.ANTHROPIC_API_KEY },
    { name: 'openai', check: !!process.env.OPENAI_API_KEY },
    { name: 'gemini', check: !!process.env.GEMINI_API_KEY },
  ];
  
  for (const { name, check } of checks) {
    health[name] = check;
  }
  
  return health;
}
