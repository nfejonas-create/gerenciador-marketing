import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { AuthRequest } from '../middleware/authGuard';

const prisma = new PrismaClient();

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
    _sum: { views: true, likes: true, comments: true, shares: true, followers: true },
  });
  return res.json(metrics);
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

export async function receiveLinkedInMetrics(req: AuthRequest, res: Response) {
  try {
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
    } = req.body;

    // Validar dados mínimos
    if (!plataforma || plataforma !== 'LinkedIn') {
      return res.status(400).json({ error: 'Dados inválidos ou plataforma não suportada' });
    }

    // Salvar métricas no banco
    const metric = await prisma.metric.create({
      data: {
        userId: req.effectiveUserId!,
        platform: 'linkedin',
        views: parseInt(visualizacoes) || 0,
        likes: parseInt(engajamento) || 0,
        followers: parseInt(seguidores) || 0,
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
