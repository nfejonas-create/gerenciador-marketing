import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authGuard';

const prisma = new PrismaClient();

export async function register(req: Request, res: Response) {
  try {
    const { email, name, password } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email ja cadastrado' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, name, password: hashed } });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao registrar' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return res.status(401).json({ error: 'Credenciais invalidas' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciais invalidas' });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar } });
  } catch {
    return res.status(500).json({ error: 'Erro ao autenticar' });
  }
}

export async function getSettings(req: AuthRequest, res: Response) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { settings: true } });
    return res.json(user?.settings || {});
  } catch { return res.status(500).json({ error: 'Erro ao buscar configuracoes' }); }
}

export async function updateSettings(req: AuthRequest, res: Response) {
  try {
    const current = await prisma.user.findUnique({ where: { id: req.userId! }, select: { settings: true } });
    const merged = { ...(current?.settings as object || {}), ...req.body };
    await prisma.user.update({ where: { id: req.userId! }, data: { settings: merged } });
    return res.json(merged);
  } catch { return res.status(500).json({ error: 'Erro ao salvar configuracoes' }); }
}

export async function getMe(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, email: true, name: true, avatar: true, provider: true } });
  return res.json(user);
}
