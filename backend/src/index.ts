import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import socialRoutes from './routes/social';
import metricsRoutes from './routes/metrics';
import contentRoutes from './routes/content';
import knowledgeRoutes from './routes/knowledge';
import funnelRoutes from './routes/funnel';
import generatedContentRoutes from './routes/generatedContentRoutes';
import { errorHandler } from './middleware/errorHandler';
import './services/passport';
import './services/schedulerService';
import { initAutoTestScheduler } from './services/autoTestService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://frontend-six-lemon-74.vercel.app',
  'https://gerenciador-marketing-frontend.vercel.app',
    'https://gerenciador-marketing-netlify.netlify.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(passport.initialize());

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/social', socialRoutes);
app.use('/metrics', metricsRoutes);
app.use('/content', contentRoutes);
app.use('/knowledge', knowledgeRoutes);
app.use('/funnel', funnelRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', serverTime: new Date().toISOString() }));

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
// reloadJobsOnStartup().catch(err => console.error('[Startup] Erro ao recarregar jobs:', err));

// Inicializar auto-teste (a cada 5 dias)
initAutoTestScheduler();

// Endpoint para executar teste manualmente (apenas admin)
app.post('/admin/run-auto-test', async (req: any, res: any) => {
  const { secret } = req.body;
  if (secret !== (process.env.SETUP_SECRET || 'setup-secret-2026')) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  
  try {
    const { runAutoTest } = await import('./services/autoTestService');
    const result = await runAutoTest();
    return res.json({ ok: true, result });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
