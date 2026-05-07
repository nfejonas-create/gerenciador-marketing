import { Router } from 'express';
import { authGuard, requireAdmin } from '../middleware/authGuard';
import { listUsers, createUser, updateUser, deleteUser, resetUserPassword } from '../controllers/adminController';

const router = Router();

router.use(authGuard, requireAdmin);

router.get('/users', listUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/reset-password', resetUserPassword);

export default router;
