import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../middleware/authGuard';

const router = Router();
const prisma = new PrismaClient();

// Agendar semana completa
router.post('/schedule', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { postIds, schedule } = req.body;

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'postIds array is required',
      });
    }

    if (!schedule || !Array.isArray(schedule) || schedule.length !== postIds.length) {
      return res.status(400).json({
        success: false,
        error: 'schedule array must match postIds length',
      });
    }

    const results = [];

    for (let i = 0; i < postIds.length; i++) {
      const postId = postIds[i];
      const { date, time } = schedule[i];

      if (!date || !time) {
        results.push({ postId, error: 'Date and time required' });
        continue;
      }

      const scheduledAt = new Date(`${date}T${time}`);

      const updated = await prisma.post.updateMany({
        where: { id: postId, userId },
        data: {
          status: 'scheduled',
          scheduledAt,
        },
      });

      if (updated.count > 0) {
        results.push({ postId, scheduledAt, success: true });
      } else {
        results.push({ postId, error: 'Post not found' });
      }
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => r.error);

    res.json({
      success: failed.length === 0,
      results,
      summary: {
        total: postIds.length,
        scheduled: successful.length,
        failed: failed.length,
      },
    });
  } catch (error) {
    console.error('Error scheduling week:', error);
    res.status(500).json({ success: false, error: 'Failed to schedule week' });
  }
});

// Buscar posts agendados por semana
router.get('/:weekNumber', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { weekNumber } = req.params;
    const { platform } = req.query;

    // Calcular datas da semana
    const now = new Date();
    const year = now.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const daysOffset = (parseInt(weekNumber) - 1) * 7;
    const weekStart = new Date(startOfYear.setDate(startOfYear.getDate() + daysOffset));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const posts = await prisma.post.findMany({
      where: {
        userId,
        status: { in: ['scheduled', 'published'] },
        scheduledAt: {
          gte: weekStart,
          lt: weekEnd,
        },
        ...(platform && { platform: platform as string }),
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Agrupar por dia da semana
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const grouped = days.map((day, index) => ({
      day,
      dayIndex: index,
      posts: posts.filter(p => {
        if (!p.scheduledAt) return false;
        return p.scheduledAt.getDay() === index;
      }),
    }));

    res.json({
      success: true,
      weekNumber: parseInt(weekNumber),
      weekStart,
      weekEnd,
      grouped,
      allPosts: posts,
    });
  } catch (error) {
    console.error('Error fetching week posts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch week posts' });
  }
});

export default router;
