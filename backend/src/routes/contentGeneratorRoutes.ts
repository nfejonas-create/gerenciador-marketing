import { Router, Response } from 'express';
import { authGuard, AuthRequest } from '../middleware/authGuard';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
    fetchGoogleNewsSuggestions,
    fetchLinkedInNewsSuggestions,
    fetchNewsApiSuggestions,
    saveSuggestions,
    getCachedSuggestions,
    getSuggestionsByUrls,
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

// Todas as rotas precisam de autenticacao
router.use(authGuard);

// GET /content/suggestions?source=google|linkedin&date=YYYY-MM-DD
router.get('/suggestions', async (req: AuthRequest, res: Response) => {
    try {
          const { source = 'google', date } = req.query as { source: 'google' | 'linkedin'; date?: string };
          const targetDate = date || dayjs.utc().subtract(1, 'day').format('YYYY-MM-DD');
          const userId = req.effectiveUserId!;

      // Buscar configuracoes do usuario
      const user = await prisma.user.findUnique({
              where: { id: userId },
              select: { settings: true },
      });
          const settings = (user?.settings as any) || {};
          const niche = settings.niche || 'eletricista instalacao eletrica NBR 5410';

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
                  suggestions = await fetchLinkedInNewsSuggestions(niche, targetDate);
          }

      // Salvar no banco
      await saveSuggestions(userId, source, suggestions);

      // Buscar do banco para retornar com IDs
      const urls = suggestions.map((s) => s.url);
          const withIds = await getSuggestionsByUrls(userId, source, urls);

      res.json({ source, date: targetDate, suggestions: withIds, fromCache: false });
    } catch (err: any) {
    console.error('[GET /suggestions]', err);
          73
              , details: err.message });
    }
});

// POST /content/generate - Gera conteúdo e SEMPRE salva em rascunho/histórico
router.post('/generate', async (req: AuthRequest, res: Response) => {
      try {
              const { suggestionId, template = 'post' } = req.body;
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

              // Gerar conteúdo com IA
              const result = await generateContent(userId, {
                        headline: suggestion.headline,
                        snippet: suggestion.snippet || '',
                        template,
              });

              // ✅ SALVAR SEMPRE EM RASCUNHO/HISTÓRICO
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
                        status: 'rascunho', // Sempre começa como rascunho
              });
      } catch (err: any) {
              console.error('[POST /generate]', err);
              res.status(500).json({ error: 'Erro ao gerar conteúdo', details: err.message });
      }
});

// POST /content/generate
router.post('/generate', async (req: AuthRequest, res: Response) => {
    try {
          const { suggestionId, source, template = 'post' } = req.body;
          const userId = req.effectiveUserId!;

      if (!suggestionId) {
              return res.status(400).json({ error: 'suggestionId e obrigatorio' });
      }

      // Buscar sugestao
      const suggestion = await prisma.contentSuggestion.findFirst({
              where: { id: suggestionId, userId },
      });

      if (!suggestion) {
              return res.status(404).json({ error: 'Sugestao nao encontrada' });
      }

      // Gerar conteudo
      const result = await generateContent(userId, {
              headline: suggestion.headline,
              snippet: suggestion.snippet || '',
              template,
      });

      // Salvar
      const saved = await saveGeneratedContent(userId, suggestionId, result, template);

      // Marcar sugestao como usada
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
          res.status(500).json({ error: 'Erro ao gerar conteudo', details: err.message });
    }
});

// POST /content/schedule
router.post('/schedule', async (req: AuthRequest, res: Response) => {
    try {
          const { contentId, publishAt, recurrence = 'none', platform = 'linkedin' } = req.body;
          const userId = req.effectiveUserId!;

      if (!contentId || !publishAt) {
              return res.status(400).json({ error: 'contentId e publishAt sao obrigatorios' });
      }

      // Buscar conteudo
      const content = await prisma.generatedContent.findFirst({
              where: { id: contentId, userId },
      });

      if (!content) {
              return res.status(404).json({ error: 'Conteudo nao encontrado' });
      }

      // Buscar conta LinkedIn (opcional - se nao tiver, agendamento fica como manual)
      const socialAccount = await prisma.socialAccount.findFirst({
              where: { userId, platform },
      });

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

      // Agendar job apenas se tiver conta conectada
      if (socialAccount) {
              const publishDate = dayjs(publishAt);
              const cronExpr =
                        recurrence === 'daily'
                  ? `${publishDate.minute()} ${publishDate.hour()} * * *`
                          : `${publishDate.minute()} ${publishDate.hour()} ${publishDate.date()} ${publishDate.month() + 1} *`;

            const timezone = process.env.CRON_TIMEZONE || 'America/Sao_Paulo';
              await schedulePost(scheduled.id, cronExpr, content.text, socialAccount.accessToken, timezone);
      }

      const publishDate = dayjs(publishAt);
          res.json({
                  id: scheduled.id,
                  publishAt,
                  recurrence,
                  platform,
                  status: 'scheduled',
                  linkedinConnected: !!socialAccount,
                  nextRun:
                            recurrence === 'daily'
                      ? `Todo dia as ${publishDate.format('HH:mm')}`
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

      res.json(
              scheduled.map((s) => ({
                        id: s.id,
                        content: s.content.text.substring(0, 100) + '...',
                        source: s.content.suggestion?.source || 'unknown',
                        headline: s.content.suggestion?.headline || '',
                        publishAt: s.publishAt,
                        recurrence: s.recurrence,
                        platform: s.platform,
                        status: s.status,
                        lastRunAt: s.lastRunAt,
              })),
            );
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
              return res.status(404).json({ error: 'Agendamento nao encontrado' });
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
              return res.status(404).json({ error: 'Agendamento nao encontrado' });
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

      // Reagendar se tiver nova data e conta conectada
      if (publishAt) {
              const socialAccount = await prisma.socialAccount.findFirst({
                        where: { userId, platform: scheduled.platform },
              });

            if (socialAccount) {
                      const publishDate = dayjs(publishAt);
                      const cronExpr =
                                  recurrence === 'daily'
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


// ======================== HISTÓRICO / RASCUNHO ========================
// GET /content/history - Lista todos os rascunhos/conteúdo gerado
router.get('/history', async (req: AuthRequest, res: Response) => {
      try {
              const userId = req.effectiveUserId!;
              const { status = 'rascunho' } = req.query as { status?: string };

        const contents = await prisma.generatedContent.findMany({
                  where: { userId, status },
                  include: {
                              suggestion: {
                                            select: { headline: true, source: true },
                              },
                  },
                  orderBy: { createdAt: 'desc' },
        });

        res.json(contents);
      } catch (err: any) {
    console.error('[GET /history]', err);
              res.status(500).json({ error: 'Erro ao listar histórico', details: err.message });
      }
});

// GET /content/history/:id - Busca um rascunho específico
router.get('/history/:id', async (req: AuthRequest, res: Response) => {
      try {
              const { id } = req.params;
              const userId = req.effectiveUserId!;

        const content = await prisma.generatedContent.findFirst({
                  where: { id, userId },
        });

        if (!content) {
                  return res.status(404).json({ error: 'Conteúdo não encontrado' });
        }

        res.json(content);
      } catch (err: any) {
    console.error('[GET /history/:id]', err);
              res.status(500).json({ error: 'Erro ao buscar conteúdo', details: err.message });
      }
});

// PATCH /content/history/:id - Edita rascunho
router.patch('/history/:id', async (req: AuthRequest, res: Response) => {
      try {
              const { id } = req.params;
              const { text, hashtags, readTime } = req.body;
              const userId = req.effectiveUserId!;

        const content = await prisma.generatedContent.findFirst({
                  where: { id, userId },
        });

        if (!content) {
                  return res.status(404).json({ error: 'Conteúdo não encontrado' });
        }

        const updated = await prisma.generatedContent.update({
                  where: { id },
                  data: {
                              ...(text && { text }),
                              ...(hashtags && { hashtags }),
                              ...(readTime && { readTime }),
                  },
        });

        res.json({ ok: true, content: updated });
      } catch (err: any) {
    console.error('[PATCH /history/:id]', err);
              res.status(500).json({ error: 'Erro ao editar conteúdo', details: err.message });
      }
});

// DELETE /content/history/:id - Deleta rascunho
router.delete('/history/:id', async (req: AuthRequest, res: Response) => {
      try {
              const { id } = req.params;
              const userId = req.effectiveUserId!;

        const content = await prisma.generatedContent.findFirst({
                  where: { id, userId },
        });

        if (!content) {
                  return res.status(404).json({ error: 'Conteúdo não encontrado' });
        }

        await prisma.generatedContent.delete({ where: { id } });

        res.json({ ok: true, message: 'Conteúdo deletado' });
      } catch (err: any) {
    console.error('[DELETE /history/:id]', err);
              res.status(500).json({ error: 'Erro ao deletar conteúdo', details: err.message });
      }
});
