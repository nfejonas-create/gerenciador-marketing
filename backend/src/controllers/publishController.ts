import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authGuard';
import axios from 'axios';

const prisma = new PrismaClient();

// ─── LINKEDIN ───────────────────────────────────────────────────────────────
// Estratégia de obtenção do personId:
//   1. /v2/introspectToken com client_id+secret (não precisa de r_liteprofile)
//   2. /v2/me (precisa de r_liteprofile — fallback)
// ────────────────────────────────────────────────────────────────────────────
async function resolveLinkedInPersonId(accessToken: string): Promise<string> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  // Tentativa 1: introspectToken (nao precisa de r_liteprofile)
  if (clientId && clientSecret) {
    try {
      const params = new URLSearchParams({ token: accessToken, client_id: clientId, client_secret: clientSecret });
      const introRes = await axios.post(
        'https://www.linkedin.com/oauth/v2/introspectToken',
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      const sub = introRes.data.sub;
      if (sub) {
        const numeric = String(sub).replace(/^urn:li:member:/, '');
        if (numeric) { console.log('[LinkedIn] personId via introspect:', numeric); return numeric; }
      }
    } catch (e: any) {
      console.warn('[LinkedIn] introspectToken falhou:', e?.response?.data || e?.message);
    }
  }

  // Tentativa 2: /v2/userinfo (OpenID Connect - funciona com openid profile scopes)
  try {
    const uiRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (uiRes.data.sub) {
      const numeric = String(uiRes.data.sub).replace(/^urn:li:member:/, '');
      console.log('[LinkedIn] personId via userinfo:', numeric);
      return numeric;
    }
  } catch (e: any) {
    console.warn('[LinkedIn] /v2/userinfo falhou:', e?.response?.status, e?.response?.data);
  }

  // Tentativa 3: /v2/me (precisa de r_liteprofile - fallback legado)
  try {
    const meRes = await axios.get('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (meRes.data.id) { console.log('[LinkedIn] personId via /v2/me:', meRes.data.id); return String(meRes.data.id); }
  } catch (e: any) {
    console.warn('[LinkedIn] /v2/me falhou (status', e?.response?.status, ')');
  }

  throw new Error(
    'Nao foi possivel obter o ID do perfil LinkedIn. ' +
    'Acesse Configuracoes > LinkedIn e cole o Access Token (comeca com AQU...). ' +
    'Gere em: linkedin.com/developers/tools/oauth com escopos w_member_social + openid + profile'
  );
}

async function postToLinkedIn(accessToken: string, fullText: string, savedMemberId?: string | null): Promise<string> {
  // Tentativa 1: usar memberId salvo diretamente (mais confiável)
  if (savedMemberId && /^\d+$/.test(savedMemberId.trim())) {
    try {
      const personId = savedMemberId.trim();
      const author = `urn:li:person:${personId}`;
      const body = {
        author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: fullText },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      };
      const resp = await axios.post('https://api.linkedin.com/v2/ugcPosts', body, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        timeout: 15000,
      });
      const postId = resp.headers['x-restli-id'] || 'published';
      console.log('[LinkedIn] Post via ugcPosts com memberId salvo:', postId);
      return postId;
    } catch (e: any) {
      console.warn('[LinkedIn] ugcPosts com memberId salvo falhou:', e?.response?.status);
    }
  }

  // Tentativa 2: nova Posts API com urn:li:person:~
  try {
    const newApiBody = {
      author: 'urn:li:person:~',
      commentary: fullText,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };
    const resp = await axios.post('https://api.linkedin.com/rest/posts', newApiBody, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202401',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      timeout: 15000,
    });
    const postId = resp.headers['x-linkedin-id'] || resp.headers['x-restli-id'] || 'published';
    console.log('[LinkedIn] Post via nova API (urn:~):', postId);
    return postId;
  } catch (e: any) {
    console.warn('[LinkedIn] Nova API falhou:', e?.response?.status, e?.response?.data?.message || e?.message);
  }

  // Tentativa 3: ugcPosts com memberId resolvido
  let personId = await resolveLinkedInPersonId(accessToken);
  const author = `urn:li:person:${personId}`;
  const body = {
    author,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: fullText },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };
  const resp = await axios.post('https://api.linkedin.com/v2/ugcPosts', body, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    timeout: 15000,
  });
  const postId = resp.headers['x-restli-id'] || 'published';
  console.log('[LinkedIn] Post via ugcPosts com memberId resolvido:', postId);
  return postId;
}

// ─── FACEBOOK ───────────────────────────────────────────────────────────────
async function postToFacebook(accessToken: string, pageId: string, fullText: string): Promise<string> {
  if (!pageId) throw new Error('Page ID do Facebook nao configurado. Va em Configuracoes e reconecte o Facebook.');

  const resp = await axios.post(
    `https://graph.facebook.com/v19.0/${pageId}/feed`,
    null,
    { params: { message: fullText, access_token: accessToken } }
  );

  return resp.data.id || '';
}

// ─── CONTROLLER PRINCIPAL ───────────────────────────────────────────────────
export async function publishPost(req: AuthRequest, res: Response) {
  try {
    const { postId } = req.body;

    const post = await prisma.post.findFirst({
      where: { id: postId, userId: req.effectiveUserId! },
    });
    if (!post) return res.status(404).json({ error: 'Post nao encontrado' });

    const account = await prisma.socialAccount.findFirst({
      where: { userId: req.effectiveUserId!, platform: post.platform },
    });
    if (!account) {
      return res.status(400).json({
        error: `Conta do ${post.platform} nao conectada. Va em Configuracoes e conecte sua conta.`,
      });
    }

    // Monta texto completo: conteudo + CTA + hashtags
    const fullText = [post.content, post.cta, post.hashtags]
      .filter(Boolean)
      .join('\n\n')
      .trim();

    let publishedId = '';

    if (post.platform === 'linkedin') {
      // pageId no LinkedIn e usado para armazenar o memberId numerico
      publishedId = await postToLinkedIn(account.accessToken, fullText, account.pageId || null);
    } else if (post.platform === 'facebook') {
      if (!account.pageId) {
        return res.status(400).json({ error: 'Page ID do Facebook nao configurado. Va em Configuracoes.' });
      }
      publishedId = await postToFacebook(account.accessToken, account.pageId, fullText);
    } else {
      return res.status(400).json({ error: `Plataforma '${post.platform}' nao suportada.` });
    }

    await prisma.post.update({
      where: { id: postId },
      data: { status: 'published', publishedAt: new Date() },
    });

    return res.json({ success: true, publishedId, platform: post.platform });
  } catch (err: any) {
    const apiMsg =
      err?.response?.data?.message ||
      err?.response?.data?.error?.message ||
      err?.response?.data?.error?.error_user_msg ||
      err?.response?.data?.serviceErrorCode;
    const msg = apiMsg || err.message || 'Erro desconhecido ao publicar';
    console.error('[publishPost] Erro:', msg, err?.response?.data);
    return res.status(500).json({ error: msg });
  }
}
