import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../middleware/authGuard';
import { generatePost } from '../../services/multiAIService';

const router = Router();
const prisma = new PrismaClient();

// Gerar conteúdo via IA
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { theme, tone, platform, category } = req.body;

    if (!theme || !platform) {
      return res.status(400).json({ 
        success: false, 
        error: 'Theme and platform are required' 
      });
    }

    // Buscar configurações do usuário
    const settings = await prisma.generatorSettings.findUnique({
      where: { userId },
    });

    // Buscar últimos posts para contexto
    const recentPosts = await prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { content: true },
    });

    // Buscar ideias relacionadas
    const ideas = await prisma.idea.findMany({
      where: { 
        userId,
        ...(category && { category }),
      },
      take: 3,
    });

    // Montar contexto
    const contextParts = [];
    if (recentPosts.length > 0) {
      contextParts.push('POSTS RECENTES:\n' + recentPosts.map(p => p.content.substring(0, 200)).join('\n---\n'));
    }
    if (ideas.length > 0) {
      contextParts.push('IDEIAS DE REFERÊNCIA:\n' + ideas.map(i => 
        `Gancho: ${i.hook}\nSolução: ${i.solution}\nCTA: ${i.cta}`
      ).join('\n---\n'));
    }

    const context = contextParts.join('\n\n');

    // Gerar post
    const result = await generatePost({
      theme,
      tone: tone || settings?.tone || 'mix',
      platform,
      instructions: settings?.instructions,
      context: context || undefined,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate content',
        details: result.error,
      });
    }

    // Salvar no histórico como DRAFT
    const post = await prisma.post.create({
      data: {
        userId,
        content: result.content,
        platform,
        category,
        status: 'draft',
      },
    });

    res.json({
      success: true,
      post,
      providerUsed: result.providerUsed,
    });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ success: false, error: 'Failed to generate content' });
  }
});

// Gerar múltiplos posts (semana)
router.post('/generate-week', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { themes, tone, platform, category } = req.body;

    if (!themes || !Array.isArray(themes) || themes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Themes array is required',
      });
    }

    // Buscar configurações
    const settings = await prisma.generatorSettings.findUnique({
      where: { userId },
    });

    // Buscar contexto
    const recentPosts = await prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { content: true },
    });

    const ideas = await prisma.idea.findMany({
      where: { userId },
      take: 3,
    });

    const contextParts = [];
    if (recentPosts.length > 0) {
      contextParts.push('POSTS RECENTES:\n' + recentPosts.map(p => p.content.substring(0, 200)).join('\n---\n'));
    }
    if (ideas.length > 0) {
      contextParts.push('IDEIAS DE REFERÊNCIA:\n' + ideas.map(i => 
        `Gancho: ${i.hook}\nSolução: ${i.solution}`
      ).join('\n---\n'));
    }

    const context = contextParts.join('\n\n');

    // Gerar posts em paralelo
    const generatePromises = themes.map(async (theme, index) => {
      const result = await generatePost({
        theme,
        tone: tone || settings?.tone || 'mix',
        platform,
        instructions: settings?.instructions,
        context: context || undefined,
      });

      if (result.success) {
        const post = await prisma.post.create({
          data: {
            userId,
            content: result.content,
            platform,
            category,
            status: 'draft',
          },
        });

        return {
          success: true,
          post,
          providerUsed: result.providerUsed,
          day: index + 1,
        };
      }

      return {
        success: false,
        error: result.error,
        day: index + 1,
      };
    });

    const results = await Promise.all(generatePromises);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.json({
      success: failed.length === 0,
      posts: successful.map(r => r.post),
      failed: failed.map(r => ({ day: r.day, error: r.error })),
      summary: {
        total: themes.length,
        generated: successful.length,
        failed: failed.length,
      },
    });
  } catch (error) {
    console.error('Error generating week content:', error);
    res.status(500).json({ success: false, error: 'Failed to generate week content' });
  }
});

export default router;
