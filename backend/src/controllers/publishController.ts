import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authGuard';
import axios from 'axios';

const prisma = new PrismaClient();

// ─── LINKEDIN ───────────────────────────────────────────────────────────────
// Requisitos:
//   - App LinkedIn com produto "Share on LinkedIn" aprovado
//   - Escopo: w_member_social
//   - Token: gerado via OAuth ou colado manualmente em Configuracoes
//   - Endpoint: POST https://api.linkedin.com/v2/ugcPosts
// ────────────────────────────────────────────────────────────────────────────
async function postToLinkedIn(accessToken: string, pageId: string | null | undefined, fullText: string): Promise<string> {
  // Sempre busca o personId real do token — evita usar pageId errado
  const meRes = await axios.get('https://api.linkedin.com/v2/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const personId = meRes.data.id;
  if (!personId) throw new Error('Nao foi possivel obter o ID do perfil LinkedIn. Verifique o token.');

  // Usa organization URN se pageId for de uma pagina/empresa, senao usa person
  const author = (pageId && pageId !== personId)
    ? `urn:li:organization:${pageId}`
    : `urn:li:person:${personId}`;

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
// Requisitos:
//   - Token de PAGINA (nao usuario) com permissoes:
//     pages_manage_posts + pages_read_engagement
//   - No Graph Explorer: selecionar "Token da pagina" (nao "Token do usuario")
//   - pageId: ID numerico da pagina (ex: 1049737558220873)
//   - Endpoint: POST https://graph.facebook.com/v19.0/{pageId}/feed
// ────────────────────────────────────────────────────────────────────────────
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
      publishedId = await postToLinkedIn(account.accessToken, account.pageId, fullText);
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
    // Extrai mensagem de erro legivel da API do Facebook/LinkedIn
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
