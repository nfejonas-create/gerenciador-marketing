import { Router, Request, Response } from 'express';
import { authGuard } from '../middleware/authGuard';
import { connectLinkedIn, connectFacebook, getSocialAccounts, syncMetrics } from '../controllers/socialController';
import { runScheduler } from '../services/schedulerService';

const router = Router();

// Endpoint publico para disparo externo do scheduler (cron-job.org)
// Protegido por header x-scheduler-secret — NAO usa authGuard
router.post('/scheduler/trigger', async (req: Request, res: Response) => {
  const secret = req.headers['x-scheduler-secret'];
  if (!process.env.SCHEDULER_SECRET || secret !== process.env.SCHEDULER_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await runScheduler();
    return res.json({ ok: true, serverTime: new Date().toISOString(), ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Rotas autenticadas
router.use(authGuard);
router.post('/connect/linkedin', connectLinkedIn);
router.post('/connect/facebook', connectFacebook);
router.get('/accounts', getSocialAccounts);
router.post('/sync', syncMetrics);

export default router;
