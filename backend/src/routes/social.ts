import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { connectLinkedIn, connectFacebook, getSocialAccounts, syncMetrics } from '../controllers/socialController';

const router = Router();
router.use(authGuard);
router.post('/connect/linkedin', connectLinkedIn);
router.post('/connect/facebook', connectFacebook);
router.get('/accounts', getSocialAccounts);
router.post('/sync', syncMetrics);
export default router;
