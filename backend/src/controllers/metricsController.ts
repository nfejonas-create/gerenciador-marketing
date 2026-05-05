import { Request, Response } from 'express';
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

function dayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

async function saveLinkedInMetric(body: any, reqUserId?: string) {
  const {
    plataforma,
    visualizacoes,
    posts,
    seguidores,
    engajamento,
    data,
  } = body;

  let userId = reqUserId || '';
  if (!userId) {
    userId = String(body?.userId || '');
    const metricsToken = String(body?.metricsToken || '');
    if (!userId || !metricsToken) {
      throw Object.assign(new Error('Token de metricas invalido ou usuario nao informado'), { statusCode: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });
    if (!isValidMetricsToken(user?.settings, metricsToken)) {
      throw Object.assign(new Error('Token de metricas invalido ou usuario nao informado'), { statusCode: 401 });
    }
  }

  if (!plataforma || plataforma !== 'LinkedIn') {
    throw Object.assign(new Error('Dados invalidos ou plataforma nao suportada'), { statusCode: 400 });
  }

  const metricDate = data ? new Date(data) : new Date();
  const { start, end } = dayBounds(metricDate);
  const metricData = {
    userId,
    platform: 'linkedin',
    views: parseInt(visualizacoes) || 0,
    likes: parseInt(engajamento) || 0,
    comments: parseInt(body.comentarios) || 0,
    shares: parseInt(body.compartilhamentos || posts) || 0,
    followers: parseInt(seguidores) || 0,
    reach: parseInt(body.alcance || body.impressoes) || 0,
    date: metricDate,
  };

  const existing = await prisma.metric.findFirst({
    where: {
      userId,
      platform: 'linkedin',
      date: { gte: start, lt: end },
    },
    orderBy: { createdAt: 'desc' },
  });

  const metric = existing ? await prisma.metric.update({
    where: { id: existing.id },
    data: metricData,
  }) : await prisma.metric.create({
    data: metricData,
  });

  return { metric, updated: Boolean(existing) };
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
    const userId = await resolveMetricUserId(req);
    const { metric, updated } = await saveLinkedInMetric(body, userId || undefined);

    return res.json({
      success: true,
      message: updated ? 'Métricas do LinkedIn atualizadas com sucesso' : 'Métricas do LinkedIn sincronizadas com sucesso',
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

export async function receiveLinkedInMetricsPixel(req: Request, res: Response) {
  try {
    await saveLinkedInMetric({
      ...req.query,
      plataforma: 'LinkedIn',
    });
  } catch (err: any) {
    console.error('[receiveLinkedInMetricsPixel]', err);
  }

  const pixel = Buffer.from('R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'image/gif');
  return res.end(pixel);
}

export async function getLinkedInCollectorScript(req: Request, res: Response) {
  const userId = String(req.query.userId || '');
  const metricsToken = String(req.query.metricsToken || '');
  const endpoint = `${process.env.PUBLIC_API_URL || process.env.BACKEND_URL || 'https://gerenciador-marketing-backend.onrender.com'}/metrics/linkedin-manual`;
  const pixelEndpoint = `${process.env.PUBLIC_API_URL || process.env.BACKEND_URL || 'https://gerenciador-marketing-backend.onrender.com'}/metrics/linkedin-pixel`;

  if (!userId || !metricsToken) {
    return res.status(400).type('application/javascript').send("alert('MktManager: usuario ou token de metricas ausente.');");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  });

  if (!isValidMetricsToken(user?.settings, metricsToken)) {
    return res.status(403).type('application/javascript').send("alert('MktManager: token de metricas invalido.');");
  }

  res.type('application/javascript').send(`
(function(){
  const cfg = ${JSON.stringify({ endpoint, pixelEndpoint, userId, metricsToken })};
  const numberFromText = (text) => {
    const raw = String(text || '').replace(/\\s/g, '').toLowerCase();
    const match = raw.match(/[0-9.,]+\\s*[km]?/i);
    if (!match) return 0;
    const value = match[0];
    const multiplier = value.includes('k') ? 1000 : value.includes('m') ? 1000000 : 1;
    const normalized = value.replace(/[km]/gi, '').replace(/\\.(?=\\d{3}(\\D|$))/g, '').replace(',', '.');
    return Math.round((parseFloat(normalized) || 0) * multiplier);
  };
  const text = () => Array.from(document.querySelectorAll('main,section,article,div,span,p,h1,h2,h3'))
    .map(el => el.innerText || '')
    .filter(Boolean)
    .join('\\n');
  const findNear = (labels) => {
    const all = text();
    for (const label of labels) {
      const re = new RegExp('([0-9.,]+\\\\s*[km]?)\\\\s*(?:' + label + ')|(?:' + label + ')\\\\D{0,40}([0-9.,]+\\\\s*[km]?)', 'i');
      const match = all.match(re);
      if (match) return numberFromText(match[1] || match[2]);
    }
    return 0;
  };
  const collect = () => {
    const body = text();
    const cards = Array.from(document.querySelectorAll('[data-test-id], .analytics-card, .artdeco-card, section, article'));
    const cardText = cards.map(el => el.innerText || '').join('\\n');
    const linkedinData = {
      plataforma: 'LinkedIn',
      userId: cfg.userId,
      metricsToken: cfg.metricsToken,
      perfil: (document.querySelector('h1') || {}).innerText || document.title || 'Perfil LinkedIn',
      visualizacoes: findNear(['visualizacoes','visualizações','views','profile views']) || numberFromText((cardText.match(/([0-9.,]+\\s*[km]?)\\s*(visualiza|views)/i)||[])[1]),
      recrutadores: findNear(['recrutadores','recruiters']),
      posts: document.querySelectorAll('.feed-shared-update-v2,.update-components-actor,[data-urn*="activity"]').length || findNear(['posts','publicacoes','publicações']),
      seguidores: findNear(['seguidores','followers']),
      engajamento: findNear(['engajamento','engagement','reactions','reações','comentarios','comentários']),
      alcance: findNear(['alcance','reach','impressoes','impressões']),
      data: new Date().toISOString(),
      url: window.location.href
    };
    return linkedinData;
  };
  const send = async () => {
    const linkedinData = collect();
    const params = new URLSearchParams(linkedinData);
    params.set('cacheBust', String(Date.now()));
    const img = new Image();
    img.src = cfg.pixelEndpoint + '?' + params.toString();
    const id = 'mktmanager-linkedin-sync';
    let box = document.getElementById(id);
    if (!box) {
      box = document.createElement('div');
      box.id = id;
      box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;background:#0f172a;color:#e5e7eb;border:1px solid #2563eb;border-radius:10px;padding:12px 14px;font:13px Arial;box-shadow:0 8px 24px rgba(0,0,0,.35);max-width:320px';
      document.body.appendChild(box);
    }
    box.innerHTML = '<b>MktManager sincronizado</b><br>Views: '+linkedinData.visualizacoes+' | Seguidores: '+linkedinData.seguidores+' | Engaj.: '+linkedinData.engajamento+'<br><small>Atualiza de novo a cada 5 min enquanto esta aba ficar aberta.</small>';
  };
  clearInterval(window.__mktManagerLinkedInInterval);
  window.__mktManagerLinkedInInterval = setInterval(send, 5 * 60 * 1000);
  send();
})();
`);
}
