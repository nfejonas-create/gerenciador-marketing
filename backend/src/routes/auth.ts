import { Router } from 'express';
import passport from 'passport';
import { register, login, getMe } from '../controllers/authController';
import { authGuard } from '../middleware/authGuard';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authGuard, getMe);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const { token } = req.user as any;
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

router.get('/linkedin', passport.authenticate('linkedin', { session: false }));
router.get('/linkedin/callback', passport.authenticate('linkedin', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const { token } = req.user as any;
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

export default router;
