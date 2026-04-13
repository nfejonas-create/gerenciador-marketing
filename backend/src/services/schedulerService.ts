// backend/src/services/schedulerService.ts
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

// Funcao principal exportada — pode ser chamada pelo cron interno OU pelo endpoint HTTP externo
export async function runScheduler() {
  const now = new Date();
  const postsToPublish = await prisma.post.findMany({
    where: { status: 'scheduled', scheduledAt: { lte: now } },
    include: { user: { include: { socialAccounts: true } } },
  });

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
      console.log(`[Scheduler] Post ${post.id} publicado no ${post.platform}`);
      results.push({ postId: post.id, platform: post.platform, status: 'published' });
    } catch (publishErr: any) {
      const errMsg = publishErr?.response?.data?.message || publishErr?.response?.data?.error?.message || publishErr.message;
      console.error(`[Scheduler] Erro post ${post.id}:`, errMsg);
      await prisma.post.update({ where: { id: post.id }, data: { status: 'error_publish' } });
      results.push({ postId: post.id, platform: post.platform, status: 'error_publish', error: errMsg });
    }
  }

  return { checked: postsToPublish.length, results };
}

// Cron interno como fallback (a cada 5 minutos)
cron.schedule('*/5 * * * *', async () => {
  try {
    const result = await runScheduler();
    if (result.checked > 0) {
      console.log(`[Scheduler] Verificados ${result.checked} post(s)`, result.results);
    }
  } catch (err: any) {
    console.error('[Scheduler] Erro geral:', err.message);
  }
});

async function publishToLinkedIn(
  post: { id: string; content: string; hashtags?: string | null; cta?: string | null },
  accessToken: string,
  pageId?: string | null, // pageId armazena o memberId (ex: dWcJknqJau)
) {
  const fullText = [post.content, post.cta || '', post.hashtags || ''].filter(Boolean).join('\n\n').trim();

  // Obter memberId: usa pageId salvo no banco, senão chama /v2/userinfo (openid scope)
  let memberId = pageId;
  if (!memberId) {
    try {
      const ui = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      memberId = ui.data.sub;
    } catch {
      const me = await axios.get('https://api.linkedin.com/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      memberId = me.data.id;
    }
  }

  if (!memberId) throw new Error('Nao foi possivel obter memberId do LinkedIn');

  // Nova REST API do LinkedIn (202401)
  await axios.post('https://api.linkedin.com/rest/posts', {
    author: `urn:li:person:${memberId}`,
    commentary: fullText,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
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
  if (!pageId) throw new Error('pageId do Facebook nao configurado.');
  const message = [post.content, post.cta || '', post.hashtags || ''].filter(Boolean).join('\n\n').trim();
  await axios.post(`https://graph.facebook.com/v19.0/${pageId}/feed`, null, {
    params: { message, access_token: accessToken },
  });
}

console.log('[Scheduler] Agendador iniciado - verificando a cada 5 minutos');
