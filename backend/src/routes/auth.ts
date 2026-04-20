import { Router } from 'express';
import passport from 'passport';
import { register, login, getMe, getSettings, updateSettings, impersonate, stopImpersonating } from '../controllers/authController';
import { authGuard, requireAdmin } from '../middleware/authGuard';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authGuard, getMe);
router.get('/settings', authGuard, getSettings);
router.put('/settings', authGuard, updateSettings);
router.post('/impersonate', authGuard, requireAdmin, impersonate);
router.post('/stop-impersonating', authGuard, stopImpersonating);

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
  router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login` }),
    (req, res) => {
      const { token } = req.user as any;
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    }
  );
} else {
  router.get('/google', (_req, res) => res.status(503).json({ error: 'Google OAuth nao configurado. Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no servidor.' }));
  router.get('/google/callback', (_req, res) => res.redirect(`${process.env.FRONTEND_URL || '/'}/login`));
}

if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  router.get('/linkedin', passport.authenticate('linkedin', { session: false }));
  router.get('/linkedin/callback', passport.authenticate('linkedin', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login` }),
    (req, res) => {
      const { token } = req.user as any;
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    }
  );
} else {
  router.get('/linkedin', (_req, res) => res.status(503).json({ error: 'LinkedIn OAuth nao configurado. Configure LINKEDIN_CLIENT_ID e LINKEDIN_CLIENT_SECRET no servidor.' }));
  router.get('/linkedin/callback', (_req, res) => res.redirect(`${process.env.FRONTEND_URL || '/'}/login`));
}

export default router;
