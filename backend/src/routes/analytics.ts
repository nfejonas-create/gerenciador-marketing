import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/authGuard';
import { analyzePlatform } from '../services/multiAIService';

const router = Router();
const prisma = new PrismaClient();

// Listar snapshots de analytics
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { platform, limit = '30' } = req.query;

    const snapshots = await prisma.analyticsSnapshot.findMany({
      where: {
        userId,
        ...(platform && { platform: platform as string }),
      },
      orderBy: { snapshotDate: 'desc' },
      take: parseInt(limit as string),
    });

    res.json({ success: true, snapshots });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// Atualizar analytics (chamado pelo cron-job.org)
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    // Buscar URLs configuradas
    const settings = await prisma.generatorSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return res.status(400).json({ success: false, error: 'Settings not found' });
    }

    const platforms = [
      { name: 'LINKEDIN', url: settings.linkedinUrl },
      { name: 'FACEBOOK', url: settings.facebookUrl },
      { name: 'SITE', url: settings.siteUrl },
      { name: 'OTHER', url: settings.otherUrl },
    ];

    const results = [];

    for (const platform of platforms) {
      if (!platform.url) continue;

      try {
        const analysis = await analyzePlatform(platform.url);
        
        const snapshot = await prisma.analyticsSnapshot.create({
          data: {
            userId,
            platform: platform.name,
            followers: analysis.followers,
            views: analysis.views,
            shares: analysis.shares,
            likes: analysis.likes,
            comments: analysis.comments,
            sales: analysis.sales,
            analysisText: analysis.analysis,
          },
        });

        results.push({ platform: platform.name, snapshot });
      } catch (error) {
        console.error(`Error analyzing ${platform.name}:`, error);
        results.push({ platform: platform.name, error: 'Analysis failed' });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Error refreshing analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to refresh analytics' });
  }
});

// Buscar última análise por plataforma
router.get('/latest', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    const platforms = ['LINKEDIN', 'FACEBOOK', 'SITE', 'OTHER'];
    const latest: Record<string, any> = {};

    for (const platform of platforms) {
      const snapshot = await prisma.analyticsSnapshot.findFirst({
        where: { userId, platform },
        orderBy: { snapshotDate: 'desc' },
      });
      
      if (snapshot) {
        latest[platform] = snapshot;
      }
    }

    res.json({ success: true, latest });
  } catch (error) {
    console.error('Error fetching latest analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch latest analytics' });
  }
});

export default router;
