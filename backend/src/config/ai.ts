// Configuração centralizada da API Anthropic
export const AI_CONFIG = {
  model: 'claude-3-sonnet-20240229',
  maxTokens: 1000,
  timeout: 25000, // 25s por chamada
};

// Delay helper para retry
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
