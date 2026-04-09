// Configuração centralizada da API Anthropic
export const AI_CONFIG = {
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 1000,
  timeout: 60000, // 60s para aguentar geração de múltiplos posts
};

// Delay helper para retry
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
