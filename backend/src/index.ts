import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import authRoutes from './routes/auth';
import socialRoutes from './routes/social';
import metricsRoutes from './routes/metrics';
import contentRoutes from './routes/content';
import funnelRoutes from './routes/funnel';
import knowledgeRoutes from './routes/knowledge';
import aiContentRoutes from './routes/aiContent';
import aiV2Routes from './routes/v2/aiContent';
import v3ContentRoutes from './routes/v3/content';
import v3PostsRoutes from './routes/v3/posts';
import v3WeekRoutes from './routes/v3/week';
import ideasRoutes from './routes/ideas';
import settingsRoutes from './routes/settings';
import analyticsRoutes from './routes/analytics';
import { errorHandler } from './middleware/errorHandler';
import './services/passport';
import './services/schedulerService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://frontend-six-lemon-74.vercel.app',
  'https://frontend-pgxuttb3b-jonas-breitenbachs-projects.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({ 
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true 
}));
app.use(express.json({ limit: '10mb' }));
app.use(passport.initialize());

// Rotas de autenticação
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

// Rotas principais COM prefixo /api (frontend usa baseURL /api)
app.use('/api/content', contentRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/funnel', funnelRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/metrics', metricsRoutes);

// Rotas sem prefixo (compatibilidade com chamadas diretas)
app.use('/content', contentRoutes);
app.use('/social', socialRoutes);
app.use('/funnel', funnelRoutes);
app.use('/knowledge', knowledgeRoutes);
app.use('/metrics', metricsRoutes);

// Rotas de IA e v2/v3
app.use('/api/ai', aiContentRoutes);
app.use('/api/v2', aiV2Routes);
app.use('/api/v3/content', v3ContentRoutes);
app.use('/api/v3/posts', v3PostsRoutes);
app.use('/api/v3/week', v3WeekRoutes);
app.use('/api/ideas', ideasRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
