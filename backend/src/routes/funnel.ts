import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { getProducts, createProduct, deleteProduct, getFunnelSuggestions } from '../controllers/funnelController';

const router = Router();
router.use(authGuard);
router.get('/products', getProducts);
router.post('/products', createProduct);
router.delete('/products/:id', deleteProduct);
router.get('/suggestions', getFunnelSuggestions);
export default router;
