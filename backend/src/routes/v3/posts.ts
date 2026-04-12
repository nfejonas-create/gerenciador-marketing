import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../middleware/authGuard';

const router = Router();
const prisma = new PrismaClient();

// Listar posts
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { status, platform, limit = '50', page = '1' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const posts = await prisma.post.findMany({
      where: {
        userId,
        ...(status && { status: status as string }),
        ...(platform && { platform: platform as string }),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip,
    });

    const total = await prisma.post.count({
      where: {
        userId,
        ...(status && { status: status as string }),
        ...(platform && { platform: platform as string }),
      },
    });

    res.json({
      success: true,
      posts,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch posts' });
  }
});

// Criar post manual
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { content, platform, category, cta, hashtags } = req.body;

    if (!content || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Content and platform are required',
      });
    }

    const post = await prisma.post.create({
      data: {
        userId,
        content,
        platform,
        category,
        cta,
        hashtags,
        status: 'draft',
      },
    });

    res.json({ success: true, post });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
});

// Atualizar post
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { content, platform, category, cta, hashtags, status, scheduledAt } = req.body;

    const post = await prisma.post.updateMany({
      where: { id, userId },
      data: {
        content,
        platform,
        category,
        cta,
        hashtags,
        status,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      },
    });

    if (post.count === 0) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    res.json({ success: true, message: 'Post updated' });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ success: false, error: 'Failed to update post' });
  }
});

// Deletar post
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const post = await prisma.post.deleteMany({
      where: { id, userId },
    });

    if (post.count === 0) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
});

// Agendar post
router.post('/:id/schedule', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { scheduledAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        error: 'scheduledAt is required',
      });
    }

    const post = await prisma.post.updateMany({
      where: { id, userId },
      data: {
        status: 'scheduled',
        scheduledAt: new Date(scheduledAt),
      },
    });

    if (post.count === 0) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    res.json({ success: true, message: 'Post scheduled' });
  } catch (error) {
    console.error('Error scheduling post:', error);
    res.status(500).json({ success: false, error: 'Failed to schedule post' });
  }
});

// Publicar post imediatamente
router.post('/:id/publish', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const post = await prisma.post.updateMany({
      where: { id, userId },
      data: {
        status: 'published',
        publishedAt: new Date(),
      },
    });

    if (post.count === 0) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    res.json({ success: true, message: 'Post marked as published' });
  } catch (error) {
    console.error('Error publishing post:', error);
    res.status(500).json({ success: false, error: 'Failed to publish post' });
  }
});

export default router;
