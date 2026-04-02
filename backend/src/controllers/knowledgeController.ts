// backend/src/controllers/knowledgeController.ts
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { AuthRequest } from '../middleware/authGuard';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParseLib = require('pdf-parse');
const pdfParse = pdfParseLib.default || pdfParseLib;

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function listKnowledge(req: AuthRequest, res: Response) {
  const { tag, type } = req.query;
  const where: Record<string, unknown> = { userId: req.userId!, active: true };
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

    let extractedContent = '';

    if (mimetype === 'application/pdf') {
      const parsed = await pdfParse(buffer);
      extractedContent = parsed.text?.substring(0, 50000) || '';
    } else if (mimetype === 'text/plain') {
      extractedContent = buffer.toString('utf-8').substring(0, 50000);
    } else if (mimetype.startsWith('image/')) {
      const base64 = buffer.toString('base64');
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
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
              text: 'Voce e um assistente do Manual do Eletricista. Descreva detalhadamente o conteudo desta imagem. Se houver texto, transcreva-o. Se for um diagrama eletrico, esquema ou foto de instalacao, descreva os componentes, conexoes e o que esta sendo mostrado. Seja tecnico e preciso.',
            },
          ],
        }],
      });
      extractedContent = response.content[0].type === 'text' ? response.content[0].text : '';
    }

    if (!extractedContent.trim()) {
      return res.status(422).json({ error: 'Nao foi possivel extrair conteudo do arquivo.' });
    }

    const item = await prisma.knowledgeBase.create({
      data: {
        userId: req.userId!,
        title: title || originalname,
        type: mimetype.startsWith('image/') ? 'image' : mimetype === 'application/pdf' ? 'pdf' : 'text',
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
        userId: req.userId!,
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
    where: { id, userId: req.userId! },
    data: { active: false },
  });
  return res.json({ ok: true });
}

export async function getKnowledgeItem(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const item = await prisma.knowledgeBase.findFirst({ where: { id, userId: req.userId! } });
  if (!item) return res.status(404).json({ error: 'Nao encontrado' });
  return res.json(item);
}
