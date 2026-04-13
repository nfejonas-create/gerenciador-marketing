import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

export async function runScheduler() {
  const prisma = new PrismaClient();
  try {
    const now = new Date();
    console.log(`[Scheduler] Verificando. Agora: ${now.toISOString()}`);

    // Usar SQL raw para garantir que a comparacao de timestamp funciona corretamente
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

    console.log(`[Scheduler] Posts encontrados via SQL: ${postsRaw.length}`);
    const results: { postId: string; platform: string; status: string; error?: string }[] = [];

    for (const row of postsRaw) {
      if (!row.accessToken) {
        await prisma.post.update({ where: { id: row.id }, data: { status: 'error_no_account' } });
        results.push({ postId: row.id, platform: row.platform, status: 'error_no_account' });
        continue;
      }
      try {
        const post = { id: row.id, content: row.content, cta: row.cta, hashtags: row.hashtags };
        if (row.platform === 'linkedin') await publishToLinkedIn(post, row.accessToken, row.pageId);
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
