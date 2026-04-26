// backend/src/controllers/knowledgeController.ts
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { AuthRequest } from '../middleware/authGuard';

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function extractFromFile(buffer: Buffer, mimetype: string): Promise<string> {
  const base64 = buffer.toString('base64');

  if (mimetype === 'application/pdf') {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          } as any,
          {
            type: 'text',
            text: 'Extraia e transcreva todo o conteudo tecnico deste documento. Mantenha titulos, topicos e informacoes tecnicas. Seja completo e preciso.',
          },
        ],
      }],
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  if (mimetype === 'text/plain') {
    return buffer.toString('utf-8').substring(0, 50000);
  }

  if (mimetype.startsWith('image/')) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimetype as 'image/jpeg' | 'image/png' | 'image/webp', data: base64 },
          },
          {
            type: 'text',
            text: 'Descreva detalhadamente o conteudo desta imagem. Se houver texto, transcreva-o. Se for diagrama eletrico, descreva os componentes e conexoes.',
          },
        ],
      }],
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  return '';
}

export async function listKnowledge(req: AuthRequest, res: Response) {
  const { tag, type } = req.query;
  const where: Record<string, unknown> = { userId: req.effectiveUserId!, active: true };
  if (type) where.type = type;
  if (tag) where.tags = { contains: tag as string };

  const items = await prisma.knowledgeBase.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, type: true, filename: true, tags: true, fileSize: true, createdAt: true, url: true },
  });
  return res.json(items);
}

export async function uploadToKnowledge(req: AuthRequest, res: Response) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const { title, tags } = req.body;
    const { originalname, mimetype, buffer, size } = req.file;

    const extractedContent = await extractFromFile(buffer, mimetype);

    if (!extractedContent.trim()) {
      return res.status(422).json({ error: 'Nao foi possivel extrair conteudo do arquivo.' });
    }

    const type = mimetype.startsWith('image/') ? 'image' : mimetype === 'application/pdf' ? 'pdf' : 'text';

    const item = await prisma.knowledgeBase.create({
      data: {
        userId: req.effectiveUserId!,
        title: title || originalname,
        type,
        content: extractedContent,
        filename: originalname,
        fileSize: size,
        tags: tags || '',
        active: true,
      },
    });

    return res.json({ id: item.id, title: item.title, type: item.type, extractedLength: extractedContent.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function addLinkToKnowledge(req: AuthRequest, res: Response) {
  try {
    const { url, title, description, tags } = req.body;
    if (!url) return res.status(400).json({ error: 'URL obrigatoria.' });

    const item = await prisma.knowledgeBase.create({
      data: {
        userId: req.effectiveUserId!,
        title: title || url,
        type: 'link',
        content: description || `Link: ${url}`,
        url,
        tags: tags || '',
        active: true,
      },
    });

    return res.json(item);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function searchKnowledgeForTopic(userId: string, topic: string): Promise<string> {
  const items = await prisma.knowledgeBase.findMany({
    where: { userId, active: true },
    select: { title: true, content: true, type: true, tags: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (!items.length) return '';

  const words = topic.toLowerCase().split(/\s+/);
  const scored = items.map(item => {
    const text = `${item.title} ${item.tags || ''}`.toLowerCase();
    const score = words.filter(w => text.includes(w)).length;
    return { ...item, score };
  }).sort((a, b) => b.score - a.score);

  const relevant = scored.slice(0, 3);
  if (!relevant.length || relevant[0].score === 0) {
    return items.slice(0, 2).map(i => `[${i.title}]\n${i.content.substring(0, 1500)}`).join('\n\n---\n\n');
  }

  return relevant.map(i => `[${i.title}]\n${i.content.substring(0, 2000)}`).join('\n\n---\n\n');
}

export async function deleteKnowledge(req: AuthRequest, res: Response) {
  const { id } = req.params;
  await prisma.knowledgeBase.updateMany({
    where: { id, userId: req.effectiveUserId! },
    data: { active: false },
  });
  return res.json({ ok: true });
}

export async function getKnowledgeItem(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const item = await prisma.knowledgeBase.findFirst({ where: { id, userId: req.effectiveUserId! } });
  if (!item) return res.status(404).json({ error: 'Nao encontrado' });
  return res.json(item);
}
