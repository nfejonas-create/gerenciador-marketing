import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import authRoutes from './routes/auth';
import socialRoutes from './routes/social';
import metricsRoutes from './routes/metrics';
import contentRoutes from './routes/content';
import funnelRoutes from './routes/funnel';
import { errorHandler } from './middleware/errorHandler';
import './services/passport';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(passport.initialize());

app.use('/auth', authRoutes);
app.use('/social', socialRoutes);
app.use('/metrics', metricsRoutes);
app.use('/content', contentRoutes);
app.use('/funnel', funnelRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
