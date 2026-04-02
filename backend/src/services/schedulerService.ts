// backend/src/services/schedulerService.ts
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

cron.schedule('*/5 * * * *', async () => {
  try {
    const now = new Date();
    const postsToPublish = await prisma.post.findMany({
      where: { status: 'scheduled', scheduledAt: { lte: now } },
      include: { user: { include: { socialAccounts: true } } },
    });

    for (const post of postsToPublish) {
      const account = post.user.socialAccounts.find(a => a.platform === post.platform);
      if (!account) {
        await prisma.post.update({ where: { id: post.id }, data: { status: 'error_no_account' } });
        continue;
      }
      try {
        if (post.platform === 'linkedin') await publishToLinkedIn(post, account.accessToken, account.pageId);
        else if (post.platform === 'facebook') await publishToFacebook(post, account.accessToken, account.pageId);

        await prisma.post.update({ where: { id: post.id }, data: { status: 'published', publishedAt: new Date() } });
        console.log(`[Scheduler] Post ${post.id} publicado no ${post.platform}`);
      } catch (publishErr: any) {
        console.error(`[Scheduler] Erro post ${post.id}:`, publishErr.message);
        await prisma.post.update({ where: { id: post.id }, data: { status: 'error_publish' } });
      }
    }
  } catch (err: any) {
    console.error('[Scheduler] Erro geral:', err.message);
  }
});

async function publishToLinkedIn(
  post: { content: string; hashtags?: string | null; cta?: string | null },
  accessToken: string,
  pageId?: string | null,
) {
  const profileRes = await axios.get('https://api.linkedin.com/v2/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const authorUrn = pageId ? `urn:li:organization:${pageId}` : `urn:li:person:${profileRes.data.id}`;
  const fullText = [post.content, post.cta || '', post.hashtags || ''].filter(Boolean).join('\n\n').trim();

  await axios.post('https://api.linkedin.com/v2/ugcPosts', {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: fullText },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  }, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } });
}

async function publishToFacebook(
  post: { content: string; hashtags?: string | null; cta?: string | null },
  accessToken: string,
  pageId?: string | null,
) {
  if (!pageId) throw new Error('pageId do Facebook nao configurado.');
  const message = [post.content, post.cta || '', post.hashtags || ''].filter(Boolean).join('\n\n').trim();
  await axios.post(`https://graph.facebook.com/v19.0/${pageId}/feed`, { message, access_token: accessToken });
}

console.log('[Scheduler] Agendador iniciado - verificando a cada 5 minutos');
