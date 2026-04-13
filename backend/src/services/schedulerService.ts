import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

export async function runScheduler() {
  const prisma = new PrismaClient();
  try {
    const now = new Date();
    console.log(`[Scheduler] Verificando. Agora: ${now.toISOString()}`);

    const postsToPublish = await prisma.post.findMany({
      where: { status: 'scheduled', scheduledAt: { lte: now } },
      include: { user: { include: { socialAccounts: true } } },
    });

    console.log(`[Scheduler] Posts para publicar: ${postsToPublish.length}`);
    const results: { postId: string; platform: string; status: string; error?: string }[] = [];

    for (const post of postsToPublish) {
      const account = post.user.socialAccounts.find(a => a.platform === post.platform);
      if (!account) {
        await prisma.post.update({ where: { id: post.id }, data: { status: 'error_no_account' } });
        results.push({ postId: post.id, platform: post.platform, status: 'error_no_account' });
        continue;
      }
      try {
        if (post.platform === 'linkedin') await publishToLinkedIn(post, account.accessToken, account.pageId);
        else if (post.platform === 'facebook') await publishToFacebook(post, account.accessToken, account.pageId);

        await prisma.post.update({ where: { id: post.id }, data: { status: 'published', publishedAt: new Date() } });
        results.push({ postId: post.id, platform: post.platform, status: 'published' });
      } catch (publishErr: any) {
        const errMsg = publishErr?.response?.data?.message || publishErr?.response?.data?.error?.message || String(publishErr.message);
        console.error(`[Scheduler] Erro post ${post.id}:`, errMsg);
        await prisma.post.update({ where: { id: post.id }, data: { status: 'error_publish' } });
        results.push({ postId: post.id, platform: post.platform, status: 'error_publish', error: errMsg });
      }
    }

    return { checked: postsToPublish.length, now: now.toISOString(), results };
  } finally {
    await prisma.$disconnect();
  }
}

cron.schedule('*/5 * * * *', async () => {
  try {
    const result = await runScheduler();
    if (result.checked > 0) console.log(`[Scheduler Cron] Publicados ${result.checked} posts`, result.results);
  } catch (err: any) {
    console.error('[Scheduler Cron] Erro:', err.message);
  }
});

async function publishToLinkedIn(
  post: { id: string; content: string; hashtags?: string | null; cta?: string | null },
  accessToken: string,
  pageId?: string | null,
) {
  const fullText = [post.content, post.cta || '', post.hashtags || ''].filter(Boolean).join('\n\n').trim();
  let memberId = pageId;
  if (!memberId) {
    try {
      const ui = await axios.get('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
      memberId = ui.data.sub;
    } catch {
      const me = await axios.get('https://api.linkedin.com/v2/me', { headers: { Authorization: `Bearer ${accessToken}` } });
      memberId = me.data.id;
    }
  }
  if (!memberId) throw new Error('memberId LinkedIn nao encontrado');

  await axios.post('https://api.linkedin.com/rest/posts', {
    author: `urn:li:person:${memberId}`,
    commentary: fullText,
    visibility: 'PUBLIC',
    distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  }, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202401',
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });
}

async function publishToFacebook(
  post: { id: string; content: string; hashtags?: string | null; cta?: string | null },
  accessToken: string,
  pageId?: string | null,
) {
  if (!pageId) throw new Error('pageId Facebook nao configurado');
  const message = [post.content, post.cta || '', post.hashtags || ''].filter(Boolean).join('\n\n').trim();
  await axios.post(`https://graph.facebook.com/v19.0/${pageId}/feed`, null, {
    params: { message, access_token: accessToken },
  });
}

console.log('[Scheduler] Iniciado - verificando a cada 5 minutos');
