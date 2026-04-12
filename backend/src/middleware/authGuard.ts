import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authGuard(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token nao fornecido' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalido' });
  }
}

// Alias para compatibilidade
export const authMiddleware = authGuard;
