import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authGuard } from '../middleware/authGuard';
import { 
  generateWeeklyContent, 
  generateSinglePost,
  regeneratePost,
  generateFacebookVariant,
  suggestImprovements,
  WeekPost
} from '../services/aiGenerator';

const router = Router();
const prisma = new PrismaClient();

// POST /api/ai/generate-week - Gera conteúdo para uma semana
router.post('/generate-week', authGuard, async (req, res) => {
  try {
    const { theme, tone, platform } = req.body;
    const userId = req.user!.id;
    
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
    
    // Gera posts da semana
    const weekPosts = await generateWeeklyContent({
      theme,
      tone,
      platform,
      userId,
      knowledgeBase: knowledgeContent
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
    
    res.json({
      success: true,
      weeklyContentId: weeklyContent.id,
      weekPosts,
      message: 'Conteúdo gerado com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao gerar conteúdo semanal:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar conteúdo. Tente novamente.' 
    });
  }
});

// POST /api/ai/generate-single - Gera post individual
router.post('/generate-single', authGuard, async (req, res) => {
  try {
    const { theme, tone, platform, strategyType } = req.body;
    const userId = req.user!.id;
    
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
    
    const content = await generateSinglePost(
      theme,
      tone,
      platform,
      strategyType || 'curiosity',
      knowledgeBase.map(k => k.content)
    );
    
    res.json({
      success: true,
      content,
      message: 'Post gerado com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao gerar post:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar post. Tente novamente.' 
    });
  }
});

// POST /api/ai/regenerate - Regenera um post específico
router.post('/regenerate', authGuard, async (req, res) => {
  try {
    const { weeklyContentId, dayIndex, theme, tone, feedback } = req.body;
    const userId = req.user!.id;
    
    const weeklyContent = await prisma.weeklyContent.findFirst({
      where: { id: weeklyContentId, userId }
    });
    
    if (!weeklyContent) {
      return res.status(404).json({ error: 'Conteúdo não encontrado' });
    }
    
    const posts = weeklyContent.posts as WeekPost[];
    const postToRegenerate = posts[dayIndex];
    
    if (!postToRegenerate) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }
    
    const regeneratedPost = await regeneratePost(
      postToRegenerate,
      theme,
      tone,
      feedback
    );
    
    // Atualiza o post no array
    posts[dayIndex] = regeneratedPost;
    
    await prisma.weeklyContent.update({
      where: { id: weeklyContentId },
      data: { posts: posts as any }
    });
    
    res.json({
      success: true,
      post: regeneratedPost,
      message: 'Post regenerado com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao regenerar post:', error);
    res.status(500).json({ 
      error: 'Erro ao regenerar post. Tente novamente.' 
    });
  }
});

// PUT /api/ai/update-post - Atualiza um post específico
router.put('/update-post', authGuard, async (req, res) => {
  try {
    const { weeklyContentId, dayIndex, content, status, scheduledTime } = req.body;
    const userId = req.user!.id;
    
    const weeklyContent = await prisma.weeklyContent.findFirst({
      where: { id: weeklyContentId, userId }
    });
    
    if (!weeklyContent) {
      return res.status(404).json({ error: 'Conteúdo não encontrado' });
    }
    
    const posts = weeklyContent.posts as WeekPost[];
    
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

// POST /api/ai/schedule - Agenda posts aprovados
router.post('/schedule', authGuard, async (req, res) => {
  try {
    const { weeklyContentId, posts } = req.body;
    const userId = req.user!.id;
    
    const scheduledPosts = [];
    
    for (const post of posts) {
      if (post.status === 'approved') {
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

// GET /api/ai/weekly-content - Lista conteúdos semanais do usuário
router.get('/weekly-content', authGuard, async (req, res) => {
  try {
    const userId = req.user!.id;
    
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

// GET /api/ai/weekly-content/:id - Detalhes de um conteúdo semanal
router.get('/weekly-content/:id', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    
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

// POST /api/ai/suggest-improvements - Sugere melhorias para um post
router.post('/suggest-improvements', authGuard, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Conteúdo é obrigatório' });
    }
    
    const suggestions = await suggestImprovements(content);
    
    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Erro ao sugerir melhorias:', error);
    res.status(500).json({ 
      error: 'Erro ao sugerir melhorias. Tente novamente.' 
    });
  }
});

// POST /api/ai/adapt-facebook - Adapta conteúdo do LinkedIn para Facebook
router.post('/adapt-facebook', authGuard, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Conteúdo é obrigatório' });
    }
    
    const facebookContent = await generateFacebookVariant(content);
    
    res.json({
      success: true,
      content: facebookContent
    });
  } catch (error) {
    console.error('Erro ao adaptar conteúdo:', error);
    res.status(500).json({ 
      error: 'Erro ao adaptar conteúdo. Tente novamente.' 
    });
  }
});

export default router;
