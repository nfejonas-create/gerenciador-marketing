import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { AuthRequest } from '../middleware/authGuard';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generatePost(req: AuthRequest, res: Response) {
  try {
    const { topic, platform, tone, product } = req.body;
    const prompt = `Crie um post profissional para ${platform || 'LinkedIn'} sobre o seguinte tema: "${topic}".
${product ? `O post deve promover o produto/servico: "${product}".` : ''}
Tom desejado: ${tone || 'profissional e engajador'}.
Inclua:
1. Texto principal do post (maximo 1300 caracteres para LinkedIn, 500 para Facebook)
2. CTA (chamada para acao) clara
3. 5 hashtags relevantes
Retorne em formato JSON: { "content": "...", "cta": "...", "hashtags": ["..."] }`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });
    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao gerar post' });
  }
}

export async function analyzeContent(req: AuthRequest, res: Response) {
  try {
    const { content } = req.body;
    const prompt = `Analise o seguinte conteudo para redes sociais e sugira melhorias:
"${content}"
Retorne JSON: { "score": 0-10, "strengths": ["..."], "improvements": ["..."], "rewritten": "..." }`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });
    return res.json(JSON.parse(completion.choices[0].message.content || '{}'));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function generateCalendar(req: AuthRequest, res: Response) {
  try {
    const { weeks = 4, platforms = ['linkedin', 'facebook'] } = req.body;
    const metrics = await prisma.metric.findMany({ where: { userId: req.userId! }, orderBy: { date: 'desc' }, take: 30 });
    const prompt = `Com base nas seguintes metricas de engajamento: ${JSON.stringify(metrics.slice(0, 10))},
crie um calendario de postagens para ${weeks} semanas nas plataformas: ${platforms.join(', ')}.
Retorne JSON: { "calendar": [{ "week": 1, "day": "Segunda", "platform": "linkedin", "topic": "...", "type": "..." }] }`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });
    return res.json(JSON.parse(completion.choices[0].message.content || '{}'));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function analyzeMaterial(req: AuthRequest, res: Response) {
  try {
    const { text, title } = req.body;
    const prompt = `Analise o seguinte material: "${title || 'Material'}"\n\n${text.substring(0, 3000)}\n\n
Identifique os principais temas com potencial de engajamento nas redes sociais.
Retorne JSON: { "themes": [{ "topic": "...", "potential": "alto/medio/baixo", "postIdeas": ["..."] }] }`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });
    return res.json(JSON.parse(completion.choices[0].message.content || '{}'));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getPosts(req: AuthRequest, res: Response) {
  const posts = await prisma.post.findMany({ where: { userId: req.userId! }, orderBy: { createdAt: 'desc' } });
  return res.json(posts);
}

export async function savePost(req: AuthRequest, res: Response) {
  try {
    const { platform, content, cta, hashtags, scheduledAt, status } = req.body;
    const post = await prisma.post.create({
      data: { userId: req.userId!, platform, content, cta, hashtags: hashtags?.join(' '), status: status || 'draft', scheduledAt: scheduledAt ? new Date(scheduledAt) : null },
    });
    return res.json(post);
  } catch {
    return res.status(500).json({ error: 'Erro ao salvar post' });
  }
}
