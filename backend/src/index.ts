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
app.use('/funnel', funnelRoutes);
app.use('/knowledge', knowledgeRoutes);

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

app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
