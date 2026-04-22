import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import socialRoutes from './routes/social';
import metricsRoutes from './routes/metrics';
import contentRoutes from './routes/content';
import funnelRoutes from './routes/funnel';
import knowledgeRoutes from './routes/knowledge';
import contentGeneratorRoutes, { reloadJobsOnStartup } from './routes/contentGeneratorRoutes';
import { errorHandler } from './middleware/errorHandler';
import './services/passport';
import './services/schedulerService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(passport.initialize());

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/social', socialRoutes);
app.use('/metrics', metricsRoutes);
app.use('/content', contentRoutes);
app.use('/content-generator', contentGeneratorRoutes);
app.use('/funnel', funnelRoutes);
app.use('/knowledge', knowledgeRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', serverTime: new Date().toISOString() }));

// Diagnóstico temporário - verificar banco de dados no Render
app.get('/debug/db', async (_req, res) => {
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  try {
    const tables = await p.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
    const dbUrl = (process.env.DATABASE_URL || '').replace(/:[^@]+@/, ':***@');
    const rawTest = await p.$queryRaw`SELECT COUNT(*)::int as count FROM "ContentSuggestion"`.catch((e: any) => ({ rawError: e.message }));
    res.json({ tables, dbHost: dbUrl.split('@')[1]?.split('/')[0], rawTest });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { await p.$disconnect(); }
});

// Endpoint temporário - aplicar migration ContentSuggestion/GeneratedContent no banco correto
app.post('/debug/apply-migration', async (req: any, res: any) => {
  const { secret } = req.body || {};
  if (secret !== (process.env.SETUP_SECRET || 'setup-secret-2026')) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  const results: any[] = [];
  const sqls = [
    `CREATE TABLE IF NOT EXISTS "ContentSuggestion" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "source" TEXT NOT NULL,
      "headline" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "snippet" TEXT,
      "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "usedAt" TIMESTAMP(3),
      CONSTRAINT "ContentSuggestion_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE TABLE IF NOT EXISTS "GeneratedContent" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "suggestionId" TEXT NOT NULL,
      "text" TEXT NOT NULL,
      "hashtags" TEXT[],
      "template" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "GeneratedContent_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "ContentSuggestion_userId_source_fetchedAt_idx" ON "ContentSuggestion"("userId", "source", "fetchedAt")`,
    `CREATE INDEX IF NOT EXISTS "GeneratedContent_userId_status_idx" ON "GeneratedContent"("userId", "status")`,
    `ALTER TABLE "ContentSuggestion" ADD COLUMN IF NOT EXISTS "userId" TEXT`,
    // Fix ScheduledPost: adicionar colunas novas
    `ALTER TABLE "ScheduledPost" ADD COLUMN IF NOT EXISTS "contentId" TEXT`,
    `ALTER TABLE "ScheduledPost" ADD COLUMN IF NOT EXISTS "recurrence" TEXT NOT NULL DEFAULT 'none'`,
    `ALTER TABLE "ScheduledPost" ADD COLUMN IF NOT EXISTS "platform" TEXT NOT NULL DEFAULT 'linkedin'`,
    `ALTER TABLE "ScheduledPost" ADD COLUMN IF NOT EXISTS "lastRunAt" TIMESTAMP(3)`,
    `CREATE INDEX IF NOT EXISTS "ScheduledPost_userId_status_publishAt_idx" ON "ScheduledPost"("userId", "status", "publishAt")`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScheduledPost_contentId_fkey') THEN
        ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "GeneratedContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContentSuggestion_userId_fkey') THEN
        ALTER TABLE "ContentSuggestion" ADD CONSTRAINT "ContentSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GeneratedContent_userId_fkey') THEN
        ALTER TABLE "GeneratedContent" ADD CONSTRAINT "GeneratedContent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$`,
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GeneratedContent_suggestionId_fkey') THEN
        ALTER TABLE "GeneratedContent" ADD CONSTRAINT "GeneratedContent_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "ContentSuggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$`,
  ];
  try {
    for (const sql of sqls) {
      try {
        await p.$executeRawUnsafe(sql);
        results.push({ ok: true, sql: sql.trim().substring(0, 60) });
      } catch (e: any) {
        results.push({ ok: false, sql: sql.trim().substring(0, 60), error: e.message });
      }
    }
    const tables = await p.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
    return res.json({ results, tables });
  } catch (e: any) {
    return res.status(500).json({ error: e.message, results });
  } finally { await p.$disconnect(); }
});

// Endpoint temporário - define senha para conta OAuth
app.post('/setup/set-password', async (req: any, res: any) => {
  const { email, password, secret } = req.body;
  if (secret !== (process.env.SETUP_SECRET || 'setup-secret-2026')) return res.status(403).json({ error: 'Acesso negado' });
  const { PrismaClient } = require('@prisma/client');
  const bcrypt = require('bcryptjs');
  const p = new PrismaClient();
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await p.user.update({ where: { email }, data: { password: hashed }, select: { id: true, email: true, role: true, name: true } });
    return res.json({ ok: true, user });
  } catch (e: any) { return res.status(400).json({ error: e.message }); } finally { await p.$disconnect(); }
});

// Endpoint temporário de setup - promove usuário a admin pelo email
app.post('/setup/make-admin', async (req: any, res: any) => {
  const { email, secret } = req.body;
  if (secret !== (process.env.SETUP_SECRET || 'setup-secret-2026')) return res.status(403).json({ error: 'Acesso negado' });
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  try {
    const user = await p.user.update({ where: { email }, data: { role: 'ADMIN' }, select: { id: true, email: true, role: true } });
    return res.json({ ok: true, user });
  } catch (e: any) { return res.status(400).json({ error: e.message }); } finally { await p.$disconnect(); }
});

app.use(errorHandler);

// Recarregar jobs de agendamento ao iniciar
reloadJobsOnStartup().catch(err => console.error('[Startup] Erro ao recarregar jobs:', err));

app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
