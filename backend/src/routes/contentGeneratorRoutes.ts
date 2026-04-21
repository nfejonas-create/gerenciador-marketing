import { Router, Response } from 'express';
import { authGuard, AuthRequest } from '../middleware/authGuard';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  fetchGoogleNewsSuggestions,
  fetchNewsApiSuggestions,
  saveSuggestions,
  getCachedSuggestions,
} from '../services/suggestionsService';
import {
  generateContent,
  saveGeneratedContent,
} from '../services/contentGeneratorService';
import {
  schedulePost,
  cancelJob,
  reloadJobsOnStartup,
} from '../services/contentScheduler';

dayjs.extend(utc);

const router = Router();
const prisma = new PrismaClient();

// Todas as rotas precisam de autenticação
router.use(authGuard);

// GET /content/suggestions?source=google|linkedin&date=YYYY-MM-DD
router.get('/suggestions', async (req: AuthRequest, res: Response) => {
  try {
    const { source = 'google', date } = req.query as { source: 'google' | 'linkedin'; date?: string };
    const targetDate = date || dayjs.utc().subtract(1, 'day').format('YYYY-MM-DD');
    const userId = req.effectiveUserId!;
    
    // Buscar configurações do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });
    const settings = (user?.settings as any) || {};
    const niche = settings.niche || 'eletricista instalação elétrica NBR 5410';
    
    // Verificar cache primeiro
    const cached = await getCachedSuggestions(userId, source, targetDate);
    if (cached.length > 0) {
      return res.json({ source, date: targetDate, suggestions: cached, fromCache: true });
    }
    
    // Buscar da fonte externa
    let suggestions;
    if (source === 'google') {
      suggestions = await fetchGoogleNewsSuggestions(niche, targetDate);
    } else {
      const apiKey = process.env.NEWSAPI_KEY || '';
      suggestions = await fetchNewsApiSuggestions(niche, targetDate, apiKey);
    }
    
    // Salvar no banco
    await saveSuggestions(userId, source, suggestions);
    
    res.json({ source, date: targetDate, suggestions, fromCache: false });
  } catch (err: any) {
    console.error('[GET /suggestions]', err);
    res.status(500).json({ error: 'Erro ao buscar sugestões', details: err.message });
  }
});

// POST /content/generate
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    const { suggestionId, source, template = 'post' } = req.body;
    const userId = req.effectiveUserId!;
    
    if (!suggestionId) {
      return res.status(400).json({ error: 'suggestionId é obrigatório' });
    }
    
    // Buscar sugestão
    const suggestion = await prisma.contentSuggestion.findFirst({
      where: { id: suggestionId, userId },
    });
    
    if (!suggestion) {
      return res.status(404).json({ error: 'Sugestão não encontrada' });
    }
    
    // Gerar conteúdo
    const result = await generateContent(userId, {
      headline: suggestion.headline,
      snippet: suggestion.snippet || '',
      template,
    });
    
    // Salvar
    const saved = await saveGeneratedContent(userId, suggestionId, result, template);
    
    // Marcar sugestão como usada
    await prisma.contentSuggestion.update({
      where: { id: suggestionId },
      data: { usedAt: new Date() },
    });
    
    res.json({
      id: saved.id,
      text: result.text,
      hashtags: result.hashtags,
      readTime: result.readTime,
      template,
    });
  } catch (err: any) {
    console.error('[POST /generate]', err);
    res.status(500).json({ error: 'Erro ao gerar conteúdo', details: err.message });
  }
});

// POST /content/schedule
router.post('/schedule', async (req: AuthRequest, res: Response) => {
  try {
    const { contentId, publishAt, recurrence = 'none', platform = 'linkedin' } = req.body;
    const userId = req.effectiveUserId!;
    
    if (!contentId || !publishAt) {
      return res.status(400).json({ error: 'contentId e publishAt são obrigatórios' });
    }
    
    // Buscar conteúdo
    const content = await prisma.generatedContent.findFirst({
      where: { id: contentId, userId },
    });
    
    if (!content) {
      return res.status(404).json({ error: 'Conteúdo não encontrado' });
    }
    
    // Buscar conta LinkedIn
    const socialAccount = await prisma.socialAccount.findFirst({
      where: { userId, platform },
    });
    
    if (!socialAccount) {
      return res.status(400).json({ error: `Conta ${platform} não conectada` });
    }
    
    // Criar agendamento no banco
    const scheduled = await prisma.scheduledPost.create({
      data: {
        userId,
        contentId,
        publishAt: new Date(publishAt),
        recurrence,
        platform,
        status: 'scheduled',
      },
    });
    
    // Calcular expressão cron
    const publishDate = dayjs(publishAt);
    const cronExpr = recurrence === 'daily'
      ? `${publishDate.minute()} ${publishDate.hour()} * * *`
      : `${publishDate.minute()} ${publishDate.hour()} ${publishDate.date()} ${publishDate.month() + 1} *`;
    
    // Agendar job
    const timezone = process.env.CRON_TIMEZONE || 'America/Sao_Paulo';
    await schedulePost(scheduled.id, cronExpr, content.text, socialAccount.accessToken, timezone);
    
    res.json({
      id: scheduled.id,
      publishAt,
      recurrence,
      platform,
      status: 'scheduled',
      nextRun: recurrence === 'daily' 
        ? `Todo dia às ${publishDate.format('HH:mm')}`
        : publishDate.format('DD/MM/YYYY HH:mm'),
    });
  } catch (err: any) {
    console.error('[POST /schedule]', err);
    res.status(500).json({ error: 'Erro ao agendar', details: err.message });
  }
});

// GET /content/scheduled
router.get('/scheduled', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.effectiveUserId!;
    
    const scheduled = await prisma.scheduledPost.findMany({
      where: { userId },
      include: {
        content: {
          include: {
            suggestion: {
              select: { source: true, headline: true },
            },
          },
        },
      },
      orderBy: { publishAt: 'asc' },
    });
    
    res.json(scheduled.map(s => ({
      id: s.id,
      content: s.content.text.substring(0, 100) + '...',
      source: s.content.suggestion?.source || 'unknown',
      headline: s.content.suggestion?.headline || '',
      publishAt: s.publishAt,
      recurrence: s.recurrence,
      platform: s.platform,
      status: s.status,
      lastRunAt: s.lastRunAt,
    })));
  } catch (err: any) {
    console.error('[GET /scheduled]', err);
    res.status(500).json({ error: 'Erro ao listar agendamentos', details: err.message });
  }
});

// DELETE /content/scheduled/:id
router.delete('/scheduled/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.effectiveUserId!;
    
    const scheduled = await prisma.scheduledPost.findFirst({
      where: { id, userId },
    });
    
    if (!scheduled) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    await cancelJob(id);
    
    res.json({ ok: true, message: 'Agendamento cancelado' });
  } catch (err: any) {
    console.error('[DELETE /scheduled]', err);
    res.status(500).json({ error: 'Erro ao cancelar', details: err.message });
  }
});

// PATCH /content/scheduled/:id (atualizar data)
router.patch('/scheduled/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { publishAt, recurrence } = req.body;
    const userId = req.effectiveUserId!;
    
    const scheduled = await prisma.scheduledPost.findFirst({
      where: { id, userId },
      include: { content: true },
    });
    
    if (!scheduled) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    // Cancelar job antigo
    await cancelJob(id);
    
    // Atualizar no banco
    const updated = await prisma.scheduledPost.update({
      where: { id },
      data: {
        ...(publishAt && { publishAt: new Date(publishAt) }),
        ...(recurrence && { recurrence }),
        status: 'scheduled',
      },
    });
    
    // Reagendar se tiver nova data
    if (publishAt) {
      const socialAccount = await prisma.socialAccount.findFirst({
        where: { userId, platform: scheduled.platform },
      });
      
      if (socialAccount) {
        const publishDate = dayjs(publishAt);
        const cronExpr = recurrence === 'daily'
          ? `${publishDate.minute()} ${publishDate.hour()} * * *`
          : `${publishDate.minute()} ${publishDate.hour()} ${publishDate.date()} ${publishDate.month() + 1} *`;
        
        const timezone = process.env.CRON_TIMEZONE || 'America/Sao_Paulo';
        await schedulePost(id, cronExpr, scheduled.content.text, socialAccount.accessToken, timezone);
      }
    }
    
    res.json({ ok: true, scheduled: updated });
  } catch (err: any) {
    console.error('[PATCH /scheduled]', err);
    res.status(500).json({ error: 'Erro ao atualizar', details: err.message });
  }
});

export default router;
export { reloadJobsOnStartup };
