import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { getMetrics, getMetricsSummary, getFacebookMetrics, getLinkedInProfileMetrics } from '../controllers/metricsController';

const router = Router();
router.use(authGuard);
router.get('/', getMetrics);
router.get('/summary', getMetricsSummary);
router.post('/facebook', getFacebookMetrics);
router.get('/linkedin-profile', getLinkedInProfileMetrics);
export default router;
