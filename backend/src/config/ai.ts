// Configuração centralizada da API Anthropic
export const AI_CONFIG = {
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 1000,
  timeout: 25000, // 25s por chamada
};

// Delay helper para retry
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
