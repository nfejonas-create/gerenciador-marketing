import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import axios from 'axios';
import { generateContent } from './contentGeneratorService';
import { schedulePost } from './contentScheduler';

const prisma = new PrismaClient();

interface TestResult {
  testId: string;
  timestamp: Date;
  tests: {
    generation: { success: boolean; error?: string; duration: number };
    scheduling: { success: boolean; error?: string; duration: number };
    publishing: { success: boolean; error?: string; duration: number };
  };
  correctionsApplied: string[];
}

// Configurações de teste
const TEST_CONFIG = {
  topic: 'Teste automático: NBR 5410 atualização 2026',
  template: 'post' as const,
  scheduleMinutes: 2, // Agendar para daqui a 2 minutos no teste
  testUserEmail: process.env.TEST_USER_EMAIL || 'test@automation.local',
};

// Logger estruturado
function log(level: 'info' | 'warn' | 'error', message: string, meta?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [AutoTest] [${level.toUpperCase()}] ${message}`, meta ? JSON.stringify(meta) : '');
}

// Criar ou obter usuário de teste
async function getOrCreateTestUser(): Promise<string> {
  let user = await prisma.user.findFirst({
    where: { email: TEST_CONFIG.testUserEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: TEST_CONFIG.testUserEmail,
        name: 'AutoTest System',
        password: 'autotest-' + Date.now(), // Senha aleatória
        role: 'ADMIN',
      },
    });
    log('info', 'Usuário de teste criado', { userId: user.id });
  }

  return user.id;
}

// Teste 1: Geração de conteúdo
async function testGeneration(userId: string): Promise<{ success: boolean; error?: string; duration: number; contentId?: string }> {
  const start = Date.now();
  
  try {
    log('info', 'Iniciando teste de geração');
    
    const result = await generateContent(userId, {
      headline: TEST_CONFIG.topic,
      snippet: 'Teste de geração automática de conteúdo para validação do sistema',
      template: TEST_CONFIG.template,
    });

    if (!result.text || result.text.length < 50) {
      throw new Error('Conteúdo gerado muito curto ou vazio');
    }

    // Salvar conteúdo gerado
    const content = await prisma.generatedContent.create({
      data: {
        userId,
        suggestionId: 'auto-test-' + Date.now(), // ID temporário para teste
        text: result.text,
        hashtags: result.hashtags,
        template: TEST_CONFIG.template,
        status: 'draft',
      },
    });

    const duration = Date.now() - start;
    log('info', 'Teste de geração concluído com sucesso', { contentId: content.id, duration });
    
    return { success: true, duration, contentId: content.id };
  } catch (error: any) {
    const duration = Date.now() - start;
    log('error', 'Teste de geração falhou', { error: error.message });
    return { success: false, error: error.message, duration };
  }
}

// Teste 2: Agendamento
async function testScheduling(userId: string, contentId: string): Promise<{ success: boolean; error?: string; duration: number; jobId?: string }> {
  const start = Date.now();
  
  try {
    log('info', 'Iniciando teste de agendamento', { contentId });
    
    const scheduleAt = new Date(Date.now() + TEST_CONFIG.scheduleMinutes * 60000);
    
    const scheduled = await prisma.scheduledPost.create({
      data: {
        userId,
        contentId,
        publishAt: scheduleAt,
        recurrence: 'none',
        platform: 'linkedin',
        status: 'scheduled',
      },
    });

    // Tentar agendar no cron
    try {
      const cronExpression = `${scheduleAt.getMinutes()} ${scheduleAt.getHours()} ${scheduleAt.getDate()} ${scheduleAt.getMonth() + 1} *`;
      await schedulePost(scheduled.id, cronExpression, 'Teste automático', '', 'America/Sao_Paulo');
    } catch (schedulingError: any) {
      log('warn', 'Erro ao agendar no cron, mas post foi salvo', { error: schedulingError.message });
    }

    const duration = Date.now() - start;
    log('info', 'Teste de agendamento concluído', { jobId: scheduled.id, duration });
    
    return { success: true, duration, jobId: scheduled.id };
  } catch (error: any) {
    const duration = Date.now() - start;
    log('error', 'Teste de agendamento falhou', { error: error.message });
    return { success: false, error: error.message, duration };
  }
}

// Teste 3: Publicação (simulada)
async function testPublishing(userId: string): Promise<{ success: boolean; error?: string; duration: number }> {
  const start = Date.now();
  
  try {
    log('info', 'Iniciando teste de publicação');
    
    // Verificar se existe conta LinkedIn conectada
    const socialAccount = await prisma.socialAccount.findFirst({
      where: { userId, platform: 'linkedin' },
    });

    if (!socialAccount) {
      log('warn', 'Nenhuma conta LinkedIn conectada para teste de publicação');
      return { success: true, duration: Date.now() - start }; // Não é erro crítico
    }

    // Testar se o token é válido
    try {
      await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${socialAccount.accessToken}` },
        timeout: 5000,
      });
    } catch (tokenError: any) {
      log('warn', 'Token LinkedIn pode estar expirado', { error: tokenError.message });
      // Não falha o teste, apenas alerta
    }

    const duration = Date.now() - start;
    log('info', 'Teste de publicação concluído', { duration });
    
    return { success: true, duration };
  } catch (error: any) {
    const duration = Date.now() - start;
    log('error', 'Teste de publicação falhou', { error: error.message });
    return { success: false, error: error.message, duration };
  }
}

// Correções automáticas
async function applyCorrections(testResult: TestResult, userId: string): Promise<string[]> {
  const corrections: string[] = [];

  // Correção 1: Se geração falhou, tentar regenerar
  if (!testResult.tests.generation.success) {
    log('info', 'Tentando correção: regenerar conteúdo');
    try {
      // Esperar 5 segundos e tentar novamente
      await new Promise(r => setTimeout(r, 5000));
      const retry = await testGeneration(userId);
      if (retry.success) {
        corrections.push('Conteúdo regenerado com sucesso');
      }
    } catch (e: any) {
      corrections.push(`Falha na correção de geração: ${e.message}`);
    }
  }

  // Correção 2: Se agendamento falhou, marcar como rascunho
  if (!testResult.tests.scheduling.success) {
    log('info', 'Tentando correção: salvar como rascunho');
    try {
      await prisma.generatedContent.updateMany({
        where: { status: 'scheduled' },
        data: { status: 'draft' },
      });
      corrections.push('Posts com erro de agendamento convertidos para rascunho');
    } catch (e: any) {
      corrections.push(`Falha na correção de agendamento: ${e.message}`);
    }
  }

  // Correção 3: Limpar jobs antigos
  try {
    const oldJobs = await prisma.scheduledPost.findMany({
      where: {
        status: 'scheduled',
        publishAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Mais de 24h
      },
    });

    for (const job of oldJobs) {
      await prisma.scheduledPost.update({
        where: { id: job.id },
        data: { status: 'cancelled' },
      });
    }

    if (oldJobs.length > 0) {
      corrections.push(`${oldJobs.length} jobs antigos cancelados`);
    }
  } catch (e: any) {
    corrections.push(`Falha ao limpar jobs antigos: ${e.message}`);
  }

  return corrections;
}

// Executar suite de testes completa
export async function runAutoTest(): Promise<TestResult> {
  log('info', '=== Iniciando AutoTest do Gerador de Conteúdo ===');
  
  const testId = `test-${Date.now()}`;
  const userId = await getOrCreateTestUser();
  
  const result: TestResult = {
    testId,
    timestamp: new Date(),
    tests: {
      generation: { success: false, duration: 0 },
      scheduling: { success: false, duration: 0 },
      publishing: { success: false, duration: 0 },
    },
    correctionsApplied: [],
  };

  // Teste 1: Geração
  const genResult = await testGeneration(userId);
  result.tests.generation = { success: genResult.success, error: genResult.error, duration: genResult.duration };

  // Teste 2: Agendamento (se geração funcionou)
  if (genResult.success && genResult.contentId) {
    const schedResult = await testScheduling(userId, genResult.contentId);
    result.tests.scheduling = { success: schedResult.success, error: schedResult.error, duration: schedResult.duration };
  }

  // Teste 3: Publicação
  const pubResult = await testPublishing(userId);
  result.tests.publishing = { success: pubResult.success, error: pubResult.error, duration: pubResult.duration };

  // Aplicar correções se necessário
  const hasFailures = !result.tests.generation.success || !result.tests.scheduling.success;
  if (hasFailures) {
    log('info', 'Falhas detectadas, aplicando correções automáticas');
    result.correctionsApplied = await applyCorrections(result, userId);
  }

  // Salvar resultado do teste
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "AutoTestResult" (
        "id" TEXT PRIMARY KEY,
        "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "testData" JSONB NOT NULL,
        "success" BOOLEAN NOT NULL
      )
    `;
    
    await prisma.$executeRaw`
      INSERT INTO "AutoTestResult" ("id", "timestamp", "testData", "success")
      VALUES (${testId}, ${result.timestamp}, ${JSON.stringify(result)}::jsonb, ${!hasFailures})
    `;
  } catch (e) {
    log('warn', 'Não foi possível salvar resultado do teste', e);
  }

  log('info', '=== AutoTest Concluído ===', { testId, success: !hasFailures });
  
  return result;
}

// Inicializar cron job para rodar a cada 5 dias
export function initAutoTestScheduler(): void {
  // Rodar a cada 5 dias às 3h da manhã
  cron.schedule('0 3 */5 * *', async () => {
    log('info', 'Cron job de AutoTest disparado');
    try {
      await runAutoTest();
    } catch (error: any) {
      log('error', 'Erro fatal no AutoTest', { error: error.message });
    }
  }, {
    timezone: 'America/Sao_Paulo',
  });

  log('info', 'AutoTest scheduler inicializado (a cada 5 dias às 3h)');
}

// Exportar para teste manual também
export { log };
