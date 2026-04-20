import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  userId?: string;
  effectiveUserId?: string;
  isAdmin?: boolean;
}

export function authGuard(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token nao fornecido' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
    req.userId = payload.userId;
    req.effectiveUserId = payload.userId;

    // Impersonation: admin pode agir como outro usuário
    const impersonateId = req.headers['x-impersonate-user-id'] as string | undefined;
    if (impersonateId) {
      // Verificação assíncrona: admin?
      prisma.user.findUnique({ where: { id: payload.userId }, select: { role: true } })
        .then(admin => {
          if (admin?.role === 'ADMIN') {
            req.effectiveUserId = impersonateId;
          }
          next();
        })
        .catch(() => next());
    } else {
      next();
    }
  } catch {
    return res.status(401).json({ error: 'Token invalido' });
  }
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) return res.status(401).json({ error: 'Nao autenticado' });
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
  if (user?.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado: apenas administradores' });
  req.isAdmin = true;
  next();
}
