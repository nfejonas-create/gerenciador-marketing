import { Response } from 'express';
import { AuthRequest } from '../middleware/authGuard';
import OpenAI from 'openai';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function uploadMaterial(req: AuthRequest, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const { originalname, mimetype, buffer } = req.file;
    const { platform = 'linkedin', tone = 'profissional e engajador', quantity = '5' } = req.body;

    let extractedText = '';

    // Extrai texto conforme o tipo do arquivo
    if (mimetype === 'application/pdf') {
      const parsed = await pdfParse(buffer);
      extractedText = parsed.text?.substring(0, 6000) || '';
    } else if (mimetype === 'text/plain') {
      extractedText = buffer.toString('utf-8').substring(0, 6000);
    } else if (mimetype.startsWith('image/')) {
      // Para imagens: usa Vision do GPT-4 para extrair texto e contexto
      const base64 = buffer.toString('base64');
      const visionResp = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Descreva em detalhes o conteudo desta imagem. Se for um app ou produto, descreva funcionalidades, diferenciais e publico-alvo. Se tiver texto visivel, transcreva.' },
            { type: 'image_url', image_url: { url: `data:${mimetype};base64,${base64}`, detail: 'high' } },
          ],
        }],
        max_tokens: 1000,
      });
      extractedText = visionResp.choices[0].message.content || '';
    }

    if (!extractedText.trim()) {
      return res.status(422).json({ error: 'Nao foi possivel extrair conteudo do arquivo.' });
    }

    // Gera ideias de posts com GPT-4
    const prompt = `Voce e um especialista em marketing digital para ${platform}.
Analise o seguinte conteudo extraido do arquivo "${originalname}":

---
${extractedText}
---

Com base neste conteudo, gere exatamente ${quantity} ideias de posts para ${platform}.
Para cada post inclua:
- Texto completo pronto para publicar (otimizado para ${platform})
- CTA (chamada para acao)
- 5 hashtags relevantes
- Tema/angulo abordado

Tom: ${tone}

Retorne SOMENTE JSON valido neste formato:
{
  "summary": "resumo do material em 2 frases",
  "posts": [
    {
      "theme": "nome do tema",
      "content": "texto completo do post",
      "cta": "chamada para acao",
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    return res.json({
      filename: originalname,
      type: mimetype,
      extractedLength: extractedText.length,
      ...result,
    });
  } catch (err: any) {
    console.error('Erro no upload:', err.message);
    return res.status(500).json({ error: err.message || 'Erro ao processar arquivo.' });
  }
}
