import { Router } from 'express';
import { authGuard, requireAdmin } from '../middleware/authGuard';
import { listUsers, createUser, updateUser, deleteUser } from '../controllers/adminController';

const router = Router();

router.use(authGuard, requireAdmin);

router.get('/users', listUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

export default router;
