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
          const headers = { Authorization: `Bearer ${account.accessToken}` };

          // 1. Buscar perfil para obter personId
          const meResp = await axios.get('https://api.linkedin.com/v2/me', { headers });
          const personId = meResp.data.id;

          // 2. Total de conexoes (unico endpoint de "seguidores" disponivel para perfil pessoal)
          let connections = 0;
          const connResp = await axios.get('https://api.linkedin.com/v2/connections', {
            headers, params: { q: 'viewer', start: 0, count: 0 },
          }).catch(() => null);
          connections = connResp?.data?.paging?.total || 0;

          // 3. Posts publicados pelo usuario
          const postsResp = await axios.get('https://api.linkedin.com/v2/ugcPosts', {
            headers,
            params: { q: 'authors', authors: `List(urn:li:person:${personId})`, count: 20, sortBy: 'LAST_MODIFIED' },
          }).catch(() => null);

          const posts = postsResp?.data?.elements || [];
          let totalLikes = 0;
          let totalComments = 0;

          // 4. Para cada post, buscar likes e comentarios
          for (const post of posts.slice(0, 10)) {
            const urn = encodeURIComponent(post.id);
            const [likesResp, commentsResp] = await Promise.all([
              axios.get(`https://api.linkedin.com/v2/socialActions/${urn}/likes`, { headers, params: { count: 0 } }).catch(() => null),
              axios.get(`https://api.linkedin.com/v2/socialActions/${urn}/comments`, { headers, params: { count: 0 } }).catch(() => null),
            ]);
            totalLikes += likesResp?.data?.paging?.total || 0;
            totalComments += commentsResp?.data?.paging?.total || 0;
          }

          await prisma.metric.create({
            data: {
              userId: req.userId!,
              platform: 'linkedin',
              date: new Date(),
              views: 0,
              likes: totalLikes,
              comments: totalComments,
              shares: posts.length,
              followers: connections,
            },
          });
          results.push({ platform: 'linkedin', status: 'ok', connections, posts: posts.length, likes: totalLikes, comments: totalComments });
        } catch (err: any) {
          results.push({ platform: 'linkedin', status: 'error', message: err?.message || 'Falha ao buscar metricas do LinkedIn' });
        }
      }
    }
    return res.json({ synced: results });
  } catch {
    return res.status(500).json({ error: 'Erro ao sincronizar metricas' });
  }
}
