import { Router, text } from 'express';
import { authGuard } from '../middleware/authGuard';
import { getMetrics, getMetricsSummary, getMetricsWebhookInfo, getFacebookMetrics, getLinkedInProfileMetrics, receiveLinkedInMetrics } from '../controllers/metricsController';

const router = Router();
router.post('/linkedin-manual', text({ type: 'text/plain', limit: '32kb' }), receiveLinkedInMetrics);
router.use(authGuard);
router.get('/', getMetrics);
router.get('/summary', getMetricsSummary);
router.get('/webhook-info', getMetricsWebhookInfo);
router.post('/facebook', getFacebookMetrics);
router.get('/linkedin-profile', getLinkedInProfileMetrics);
export default router;
