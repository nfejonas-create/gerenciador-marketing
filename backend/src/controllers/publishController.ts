import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authGuard';
import axios from 'axios';

const prisma = new PrismaClient();

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
      // Requer escopo w_member_social no app LinkedIn
      const body = {
        author: `urn:li:person:${account.pageId}`,
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

    // Atualiza status do post no banco
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
