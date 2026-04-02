import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authGuard';
import axios from 'axios';

const prisma = new PrismaClient();

export async function connectLinkedIn(req: AuthRequest, res: Response) {
  try {
    const { accessToken, pageId, pageName } = req.body;
    const account = await prisma.socialAccount.upsert({
      where: { userId_platform: { userId: req.userId!, platform: 'linkedin' } },
      update: { accessToken, pageId, pageName },
      create: { userId: req.userId!, platform: 'linkedin', accessToken, pageId, pageName },
    });
    return res.json(account);
  } catch {
    return res.status(500).json({ error: 'Erro ao conectar LinkedIn' });
  }
}

export async function connectFacebook(req: AuthRequest, res: Response) {
  try {
    const { accessToken, pageId, pageName } = req.body;
    const account = await prisma.socialAccount.upsert({
      where: { userId_platform: { userId: req.userId!, platform: 'facebook' } },
      update: { accessToken, pageId, pageName },
      create: { userId: req.userId!, platform: 'facebook', accessToken, pageId, pageName },
    });
    return res.json(account);
  } catch {
    return res.status(500).json({ error: 'Erro ao conectar Facebook' });
  }
}

export async function getSocialAccounts(req: AuthRequest, res: Response) {
  const accounts = await prisma.socialAccount.findMany({ where: { userId: req.userId! } });
  return res.json(accounts.map(a => ({ platform: a.platform, pageId: a.pageId, pageName: a.pageName, connected: true })));
}

export async function syncMetrics(req: AuthRequest, res: Response) {
  try {
    const accounts = await prisma.socialAccount.findMany({ where: { userId: req.userId! } });
    const results = [];

    for (const account of accounts) {
      if (account.platform === 'facebook' && account.pageId) {
        try {
          // Busca insights da pagina
          const insightsResp = await axios.get(`https://graph.facebook.com/v19.0/${account.pageId}/insights`, {
            params: {
              metric: 'page_impressions_unique,page_post_engagements',
              period: 'day',
              access_token: account.accessToken,
            },
          });
          const insightsData = insightsResp.data.data;
          const views = insightsData.find((d: any) => d.name === 'page_impressions_unique')?.values?.[0]?.value || 0;
          const engaged = insightsData.find((d: any) => d.name === 'page_post_engagements')?.values?.[0]?.value || 0;

          // Busca total de seguidores separadamente
          const pageResp = await axios.get(`https://graph.facebook.com/v19.0/${account.pageId}`, {
            params: { fields: 'fan_count,followers_count', access_token: account.accessToken },
          });
          const followers = pageResp.data.followers_count || pageResp.data.fan_count || 0;

          await prisma.metric.create({
            data: { userId: req.userId!, platform: 'facebook', date: new Date(), views, likes: engaged, followers },
          });
          results.push({ platform: 'facebook', status: 'ok', views, engaged, followers });
        } catch (err: any) {
          results.push({ platform: 'facebook', status: 'error', message: err?.message || 'Falha ao buscar metricas do Facebook' });
        }
      }

      if (account.platform === 'linkedin') {
        try {
          // LinkedIn bloqueia metricas para perfis pessoais via API
          // Usamos dados reais dos posts publicados pelo nosso app
          const publishedPosts = await prisma.post.findMany({
            where: { userId: req.userId!, platform: 'linkedin', status: 'published' },
            orderBy: { publishedAt: 'desc' },
            take: 30,
          });

          const totalPosts = publishedPosts.length;

          await prisma.metric.create({
            data: {
              userId: req.userId!,
              platform: 'linkedin',
              date: new Date(),
              views: 0,
              likes: 0,
              comments: 0,
              shares: totalPosts,
              followers: 0,
            },
          });
          results.push({ platform: 'linkedin', status: 'ok', posts: totalPosts, note: 'dados do banco - API LinkedIn bloqueada para perfis pessoais' });
        } catch (err: any) {
          results.push({ platform: 'linkedin', status: 'error', message: err?.message });
        }
      }
    }
    return res.json({ synced: results });
  } catch {
    return res.status(500).json({ error: 'Erro ao sincronizar metricas' });
  }
}
