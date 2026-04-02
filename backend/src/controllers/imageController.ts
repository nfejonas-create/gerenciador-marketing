// backend/src/controllers/imageController.ts
import { Response } from 'express';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AuthRequest } from '../middleware/authGuard';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generatePostImage(req: AuthRequest, res: Response) {
  try {
    const { postContent, topic, platform = 'linkedin' } = req.body;

    const promptResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Crie um prompt em ingles para DALL-E 3 gerar uma imagem profissional para o Manual do Eletricista.
TEMA: ${topic || postContent?.substring(0, 200)}
PLATAFORMA: ${platform}
REGRAS: Estilo fotografico realista, relacionado a eletricidade industrial, paineis, cabos, equipamentos. Cores: azul escuro, cinza, laranja. SEM texto na imagem. SEM pessoas identificaveis. Composicao limpa para redes sociais. Formato ${platform === 'linkedin' ? '1200x627px landscape' : '1080x1080px square'}.
Retorne SOMENTE o prompt em ingles.`,
      }],
    });

    const imagePrompt = promptResponse.content[0].type === 'text'
      ? promptResponse.content[0].text.trim()
      : 'Professional electrical installation, industrial control panel, blue and orange color scheme, photorealistic';

    const size = platform === 'linkedin' ? '1792x1024' : '1024x1024';

    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: size as '1024x1024' | '1792x1024',
      quality: 'standard',
    });

    return res.json({
      imageUrl: imageResponse.data[0].url,
      prompt: imagePrompt,
      size,
      revisedPrompt: imageResponse.data[0].revised_prompt,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao gerar imagem' });
  }
}

export async function generateImageOptions(req: AuthRequest, res: Response) {
  try {
    const { topic } = req.body;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Crie 3 prompts diferentes em ingles para DALL-E 3 sobre o tema: "${topic}". Cada prompt deve ser uma abordagem visual diferente, SEM texto na imagem, relacionado a eletricidade industrial.
Retorne JSON: { "options": [{ "label": "Foto realista", "prompt": "..." }, { "label": "Ilustracao tecnica", "prompt": "..." }, { "label": "Close-up industrial", "prompt": "..." }] }`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return res.json(JSON.parse(text.replace(/```json|```/g, '').trim()));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
