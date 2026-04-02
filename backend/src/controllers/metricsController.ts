import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authGuard';

const prisma = new PrismaClient();

export async function getMetrics(req: AuthRequest, res: Response) {
  const { platform, days = '30' } = req.query;
  const since = new Date();
  since.setDate(since.getDate() - Number(days));
  const where: any = { userId: req.userId!, date: { gte: since } };
  if (platform) where.platform = platform;
  const metrics = await prisma.metric.findMany({ where, orderBy: { date: 'asc' } });
  return res.json(metrics);
}

export async function getMetricsSummary(req: AuthRequest, res: Response) {
  const metrics = await prisma.metric.groupBy({
    by: ['platform'],
    where: { userId: req.userId! },
    _sum: { views: true, likes: true, comments: true, shares: true, followers: true },
  });
  return res.json(metrics);
}
