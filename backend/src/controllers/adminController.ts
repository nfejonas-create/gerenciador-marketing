import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authGuard';

const prisma = new PrismaClient();
const userSelect = { id: true, email: true, name: true, avatar: true, role: true, isActive: true, createdAt: true };

export async function listUsers(_req: AuthRequest, res: Response) {
  try {
    const users = await prisma.user.findMany({ select: userSelect, orderBy: { createdAt: 'asc' } });
    return res.json({ users });
  } catch { return res.status(500).json({ error: 'Erro ao listar usuarios' }); }
}

export async function createUser(req: AuthRequest, res: Response) {
  try {
    const { email, name, password, role } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email ja cadastrado' });
    const hashed = await bcrypt.hash(password || 'senha123', 10);
    const user = await prisma.user.create({ data: { email, name, password: hashed, role: role || 'USER' }, select: userSelect });
    return res.json({ user });
  } catch { return res.status(500).json({ error: 'Erro ao criar usuario' }); }
}

export async function updateUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, email, role, isActive } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;
    const user = await prisma.user.update({ where: { id }, data, select: userSelect });
    return res.json({ user });
  } catch { return res.status(500).json({ error: 'Erro ao atualizar usuario' }); }
}

export async function deleteUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    // Soft delete
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    return res.json({ ok: true });
  } catch { return res.status(500).json({ error: 'Erro ao desativar usuario' }); }
}
