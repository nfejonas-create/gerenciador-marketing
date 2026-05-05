import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { AuthRequest } from '../middleware/authGuard';
import { createMetricsToken, isValidMetricsToken } from '../services/metricsToken';

const prisma = new PrismaClient();

function getBody(req: AuthRequest) {
  if (typeof req.body !== 'string') return req.body || {};
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

export async function getMetrics(req: AuthRequest, res: Response) {
  const { platform, days = '30' } = req.query;
  const since = new Date();
  since.setDate(since.getDate() - Number(days));
  const where: any = { userId: req.effectiveUserId!, date: { gte: since } };
  if (platform) where.platform = platform;
  const metrics = await prisma.metric.findMany({ where, orderBy: { date: 'asc' } });
  return res.json(metrics);
}

export async function getMetricsSummary(req: AuthRequest, res: Response) {
  const metrics = await prisma.metric.groupBy({
    by: ['platform'],
    where: { userId: req.effectiveUserId! },
    _sum: { views: true, likes: true, comments: true, shares: true, followers: true, reach: true },
    _count: { id: true },
  });
  return res.json(metrics);
}

export async function getMetricsWebhookInfo(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.effectiveUserId! },
    select: { settings: true },
  });
  const settings = (user?.settings as any) || {};
  const metricsToken = settings.metricsWebhookToken || createMetricsToken();

  if (!settings.metricsWebhookToken) {
    await prisma.user.update({
      where: { id: req.effectiveUserId! },
      data: { settings: { ...settings, metricsWebhookToken: metricsToken } },
    });
  }

  return res.json({
    endpoint: `${process.env.PUBLIC_API_URL || process.env.BACKEND_URL || 'https://gerenciador-marketing-backend.onrender.com'}/metrics/linkedin-manual`,
    userId: req.effectiveUserId!,
    metricsToken,
    auth: 'token limitado para gravar metricas deste usuario',
    requiredFields: ['plataforma', 'userId', 'metricsToken', 'visualizacoes', 'seguidores', 'engajamento', 'data'],
  });
}

// ─── Facebook Graph API Metrics ─────────────────────────────────────────────

interface FacebookPostMetrics {
  id: string;
  message: string;
  createdTime: string;
  likes: number;
  comments: number;
  shares: number;
}

interface FacebookPageMetrics {
  pageName: string;
  followers: number;
  likes: number;
  posts: FacebookPostMetrics[];
}

export async function getFacebookMetrics(req: AuthRequest, res: Response) {
  try {
    const { pageId, accessToken } = req.body;

    if (!pageId || !accessToken) {
      return res.status(400).json({ error: 'Page ID e Access Token são obrigatórios' });
    }

    const graphApiUrl = 'https://graph.facebook.com/v20.0';
    const url = `${graphApiUrl}/${pageId}?fields=name,fan_count,followers_count,posts.limit(10){id,message,created_time,shares,likes.summary(true),comments.summary(true)}&access_token=${accessToken}`;

    const { data } = await axios.get(url);

    if (data.error) {
      throw new Error(data.error.message);
    }

    const posts = data.posts?.data || [];

    const metrics: FacebookPageMetrics = {
      pageName: data.name,
      followers: data.followers_count || 0,
      likes: data.fan_count || 0,
      posts: posts.map((post: any) => ({
        id: post.id,
        message: post.message || '',
        createdTime: post.created_time,
        likes: post.likes?.summary?.total_count || 0,
        comments: post.comments?.summary?.total_count || 0,
        shares: post.shares?.count || 0,
      })),
    };

    const totals = {
      totalLikes: metrics.posts.reduce((sum, p) => sum + p.likes, 0),
      totalComments: metrics.posts.reduce((sum, p) => sum + p.comments, 0),
      totalShares: metrics.posts.reduce((sum, p) => sum + p.shares, 0),
    };

    return res.json({
      ...metrics,
      ...totals,
    });
  } catch (err: any) {
    console.error('[Facebook Metrics]', err);
    return res.status(500).json({ error: err.message || 'Erro ao buscar métricas do Facebook' });
  }
}

// ─── LinkedIn Profile Metrics (Limited) ─────────────────────────────────────

export async function getLinkedInProfileMetrics(req: AuthRequest, res: Response) {
  // LinkedIn perfil pessoal tem limitações de API
  // Retorna estrutura indicando necessidade de API oficial
  return res.json({
    status: 'limited',
    message: 'Perfil pessoal do LinkedIn requer API oficial ou LinkedIn Analytics',
    followers: null,
    posts: null,
    note: 'Para métricas completas, conecte uma conta LinkedIn Company Page',
  });
}

// ─── Receber métricas do LinkedIn via bookmarklet/script ─────────────────────

async function resolveMetricUserId(req: AuthRequest): Promise<string | null> {
  if (req.effectiveUserId) return req.effectiveUserId;

  const body = getBody(req);
  const userId = String(body?.userId || '');
  const metricsToken = String(body?.metricsToken || '');
  if (!userId || !metricsToken) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });
  return isValidMetricsToken(user?.settings, metricsToken) ? userId : null;
}

export async function receiveLinkedInMetrics(req: AuthRequest, res: Response) {
  try {
    const body = getBody(req);
    const {
      plataforma,
      perfil,
      visualizacoes,
      recrutadores,
      posts,
      seguidores,
      engajamento,
      data,
      url
    } = body;

    const userId = await resolveMetricUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Token de metricas invalido ou usuario nao informado' });
    }

    // Validar dados mínimos
    if (!plataforma || plataforma !== 'LinkedIn') {
      return res.status(400).json({ error: 'Dados inválidos ou plataforma não suportada' });
    }

    // Salvar métricas no banco
    const metric = await prisma.metric.create({
      data: {
        userId,
        platform: 'linkedin',
        views: parseInt(visualizacoes) || 0,
        likes: parseInt(engajamento) || 0,
        comments: parseInt(body.comentarios) || 0,
        shares: parseInt(body.compartilhamentos || posts) || 0,
        followers: parseInt(seguidores) || 0,
        reach: parseInt(body.alcance || body.impressoes) || 0,
        date: data ? new Date(data) : new Date(),
      },
    });

    return res.json({
      success: true,
      message: 'Métricas do LinkedIn sincronizadas com sucesso',
      metric: {
        id: metric.id,
        visualizacoes: metric.views,
        seguidores: metric.followers,
        data: metric.date,
      }
    });
  } catch (err: any) {
    console.error('[receiveLinkedInMetrics]', err);
    return res.status(500).json({ error: err.message || 'Erro ao salvar métricas' });
  }
}
