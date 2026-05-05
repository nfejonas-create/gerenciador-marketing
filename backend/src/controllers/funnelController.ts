import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { AuthRequest } from '../middleware/authGuard';
import { buildContentReference, getUserContentProfile } from '../services/userContentProfile';
import { getKnowledgeReferenceForUser } from './knowledgeController';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getProducts(req: AuthRequest, res: Response) {
  const products = await prisma.product.findMany({ where: { userId: req.effectiveUserId! } });
  return res.json(products);
}

export async function createProduct(req: AuthRequest, res: Response) {
  try {
    const { name, type, url, price } = req.body;
    const product = await prisma.product.create({ data: { userId: req.effectiveUserId!, name, type, url, price } });
    return res.json(product);
  } catch {
    return res.status(500).json({ error: 'Erro ao criar produto' });
  }
}

export async function deleteProduct(req: AuthRequest, res: Response) {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Erro ao excluir produto' });
  }
}

export async function getFunnelSuggestions(req: AuthRequest, res: Response) {
  try {
    const products = await prisma.product.findMany({ where: { userId: req.effectiveUserId! } });
    const metrics = await prisma.metric.findMany({ where: { userId: req.effectiveUserId! }, orderBy: { date: 'desc' }, take: 10 });
    const profile = await getUserContentProfile(prisma, req.effectiveUserId!);
    const kbContext = await getKnowledgeReferenceForUser(req.effectiveUserId!, 4);
    if (products.length === 0) return res.json({ suggestions: [] });
    const prompt = `Com base nas metricas de engajamento: ${JSON.stringify(metrics)}
e nos produtos: ${JSON.stringify(products)},
${buildContentReference(profile)}
${kbContext ? `\nBASE DE CONHECIMENTO DO USUARIO:\n${kbContext}\n` : ''}

sugira CTAs inteligentes para cada produto com base no comportamento do publico.
Retorne JSON: { "suggestions": [{ "productId": "...", "productName": "...", "cta": "...", "platform": "linkedin|facebook", "strategy": "..." }] }`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });
    return res.json(JSON.parse(completion.choices[0].message.content || '{"suggestions":[]}'));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
