import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const activeJobs = new Map<string, cron.ScheduledTask>();

// Publicar no LinkedIn (reutiliza lógica do schedulerService existente)
async function publishToLinkedIn(content: string, accessToken: string): Promise<void> {
  const fullText = content;
  
  // Tentativa 1: nova Posts API
  try {
    await axios.post('https://api.linkedin.com/rest/posts', {
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
    return;
  } catch (e: any) {
    console.warn('[ContentScheduler] Nova API falhou:', e?.response?.status);
  }

  // Tentativa 2: API legada ugcPosts
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
  
  if (!memberId) throw new Error('Não foi possível obter memberId');
  
  await axios.post('https://api.linkedin.com/v2/ugcPosts', {
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
}

// Agendar publicação
export async function schedulePost(
  jobId: string,
  cronExpression: string,
  contentText: string,
  accessToken: string,
  timezone: string = 'America/Sao_Paulo'
): Promise<void> {
  // Cancelar job existente se houver
  if (activeJobs.has(jobId)) {
    activeJobs.get(jobId)?.destroy();
    activeJobs.delete(jobId);
  }
  
  const task = cron.schedule(cronExpression, async () => {
    try {
      await publishToLinkedIn(contentText, accessToken);
      
      // Atualizar no banco
      await prisma.scheduledPost.update({
        where: { id: jobId },
        data: { 
          lastRunAt: new Date(),
          status: 'published',
        },
      });
      
      console.log(`[ContentScheduler] Job ${jobId} publicado com sucesso`);
      
      // Se não for recorrente, remover do Map
      const job = await prisma.scheduledPost.findUnique({ where: { id: jobId } });
      if (job?.recurrence !== 'daily') {
        task.destroy();
        activeJobs.delete(jobId);
      }
    } catch (err: any) {
      console.error(`[ContentScheduler] Erro no job ${jobId}:`, err.message);
      await prisma.scheduledPost.update({
        where: { id: jobId },
        data: { status: 'error' },
      });
    }
  }, {
    timezone,
    scheduled: true,
  });
  
  activeJobs.set(jobId, task);
}

// Cancelar job
export async function cancelJob(jobId: string): Promise<void> {
  const task = activeJobs.get(jobId);
  if (task) {
    task.destroy();
    activeJobs.delete(jobId);
  }
  
  await prisma.scheduledPost.update({
    where: { id: jobId },
    data: { status: 'cancelled' },
  });
}

// Recarregar jobs ao iniciar servidor
export async function reloadJobsOnStartup(): Promise<void> {
  console.log('[ContentScheduler] Recarregando jobs do banco...');
  
  const scheduledPosts = await prisma.scheduledPost.findMany({
    where: {
      status: 'scheduled',
      publishAt: { gte: new Date() },
    },
    include: {
      content: true,
      user: {
        include: {
          socialAccounts: {
            where: { platform: 'linkedin' },
            take: 1,
          },
        },
      },
    },
  });
  
  for (const post of scheduledPosts) {
    const accessToken = post.user.socialAccounts[0]?.accessToken;
    if (!accessToken) {
      console.warn(`[ContentScheduler] Job ${post.id} sem token, pulando`);
      continue;
    }
    
    // Calcular expressão cron
    const publishDate = dayjs(post.publishAt);
    const cronExpr = post.recurrence === 'daily'
      ? `0 ${publishDate.hour()} ${publishDate.minute()} * * *`
      : `${publishDate.minute()} ${publishDate.hour()} ${publishDate.date()} ${publishDate.month() + 1} *`;
    
    await schedulePost(post.id, cronExpr, post.content.text, accessToken);
    console.log(`[ContentScheduler] Job ${post.id} recarregado`);
  }
  
  console.log(`[ContentScheduler] ${scheduledPosts.length} jobs recarregados`);
}

import dayjs from 'dayjs';
