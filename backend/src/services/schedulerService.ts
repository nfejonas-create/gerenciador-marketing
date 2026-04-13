import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

export async function runScheduler() {
  const prisma = new PrismaClient();
  try {
    const now = new Date();
    console.log(`[Scheduler] Verificando. Agora: ${now.toISOString()}`);

    const postsRaw = await prisma.$queryRaw<any[]>`
      SELECT p.*, u.id as "userId2",
             sa."accessToken", sa."pageId", sa."pageName", sa."platform" as "saPlatform"
      FROM "Post" p
      JOIN "User" u ON p."userId" = u.id
      LEFT JOIN "SocialAccount" sa ON sa."userId" = u.id AND sa.platform = p.platform
      WHERE p.status = 'scheduled'
        AND p."scheduledAt" IS NOT NULL
        AND p."scheduledAt" <= ${now}
    `;

    console.log(`[Scheduler] Posts encontrados: ${postsRaw.length}`);
    const results: { postId: string; platform: string; status: string; error?: string }[] = [];

    for (const row of postsRaw) {
      if (!row.accessToken) {
        await prisma.post.update({ where: { id: row.id }, data: { status: 'error_no_account' } });
        results.push({ postId: row.id, platform: row.platform, status: 'error_no_account' });
        continue;
      }
      try {
        const post = { id: row.id, content: row.content, cta: row.cta, hashtags: row.hashtags };
        if (row.platform === 'linkedin') await publishToLinkedIn(post, row.accessToken);
        else if (row.platform === 'facebook') await publishToFacebook(post, row.accessToken, row.pageId);

        await prisma.post.update({ where: { id: row.id }, data: { status: 'published', publishedAt: new Date() } });
        console.log(`[Scheduler] Post ${row.id} publicado no ${row.platform}`);
        results.push({ postId: row.id, platform: row.platform, status: 'published' });
      } catch (publishErr: any) {
        const errMsg = publishErr?.response?.data?.message || publishErr?.response?.data?.error?.message || String(publishErr.message);
        console.error(`[Scheduler] Erro post ${row.id}:`, errMsg);
        await prisma.post.update({ where: { id: row.id }, data: { status: 'error_publish' } });
        results.push({ postId: row.id, platform: row.platform, status: 'error_publish', error: errMsg });
      }
    }

    return { checked: postsRaw.length, now: now.toISOString(), results };
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
) {
  const fullText = [post.content, post.cta || '', post.hashtags || ''].filter(Boolean).join('\n\n').trim();

  // Tentativa 1: nova Posts API com urn:li:person:~ (igual ao publishController)
  try {
    const resp = await axios.post('https://api.linkedin.com/rest/posts', {
      author: 'urn:li:person:~',
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
      timeout: 10000,
    });
    const postId = resp.headers['x-linkedin-id'] || resp.headers['x-restli-id'] || 'published';
    console.log('[Scheduler LinkedIn] Publicado via nova API:', postId);
    return postId;
  } catch (e: any) {
    console.warn('[Scheduler LinkedIn] Nova API falhou:', e?.response?.status, e?.response?.data?.message);
  }

  // Tentativa 2: API legada ugcPosts (mais estável)
  try {
    // Obter memberId
    let memberId: string | null = null;
    try {
      const ui = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 5000,
      });
      memberId = ui.data.sub;
    } catch {
      const me = await axios.get('https://api.linkedin.com/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 5000,
      });
      memberId = me.data.id;
    }
    if (!memberId) throw new Error('Nao foi possivel obter memberId');

    const resp = await axios.post('https://api.linkedin.com/v2/ugcPosts', {
      author: `urn:li:person:${memberId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: fullText },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      timeout: 10000,
    });
    console.log('[Scheduler LinkedIn] Publicado via ugcPosts');
    return 'published';
  } catch (e2: any) {
    console.error('[Scheduler LinkedIn] ugcPosts também falhou:', e2?.response?.status, e2?.response?.data?.message);
    throw e2;
  }
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
