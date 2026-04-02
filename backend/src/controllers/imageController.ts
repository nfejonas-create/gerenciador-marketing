// backend/src/controllers/imageController.ts
import { Response } from 'express';
import OpenAI from 'openai';
import { AuthRequest } from '../middleware/authGuard';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildPrompt(topic: string, platform: string): string {
  const t = (topic || '').toLowerCase();
  let subject = 'industrial electrical control panel with cables and circuit breakers';

  if (t.includes('motor')) subject = 'three-phase electric motor in industrial setting, copper windings visible';
  else if (t.includes('contator') || t.includes('rele')) subject = 'industrial contactors and relay modules on DIN rail inside control panel';
  else if (t.includes('sensor') || t.includes('fim de curso')) subject = 'industrial limit switch sensor on metal machinery, close-up';
  else if (t.includes('painel') || t.includes('quadro')) subject = 'open industrial electrical panel with organized cables, busbars and circuit breakers';
  else if (t.includes('cabo') || t.includes('fiacao')) subject = 'organized industrial cable tray with color-coded wires in factory';
  else if (t.includes('grao') || t.includes('silo') || t.includes('armazen')) subject = 'grain storage silo with industrial electrical automation panel nearby';
  else if (t.includes('automac')) subject = 'PLC automation panel with digital displays and industrial wiring';
  else if (t.includes('nr10') || t.includes('seguranca')) subject = 'electrical safety equipment: insulated gloves, voltage tester, safety signage';
  else if (t.includes('inversor') || t.includes('frequencia')) subject = 'variable frequency drive VFD installed in industrial control cabinet';

  const size = platform === 'linkedin' ? 'landscape 1200x627' : 'square 1080x1080';
  return `Professional industrial photography: ${subject}. Dark blue and orange color palette, dramatic lighting, sharp focus, photorealistic. No text, no logos, no visible human faces. Clean composition for ${platform} social media post, ${size} format.`;
}

export async function generatePostImage(req: AuthRequest, res: Response) {
  try {
    const { topic, platform = 'linkedin' } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'OPENAI_API_KEY nao configurada.' });
    }

    const imagePrompt = buildPrompt(topic || '', platform);
    const size = platform === 'linkedin' ? '1792x1024' : '1024x1024';

    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: size as '1024x1024' | '1792x1024',
      quality: 'standard',
    });

    return res.json({
      imageUrl: imageResponse.data?.[0]?.url ?? null,
      prompt: imagePrompt,
      revisedPrompt: imageResponse.data?.[0]?.revised_prompt ?? null,
    });
  } catch (err: any) {
    const msg = err?.error?.message || err?.message || 'Erro ao gerar imagem';
    return res.status(500).json({ error: msg });
  }
}

export async function generateImageOptions(req: AuthRequest, res: Response) {
  return res.json({ options: [] });
}
