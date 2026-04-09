import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG, delay } from '../config/ai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function callAnthropic(prompt: string, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await anthropic.messages.create({
        model: AI_CONFIG.model,
        max_tokens: AI_CONFIG.maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });
      return response;
    } catch (error: any) {
      console.error(`Anthropic error (attempt ${i + 1}):`, error.message);
      
      // Retry apenas para rate limit (429) ou erros de servidor (5xx)
      if ((error.status === 429 || error.status >= 500) && i < retries) {
        const waitTime = 1000 * Math.pow(2, i); // Exponential backoff
        console.log(`Retrying in ${waitTime}ms...`);
        await delay(waitTime);
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
}
