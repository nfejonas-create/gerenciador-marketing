import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { AuthRequest } from '../middleware/authGuard';
import { generateCarouselPDF } from '../services/carouselPdf';
import { searchKnowledgeForTopic } from './knowledgeController';
import { buildContentReference, buildUserSystemPrompt, getUserContentProfile } from '../services/userContentProfile';
import https from 'https';

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Gerar slides com IA ─────────────────────────────────────────────────────
export async function generateCarousel(req: AuthRequest, res: Response) {
  try {
    const { topic, count = 5, platform = 'linkedin' } = req.body;
    if (!topic) return res.status(400).json({ error: 'topic é obrigatório' });

    const profile = await getUserContentProfile(prisma, req.effectiveUserId!);

    // Base de conhecimento
    const kbContext = await searchKnowledgeForTopic(req.effectiveUserId!, topic).catch(() => '');

    const systemPrompt = buildUserSystemPrompt(
      profile,
      `Você é um especialista em criação de carrosséis para LinkedIn para ${profile.userName}. Crie conteúdo profissional, direto e de alto impacto.`,
    );

    const userPrompt = `Crie um carrossel profissional para LinkedIn sobre: "${topic}"

Número de slides: ${count} (mínimo 3, máximo 10)
${buildContentReference(profile)}
${kbContext ? `\nBASE DE CONHECIMENTO (use como fonte):\n${kbContext}\n` : ''}

REGRAS:
- Primeiro slide: CAPA (gancho forte, emoji impactante)
- Slides intermediários: CONTEÚDO (valor prático, 1 ponto por slide)
- Último slide: CTA (chamada para ação, engajamento)
- Cada slide deve ter emoji relevante ao conteúdo
- Linguagem profissional mas acessível
- Conteúdo progressivo (cada slide adiciona valor)

Retorne SOMENTE JSON válido (sem markdown, sem explicações):
{
  "slides": [
    {
      "type": "cover",
      "style": "cover",
      "emoji": "🎯",
      "title": "Título impactante da capa",
      "body": "Subtítulo que reforça o tema e cria expectativa"
    },
    {
      "type": "content",
      "style": "content",
      "emoji": "💡",
      "title": "Ponto principal do slide",
      "body": "Explicação concisa e prática em 2-3 frases. Foque em valor real."
    },
    {
      "type": "cta",
      "style": "cta",
      "emoji": "🚀",
      "title": "Chamada para ação",
      "body": "Instrução de engajamento clara e motivadora"
    }
  ]
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'IA não retornou JSON válido' });

    const parsed = JSON.parse(jsonMatch[0]);
    const slides = (parsed.slides || []).map((s: any, i: number) => ({
      id: `slide_${i + 1}_${Date.now()}`,
      type: s.type || (i === 0 ? 'cover' : i === parsed.slides.length - 1 ? 'cta' : 'content'),
      style: s.style || (i === 0 ? 'cover' : i === parsed.slides.length - 1 ? 'cta' : 'content'),
      emoji: s.emoji || '📌',
      title: s.title || '',
      body: s.body || '',
    }));

    return res.json({ slides });
  } catch (err: any) {
    console.error('[generateCarousel]', err);
    return res.status(500).json({ error: 'Erro ao gerar carrossel', details: err.message });
  }
}

// ─── Salvar carrossel ────────────────────────────────────────────────────────
export async function saveCarousel(req: AuthRequest, res: Response) {
  try {
    const { title, slides, status = 'draft', scheduledAt, platform = 'linkedin' } = req.body;
    if (!title || !slides) return res.status(400).json({ error: 'title e slides são obrigatórios' });

    const carousel = await prisma.carousel.create({
      data: {
        userId: req.effectiveUserId!,
        title,
        slides,
        status,
        platform,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    return res.json(carousel);
  } catch (err: any) {
    console.error('[saveCarousel]', err);
    return res.status(500).json({ error: 'Erro ao salvar', details: err.message });
  }
}

// ─── Listar carrosséis ───────────────────────────────────────────────────────
export async function listCarousels(req: AuthRequest, res: Response) {
  try {
    const carousels = await prisma.carousel.findMany({
      where: { userId: req.effectiveUserId! },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(carousels);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao listar', details: err.message });
  }
}

// ─── Atualizar carrossel ─────────────────────────────────────────────────────
export async function updateCarousel(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { title, slides, status, scheduledAt, publishedAt } = req.body;

    const existing = await prisma.carousel.findFirst({ where: { id, userId: req.effectiveUserId! } });
    if (!existing) return res.status(404).json({ error: 'Não encontrado' });

    const updated = await prisma.carousel.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(slides !== undefined && { slides }),
        ...(status !== undefined && { status }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
        ...(publishedAt !== undefined && { publishedAt: publishedAt ? new Date(publishedAt) : null }),
      },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao atualizar', details: err.message });
  }
}

// ─── Deletar carrossel ───────────────────────────────────────────────────────
export async function deleteCarousel(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const existing = await prisma.carousel.findFirst({ where: { id, userId: req.effectiveUserId! } });
    if (!existing) return res.status(404).json({ error: 'Não encontrado' });

    await prisma.carousel.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao deletar', details: err.message });
  }
}

// ─── Download PDF ─────────────────────────────────────────────────────────────
export async function downloadCarouselPdf(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const carousel = await prisma.carousel.findFirst({
      where: { id, userId: req.effectiveUserId! },
    });
    if (!carousel) return res.status(404).json({ error: 'Carrossel não encontrado' });

    const slides = (carousel.slides as any[]) || [];
    // Normaliza para o formato que carouselPdf.ts espera (campo slide: number)
    const normalizedSlides = slides.map((s: any, i: number) => ({
      slide: i + 1,
      emoji: s.emoji || '📌',
      title: s.title || '',
      body: s.body || '',
      style: s.style || 'content',
      imageUrl: s.imageUrl,
    }));
    const pdfBuffer = await generateCarouselPDF(normalizedSlides);

    const safeName = carousel.title.replace(/[^a-zA-Z0-9-_\s]/g, '').trim().replace(/\s+/g, '-') || 'carrossel';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err: any) {
    console.error('[downloadCarouselPdf]', err);
    return res.status(500).json({ error: 'Erro ao gerar PDF', details: err.message });
  }
}

// ─── Publicar no LinkedIn ────────────────────────────────────────────────────
export async function publishCarousel(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const carousel = await prisma.carousel.findFirst({
      where: { id, userId: req.effectiveUserId! },
    });
    if (!carousel) return res.status(404).json({ error: 'Carrossel não encontrado' });

    const linkedInAccount = await prisma.socialAccount.findFirst({
      where: { userId: req.effectiveUserId!, platform: 'linkedin' },
    });
    if (!linkedInAccount) {
      return res.status(400).json({ error: 'Conta LinkedIn não conectada' });
    }

    // Obter person ID
    const personId = await new Promise<string>((resolve, reject) => {
      const r = https.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${linkedInAccount.accessToken}` },
      }, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try { resolve(JSON.parse(data).sub); } catch (e) { reject(e); }
        });
      });
      r.on('error', reject);
    });

    const authorUrn = `urn:li:person:${personId}`;
    const firstSlide = (carousel.slides as any[])[0];
    const text = `${firstSlide?.emoji || '📊'} ${carousel.title}\n\n${firstSlide?.body || ''}`;

    // Publicar post
    const postId = await new Promise<string>((resolve, reject) => {
      const postData = JSON.stringify({
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      });

      const request = https.request({
        hostname: 'api.linkedin.com',
        path: '/v2/ugcPosts',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${linkedInAccount.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }, (response) => {
        console.log('[LinkedIn] Status:', response.statusCode);
        resolve((response.headers['x-restli-id'] as string) || '');
      });

      request.on('error', reject);
      request.write(postData);
      request.end();
    });

    const updated = await prisma.carousel.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date(), linkedinUrn: postId },
    });

    return res.json({ ok: true, carousel: updated, linkedInPostUrn: postId });
  } catch (err: any) {
    console.error('[publishCarousel]', err);
    return res.status(500).json({ error: 'Erro ao publicar', details: err.message });
  }
}
