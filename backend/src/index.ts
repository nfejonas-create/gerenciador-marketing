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
import { errorHandler } from './middleware/errorHandler';
import './services/passport';
import './services/schedulerService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://frontend-six-lemon-74.vercel.app',
  'http://localhost:5173'
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

app.use('/auth', authRoutes);
app.use('/social', socialRoutes);
app.use('/metrics', metricsRoutes);
app.use('/content', contentRoutes);
app.use('/funnel', funnelRoutes);
app.use('/knowledge', knowledgeRoutes);
app.use('/api/ai', aiContentRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
