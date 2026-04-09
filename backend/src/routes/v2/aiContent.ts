import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authGuard } from '../../middleware/authGuard';
import { generateWithFallback, generateBatchWithFallback } from '../../services/multiAIService';
import { 
  getDailyStrategy, 
  generateStrategyPrompt,
  HOOKS,
  STRUCTURES,
  CTAS,
  ContentStrategy 
} from '../../lib/contentStrategy';
import { 
  getWeeklyStrategy, 
  WEEK_DAYS
} from '../../lib/weeklyStrategies';

const router = Router();
const prisma = new PrismaClient();

export interface WeekPost {
  day: string;
  dayLabel: string;
  content: string;
  strategy: string;
  suggestedTime: string;
  status: 'pending' | 'approved' | 'rejected' | 'scheduled';
  platform: string;
}

export interface GenerateWeeklyParams {
  theme: string;
  tone: string;
  platform: 'linkedin' | 'facebook' | 'both';
  userId: string;
  knowledgeBase?: string[];
}

// POST /api/v2/generate-week - Gera conteúdo para uma semana (Multi-IA)
router.post('/generate-week', authGuard, async (req, res) => {
  const requestId = `req-${Date.now()}`;
  
  try {
    const { theme, tone, platform } = req.body;
    const userId = (req as any).userId;
    
    console.log(`[${requestId}] Recebida requisição de geração semanal`);
    console.log(`[${requestId}] Tema: ${theme}, Tom: ${tone}, Plataforma: ${platform}`);
    
    if (!theme || !tone || !platform) {
      return res.status(400).json({ 
        error: 'Tema, tom e plataforma são obrigatórios' 
      });
    }
    
    // Busca base de conhecimento do usuário
    const knowledgeBase = await prisma.knowledgeBase.findMany({
      where: { userId, active: true },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    
    const knowledgeContent = knowledgeBase.map(k => k.content);
    console.log(`[${requestId}] Base de conhecimento: ${knowledgeContent.length} itens`);
    
    // Define plataformas a gerar
    const platforms = platform === 'both' ? ['linkedin', 'facebook'] : [platform];
    
    // Prepara prompts para todos os dias
    const prompts: { day: string; platform: string; prompt: string }[] = [];
    
    for (const plat of platforms) {
      const strategy = getWeeklyStrategy(plat as 'linkedin' | 'facebook');
      
      for (const day of WEEK_DAYS) {
        const dayStrategy = strategy[day];
        if (!dayStrategy) continue;
        
        const contentStrategy = getDailyStrategy(plat as 'linkedin' | 'facebook', day);
        const basePrompt = generateStrategyPrompt(contentStrategy, theme, tone);
        
        const knowledgeContext = knowledgeContent.length > 0 
          ? `\n\nUse como referência este conteúdo da base de conhecimento:\n${knowledgeContent.slice(0, 3).join('\n---\n')}`
          : '';
        
        prompts.push({
          day,
          platform: plat,
          prompt: `${basePrompt}${knowledgeContext}\n\nGere o post completo em português do Brasil.`
        });
      }
    }
    
    console.log(`[${requestId}] Gerando ${prompts.length} posts em paralelo com Multi-IA...`);
    
    // Gera todos em paralelo com fallback
    const startTime = Date.now();
    const results = await generateBatchWithFallback(
      prompts.map(p => ({ day: p.day, platform: p.platform, prompt: p.prompt })),
      1000,
      requestId
    );
    const totalTime = Date.now() - startTime;
    
    // Constrói array de WeekPost
    const weekPosts: WeekPost[] = results.map((result, index) => {
      const prompt = prompts[index];
      const strategy = getWeeklyStrategy(prompt.platform as 'linkedin' | 'facebook')[prompt.day];
      
      return {
        day: prompt.day,
        dayLabel: getDayLabel(prompt.day),
        content: result.success 
          ? result.content.trim()
          : `⚠️ Erro ao gerar: ${result.error}. Clique em "Regenerar" para tentar novamente.`,
        strategy: strategy?.label || 'Estratégia personalizada',
        suggestedTime: strategy?.time || '09:00',
        status: 'pending',
        platform: prompt.platform
      };
    });
    
    // Salva no banco como rascunho
    const weeklyContent = await prisma.weeklyContent.create({
      data: {
        theme,
        tone,
        platform,
        posts: weekPosts as any,
        userId,
        status: 'draft'
      }
    });
    
    const successCount = results.filter(r => r.success).length;
    
    console.log(`[${requestId}] Concluído em ${totalTime}ms: ${successCount}/${results.length} posts gerados`);
    
    res.json({
      success: true,
      weeklyContentId: weeklyContent.id,
      weekPosts,
      metadata: {
        totalTimeMs: totalTime,
        postsGenerated: successCount,
        totalPosts: results.length,
        providersUsed: [...new Set(results.map(r => r.provider))],
        requestId
      },
      message: `Conteúdo gerado com sucesso! ${successCount} posts criados em ${Math.round(totalTime/1000)}s`
    });
    
  } catch (error) {
    console.error(`[${requestId}] Erro ao gerar conteúdo semanal:`, error);
    res.status(500).json({ 
      error: 'Erro ao gerar conteúdo. Tente novamente.',
      requestId
    });
  }
});

// POST /api/v2/generate-single - Gera post individual (Multi-IA)
router.post('/generate-single', authGuard, async (req, res) => {
  const requestId = `req-${Date.now()}`;
  
  try {
    const { theme, tone, platform, strategyType } = req.body;
    const userId = (req as any).userId;
    
    if (!theme || !tone || !platform) {
      return res.status(400).json({ 
        error: 'Tema, tom e plataforma são obrigatórios' 
      });
    }
    
    const knowledgeBase = await prisma.knowledgeBase.findMany({
      where: { userId, active: true },
      take: 3,
      orderBy: { createdAt: 'desc' }
    });
    
    const contentStrategy: ContentStrategy = {
      hook: strategyType as any || 'curiosity',
      structure: 'aida',
      cta: CTAS.engagement[0],
      template: HOOKS[strategyType as keyof typeof HOOKS]?.templates[0] || HOOKS.curiosity.templates[0],
      example: ''
    };
    
    const prompt = generateStrategyPrompt(contentStrategy, theme, tone);
    
    const knowledgeContext = knowledgeBase.length > 0 
      ? `\n\nUse como referência:\n${knowledgeBase.map(k => k.content).slice(0, 3).join('\n---\n')}`
      : '';
    
    const result = await generateWithFallback(
      `${prompt}${knowledgeContext}\n\nGere o post completo em português do Brasil.`,
      1000,
      requestId
    );
    
    if (!result.success) {
      return res.status(500).json({
        error: 'Falha ao gerar conteúdo com todos os providers de IA',
        details: result.error
      });
    }
    
    res.json({
      success: true,
      content: result.content.trim(),
      provider: result.provider,
      latencyMs: result.latencyMs,
      message: 'Post gerado com sucesso!'
    });
    
  } catch (error) {
    console.error(`[${requestId}] Erro ao gerar post:`, error);
    res.status(500).json({ 
      error: 'Erro ao gerar post. Tente novamente.' 
    });
  }
});

// POST /api/v2/regenerate - Regenera um post específico (Multi-IA)
router.post('/regenerate', authGuard, async (req, res) => {
  const requestId = `req-${Date.now()}`;
  
  try {
    const { weeklyContentId, dayIndex, theme, tone, feedback } = req.body;
    const userId = (req as any).userId;
    
    const weeklyContent = await prisma.weeklyContent.findFirst({
      where: { id: weeklyContentId, userId }
    });
    
    if (!weeklyContent) {
      return res.status(404).json({ error: 'Conteúdo não encontrado' });
    }
    
    const posts = weeklyContent.posts as unknown as WeekPost[];
    const postToRegenerate = posts[dayIndex];
    
    if (!postToRegenerate) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }
    
    const contentStrategy = getDailyStrategy(
      postToRegenerate.platform as 'linkedin' | 'facebook', 
      postToRegenerate.day
    );
    
    let prompt = generateStrategyPrompt(contentStrategy, theme, tone);
    
    if (feedback) {
      prompt += `\n\nFEEDBACK PARA MELHORAR:\n${feedback}`;
    }
    
    prompt += `\n\nGere uma NOVA VERSÃO diferente do post anterior.`;
    
    const result = await generateWithFallback(prompt, 1000, requestId);
    
    if (!result.success) {
      return res.status(500).json({
        error: 'Falha ao regenerar conteúdo',
        details: result.error
      });
    }
    
    // Atualiza o post no array
    posts[dayIndex] = {
      ...postToRegenerate,
      content: result.content.trim(),
      status: 'pending'
    };
    
    await prisma.weeklyContent.update({
      where: { id: weeklyContentId },
      data: { posts: posts as any }
    });
    
    res.json({
      success: true,
      post: posts[dayIndex],
      provider: result.provider,
      message: 'Post regenerado com sucesso!'
    });
    
  } catch (error) {
    console.error(`[${requestId}] Erro ao regenerar post:`, error);
    res.status(500).json({ 
      error: 'Erro ao regenerar post. Tente novamente.' 
    });
  }
});

// PUT /api/v2/update-post - Atualiza um post específico
router.put('/update-post', authGuard, async (req, res) => {
  try {
    const { weeklyContentId, dayIndex, content, status, scheduledTime } = req.body;
    const userId = (req as any).userId;
    
    const weeklyContent = await prisma.weeklyContent.findFirst({
      where: { id: weeklyContentId, userId }
    });
    
    if (!weeklyContent) {
      return res.status(404).json({ error: 'Conteúdo não encontrado' });
    }
    
    const posts = weeklyContent.posts as unknown as WeekPost[];
    
    if (posts[dayIndex]) {
      posts[dayIndex] = {
        ...posts[dayIndex],
        content: content || posts[dayIndex].content,
        status: status || posts[dayIndex].status,
        suggestedTime: scheduledTime || posts[dayIndex].suggestedTime
      };
    }
    
    await prisma.weeklyContent.update({
      where: { id: weeklyContentId },
      data: { posts: posts as any }
    });
    
    res.json({
      success: true,
      post: posts[dayIndex],
      message: 'Post atualizado com sucesso!'
    });
    
  } catch (error) {
    console.error('Erro ao atualizar post:', error);
    res.status(500).json({ 
      error: 'Erro ao atualizar post. Tente novamente.' 
    });
  }
});

// POST /api/v2/schedule - Agenda posts aprovados
router.post('/schedule', authGuard, async (req, res) => {
  try {
    const { weeklyContentId, posts } = req.body;
    const userId = (req as any).userId;
    
    const scheduledPosts = [];
    
    for (const post of posts) {
      if (post.status === 'approved' && post.scheduledDate && post.scheduledTime) {
        // Cria scheduled post
        const scheduledPost = await prisma.scheduledPost.create({
          data: {
            content: post.content,
            platform: post.platform,
            scheduledAt: new Date(post.scheduledDate + 'T' + post.scheduledTime),
            weeklyContentId,
            userId,
            status: 'pending'
          }
        });
        
        scheduledPosts.push(scheduledPost);
      }
    }
    
    // Atualiza status do weekly content
    await prisma.weeklyContent.update({
      where: { id: weeklyContentId },
      data: { status: 'scheduled' }
    });
    
    res.json({
      success: true,
      scheduledPosts,
      message: `${scheduledPosts.length} posts agendados com sucesso!`
    });
    
  } catch (error) {
    console.error('Erro ao agendar posts:', error);
    res.status(500).json({ 
      error: 'Erro ao agendar posts. Tente novamente.' 
    });
  }
});

// GET /api/v2/weekly-content - Lista conteúdos semanais do usuário
router.get('/weekly-content', authGuard, async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    const weeklyContents = await prisma.weeklyContent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      weeklyContents
    });
    
  } catch (error) {
    console.error('Erro ao buscar conteúdos:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar conteúdos. Tente novamente.' 
    });
  }
});

// GET /api/v2/weekly-content/:id - Detalhes de um conteúdo semanal
router.get('/weekly-content/:id', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;
    
    const weeklyContent = await prisma.weeklyContent.findFirst({
      where: { id, userId }
    });
    
    if (!weeklyContent) {
      return res.status(404).json({ error: 'Conteúdo não encontrado' });
    }
    
    res.json({
      success: true,
      weeklyContent
    });
    
  } catch (error) {
    console.error('Erro ao buscar conteúdo:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar conteúdo. Tente novamente.' 
    });
  }
});

// GET /api/v2/health - Health check dos providers de IA
router.get('/health', async (req, res) => {
  try {
    const { checkAIProvidersHealth } = await import('../../services/multiAIService');
    const health = await checkAIProvidersHealth();
    
    res.json({
      success: true,
      providers: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar health dos providers'
    });
  }
});

// Helper para obter label do dia
function getDayLabel(day: string): string {
  const labels: Record<string, string> = {
    domingo: 'Domingo',
    segunda: 'Segunda',
    terca: 'Terça',
    quarta: 'Quarta',
    quinta: 'Quinta',
    sexta: 'Sexta',
    sabado: 'Sábado'
  };
  return labels[day] || day;
}

export default router;
