import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { AuthRequest } from '../middleware/authGuard';
import { generateCarouselPDF } from '../services/carouselPdf';
import { uploadDocumentToLinkedIn, createLinkedInDocumentPost } from '../services/linkedinPublish';

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateCarousel(req: AuthRequest, res: Response) {
  try {
    const { topic, platform = 'linkedin', count = 5, kbIds } = req.body;

    // Buscar dados do usuario e instrucoes personalizadas
    let userAiInstructions = '';
    let userName = 'Usuario';
    let userNiche = 'geral';
    try {
      const userRecord = await prisma.user.findUnique({ 
        where: { id: req.effectiveUserId! }, 
        select: { name: true, settings: true } 
      });
      userName = userRecord?.name?.split(' ')[0] || 'Usuario';
      const settings = (userRecord?.settings as any) || {};
      userAiInstructions = settings.generatorInstructions || settings.aiInstructions || '';
      userNiche = settings.niche || 'geral';
    } catch {}

    // Buscar contexto da base de conhecimento
    let kbContext = '';
    if (kbIds && Array.isArray(kbIds) && kbIds.length > 0) {
      const items = await prisma.knowledgeBase.findMany({
        where: { id: { in: kbIds }, userId: req.effectiveUserId! },
        select: { title: true, content: true },
      });
      kbContext = items.map(i => `## ${i.title}\n${i.content?.substring(0, 1500) || ''}`).join('\n\n');
    }

    // Buscar base de conhecimento ativa se nao especificou kbIds
    if (!kbContext) {
      const activeItems = await prisma.knowledgeBase.findMany({
        where: { userId: req.effectiveUserId!, active: true },
        select: { title: true, content: true },
        take: 3,
      });
      kbContext = activeItems.map(i => `## ${i.title}\n${i.content?.substring(0, 1500) || ''}`).join('\n\n');
    }

    const prompt = `Voce e um especialista em criacao de conteudo para ${platform}.

NICHO DO USUARIO: ${userNiche}

INSTRUCOES DA IA DO USUARIO:
${userAiInstructions || 'Crie conteudo profissional, direto e focado em gerar autoridade e conversao.'}

${kbContext ? `BASE DE CONHECIMENTO DO USUARIO:\n${kbContext}\n\n` : ''}

TAREFA: Gere um carrossel de ${count} slides sobre "${topic}" para ${platform}.

REGRAS IMPORTANTES:
- Use o nicho e as instrucoes do usuario como base
- Nunca misture conteudos de outros usuarios
- Cada slide deve ser autonomo mas fazer parte da narrativa
- Foco em: problema -> solucao -> CTA

FORMATO DE RESPOSTA - JSON apenas:
[
  {"slide": 1, "emoji": "🎯", "title": "Gancho forte", "body": "Texto impactante", "style": "cover"},
  {"slide": 2, "emoji": "💡", "title": "Ponto 1", "body": "Explicacao", "style": "content"},
  ...
]

ESTILOS:
- cover: primeiro slide, gancho forte
- content: slides do meio, conteudo educativo
- cta: ultimo slide, chamada para acao

Responda APENAS com o JSON valido.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const slides = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return res.json({ 
      slides, 
      count: slides.length,
      meta: {
        user: userName,
        niche: userNiche,
        kbUsed: kbContext ? true : false,
      }
    });
  } catch (err: any) {
    console.error('[generateCarousel]', err);
    return res.status(500).json({ error: 'Erro ao gerar carrossel' });
  }
}

export async function saveCarousel(req: AuthRequest, res: Response) {
  try {
    const { title, slides, platform = 'linkedin', status = 'draft', scheduledAt } = req.body;
    
    const carousel = await prisma.carousel.create({
      data: {
        userId: req.effectiveUserId!,
        title,
        slides,
        platform,
        status,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    return res.json(carousel);
  } catch (err: any) {
    console.error('[saveCarousel]', err);
    return res.status(500).json({ error: 'Erro ao salvar carrossel' });
  }
}

export async function listCarousels(req: AuthRequest, res: Response) {
  try {
    const carousels = await prisma.carousel.findMany({
      where: { userId: req.effectiveUserId! },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(carousels);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao listar carrosséis' });
  }
}

export async function updateCarousel(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { title, slides, status, scheduledAt } = req.body;

    const existing = await prisma.carousel.findFirst({
      where: { id, userId: req.effectiveUserId! },
    });
    if (!existing) return res.status(404).json({ error: 'Carrossel não encontrado' });

    const carousel = await prisma.carousel.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(slides && { slides }),
        ...(status && { status }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
      },
    });

    return res.json(carousel);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao atualizar carrossel' });
  }
}

export async function deleteCarousel(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    
    const existing = await prisma.carousel.findFirst({
      where: { id, userId: req.effectiveUserId! },
    });
    if (!existing) return res.status(404).json({ error: 'Carrossel não encontrado' });

    await prisma.carousel.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao deletar carrossel' });
  }
}

export async function publishCarousel(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    
    const carousel = await prisma.carousel.findFirst({
      where: { id, userId: req.effectiveUserId! },
    });
    if (!carousel) return res.status(404).json({ error: 'Carrossel não encontrado' });

    // Buscar conta LinkedIn do usuário
    const linkedInAccount = await prisma.socialAccount.findFirst({
      where: { userId: req.effectiveUserId!, platform: 'linkedin' },
    });
    if (!linkedInAccount) {
      return res.status(400).json({ error: 'Conta LinkedIn não conectada' });
    }

    // Gerar PDF
    const pdfBuffer = await generateCarouselPDF(carousel.slides as any[]);

    // Upload para LinkedIn
    const assetUrn = await uploadDocumentToLinkedIn(
      { accessToken: linkedInAccount.accessToken, pageId: linkedInAccount.pageId || undefined },
      pdfBuffer,
      carousel.title
    );

    // Criar post no LinkedIn
    const firstSlide = (carousel.slides as any[])[0];
    const postText = `${firstSlide?.title || carousel.title}\n\n${firstSlide?.body || ''}`;
    
    const linkedInPostUrn = await createLinkedInDocumentPost(
      { accessToken: linkedInAccount.accessToken, pageId: linkedInAccount.pageId || undefined },
      assetUrn,
      postText,
      carousel.title
    );

    // Atualizar carrossel como publicado
    const updated = await prisma.carousel.update({
      where: { id },
      data: { 
        status: 'published', 
        publishedAt: new Date(),
        linkedinUrn: linkedInPostUrn,
      },
    });

    return res.json({ 
      ok: true, 
      carousel: updated,
      linkedInPostUrn,
    });
  } catch (err: any) {
    console.error('[publishCarousel]', err);
    return res.status(500).json({ error: 'Erro ao publicar carrossel', details: err.message });
  }
}
