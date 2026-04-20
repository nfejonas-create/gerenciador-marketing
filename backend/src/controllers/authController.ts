import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authGuard';

const prisma = new PrismaClient();

const userSelect = { id: true, email: true, name: true, avatar: true, role: true, isActive: true };

export async function register(req: Request, res: Response) {
  try {
    const { email, name, password } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email ja cadastrado' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, name, password: hashed } });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao registrar' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return res.status(401).json({ error: 'Credenciais invalidas' });
    if (!user.isActive) return res.status(401).json({ error: 'Conta desativada' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciais invalidas' });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    const response: any = { token, user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, role: user.role } };
    // Admin recebe lista de todos os usuários
    if (user.role === 'ADMIN') {
      const users = await prisma.user.findMany({ select: userSelect, orderBy: { createdAt: 'asc' } });
      response.users = users;
    }
    return res.json(response);
  } catch {
    return res.status(500).json({ error: 'Erro ao autenticar' });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { ...userSelect, provider: true, settings: true } });
  return res.json(user);
}

export async function getSettings(req: AuthRequest, res: Response) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.effectiveUserId! }, select: { settings: true } });
    return res.json(user?.settings || {});
  } catch { return res.status(500).json({ error: 'Erro ao buscar configuracoes' }); }
}

export async function updateSettings(req: AuthRequest, res: Response) {
  try {
    const current = await prisma.user.findUnique({ where: { id: req.effectiveUserId! }, select: { settings: true } });
    const merged = { ...(current?.settings as object || {}), ...req.body };
    await prisma.user.update({ where: { id: req.effectiveUserId! }, data: { settings: merged } });
    return res.json(merged);
  } catch { return res.status(500).json({ error: 'Erro ao salvar configuracoes' }); }
}

export async function impersonate(req: AuthRequest, res: Response) {
  try {
    const { targetUserId } = req.body;
    const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: userSelect });
    if (!target) return res.status(404).json({ error: 'Usuario nao encontrado' });
    await prisma.adminSession.create({ data: { adminId: req.userId!, targetUserId } });
    return res.json({ ok: true, user: target });
  } catch { return res.status(500).json({ error: 'Erro ao impersonar' }); }
}

export async function stopImpersonating(req: AuthRequest, res: Response) {
  try {
    await prisma.adminSession.updateMany({
      where: { adminId: req.userId!, endedAt: null },
      data: { endedAt: new Date() }
    });
    return res.json({ ok: true });
  } catch { return res.status(500).json({ error: 'Erro ao encerrar sessao' }); }
}
