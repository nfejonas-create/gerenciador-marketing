import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authGuard';
import axios from 'axios';

const prisma = new PrismaClient();

async function resolveLinkedInMemberId(accessToken: string): Promise<string | null> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  // Método 1: Token introspection
  if (clientId && clientSecret) {
    try {
      const r = await axios.post(
        'https://api.linkedin.com/v2/introspectToken',
        new URLSearchParams({ client_id: clientId, client_secret: clientSecret, token: accessToken }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      const urn: string = r.data.authorizedUser || '';
      if (urn) return urn.split(':').pop() || null;
    } catch (e: any) {
      console.warn('[LinkedIn] introspect falhou:', e?.response?.data);
    }
  }

  // Método 2: /v2/me
  try {
    const r = await axios.get('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (r.data.id) return r.data.id;
  } catch {}

  return null;
}

export async function publishPost(req: AuthRequest, res: Response) {
  try {
    const { postId } = req.body;

    const post = await prisma.post.findFirst({ where: { id: postId, userId: req.userId! } });
    if (!post) return res.status(404).json({ error: 'Post nao encontrado' });

    const account = await prisma.socialAccount.findFirst({
      where: { userId: req.userId!, platform: post.platform },
    });
    if (!account) return res.status(400).json({ error: `Conta do ${post.platform} nao conectada. Va em Configuracoes.` });

    const fullText = [post.content, post.cta, post.hashtags].filter(Boolean).join('\n\n');
    let publishedId = '';

    if (post.platform === 'facebook') {
      const resp = await axios.post(
        `https://graph.facebook.com/v19.0/${account.pageId}/feed`,
        null,
        { params: { message: fullText, access_token: account.accessToken } }
      );
      publishedId = resp.data.id;
    } else if (post.platform === 'linkedin') {
      let memberId = account.pageId;

      // Se pageId está pendente ou vazio, tenta resolver automaticamente
      if (!memberId || memberId === 'PENDING') {
        console.log('[LinkedIn] Member ID pendente, tentando resolver automaticamente...');
        const resolved = await resolveLinkedInMemberId(account.accessToken);
        if (!resolved) {
          return res.status(400).json({
            error: 'Não foi possível identificar seu perfil LinkedIn. Vá em Configurações → Redes Sociais → LinkedIn e reconecte com seu Access Token.',
          });
        }
        memberId = resolved;
        // Salva para não precisar resolver toda vez
        await prisma.socialAccount.update({
          where: { id: account.id },
          data: { pageId: memberId },
        });
        console.log(`[LinkedIn] Member ID resolvido e salvo: ${memberId}`);
      }

      const body = {
        author: `urn:li:person:${memberId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: fullText },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };
      const resp = await axios.post('https://api.linkedin.com/v2/ugcPosts', body, {
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });
      publishedId = resp.data.id || resp.headers['x-restli-id'] || '';
    }

    await prisma.post.update({
      where: { id: postId },
      data: { status: 'published', publishedAt: new Date() },
    });

    return res.json({ success: true, publishedId, platform: post.platform });
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.response?.data?.error?.message || err.message;
    return res.status(500).json({ error: msg || 'Erro ao publicar post' });
  }
}

