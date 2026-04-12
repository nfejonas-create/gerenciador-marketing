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
  // Tenta introspect (funciona com w_member_social + credenciais do app)
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (clientId && clientSecret) {
    try {
      const params = new URLSearchParams({ token: accessToken, client_id: clientId, client_secret: clientSecret });
      const introRes = await axios.post(
        'https://www.linkedin.com/oauth/v2/introspectToken',
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      const sub = introRes.data.sub; // ex: "urn:li:member:12345678" ou "12345678"
      if (sub) {
        // Extrai só o ID numérico se vier como URN
        const numeric = String(sub).replace(/^urn:li:member:/, '');
        if (numeric) {
          console.log('[LinkedIn] personId via introspect:', numeric);
          return numeric;
        }
      }
    } catch (e: any) {
      console.warn('[LinkedIn] introspectToken falhou:', e?.response?.data || e?.message);
    }
  }

  // Fallback: /v2/me (precisa de r_liteprofile)
  try {
    const meRes = await axios.get('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (meRes.data.id) {
      console.log('[LinkedIn] personId via /v2/me:', meRes.data.id);
      return String(meRes.data.id);
    }
  } catch (e: any) {
    console.warn('[LinkedIn] /v2/me falhou (status', e?.response?.status, ')— token pode precisar de r_liteprofile');
  }

  throw new Error(
    'Nao foi possivel obter o ID do perfil LinkedIn. ' +
    'Gere um novo token com escopo "r_liteprofile + w_member_social" nas Configuracoes.'
  );
}

async function postToLinkedIn(accessToken: string, fullText: string): Promise<string> {
  const personId = await resolveLinkedInPersonId(accessToken);
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
  });

  return resp.data.id || resp.headers['x-restli-id'] || '';
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
      where: { id: postId, userId: req.userId! },
    });
    if (!post) return res.status(404).json({ error: 'Post nao encontrado' });

    const account = await prisma.socialAccount.findFirst({
      where: { userId: req.userId!, platform: post.platform },
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
      publishedId = await postToLinkedIn(account.accessToken, fullText);
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
