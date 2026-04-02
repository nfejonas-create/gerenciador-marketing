// backend/src/controllers/imageController.ts
import { Response } from 'express';
import axios from 'axios';
import { AuthRequest } from '../middleware/authGuard';

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

  return `Professional industrial photography: ${subject}. Dark blue and orange color palette, dramatic studio lighting, sharp focus, photorealistic, high quality. No text, no logos, no visible human faces. Clean professional composition for social media.`;
}

export async function generatePostImage(req: AuthRequest, res: Response) {
  try {
    const { topic, platform = 'linkedin' } = req.body;

    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'STABILITY_API_KEY nao configurada.' });

    const prompt = buildPrompt(topic || '', platform);
    const aspectRatio = platform === 'linkedin' ? '16:9' : '1:1';

    const form = new FormData();
    form.append('prompt', prompt);
    form.append('aspect_ratio', aspectRatio);
    form.append('output_format', 'jpeg');

    const response = await axios.post(
      'https://api.stability.ai/v2beta/stable-image/generate/core',
      form,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'image/*',
        },
        responseType: 'arraybuffer',
        timeout: 60000,
      }
    );

    const base64 = Buffer.from(response.data).toString('base64');
    const imageUrl = `data:image/jpeg;base64,${base64}`;

    return res.json({ imageUrl, prompt });
  } catch (err: any) {
    const msg = err?.response?.data
      ? Buffer.from(err.response.data).toString('utf-8')
      : err?.message || 'Erro ao gerar imagem';
    return res.status(500).json({ error: msg });
  }
}

export async function generateImageOptions(req: AuthRequest, res: Response) {
  return res.json({ options: [] });
}
