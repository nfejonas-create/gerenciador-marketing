import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { getMetrics, getMetricsSummary } from '../controllers/metricsController';

const router = Router();
router.use(authGuard);
router.get('/', getMetrics);
router.get('/summary', getMetricsSummary);
export default router;
