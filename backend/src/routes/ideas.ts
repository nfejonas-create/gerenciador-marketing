import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/authGuard';

const router = Router();
const prisma = new PrismaClient();

// Listar todas as ideias do usuário
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const ideas = await prisma.idea.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, ideas });
  } catch (error) {
    console.error('Error fetching ideas:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ideas' });
  }
});

// Criar nova ideia
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { hook, breakText, pain, agitate, solution, proof, cta, category } = req.body;

    const idea = await prisma.idea.create({
      data: {
        userId,
        hook,
        breakText,
        pain,
        agitate,
        solution,
        proof,
        cta,
        category,
      },
    });

    res.json({ success: true, idea });
  } catch (error) {
    console.error('Error creating idea:', error);
    res.status(500).json({ success: false, error: 'Failed to create idea' });
  }
});

// Atualizar ideia
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { hook, breakText, pain, agitate, solution, proof, cta, category } = req.body;

    const idea = await prisma.idea.updateMany({
      where: { id, userId },
      data: {
        hook,
        breakText,
        pain,
        agitate,
        solution,
        proof,
        cta,
        category,
      },
    });

    if (idea.count === 0) {
      return res.status(404).json({ success: false, error: 'Idea not found' });
    }

    res.json({ success: true, message: 'Idea updated' });
  } catch (error) {
    console.error('Error updating idea:', error);
    res.status(500).json({ success: false, error: 'Failed to update idea' });
  }
});

// Deletar ideia
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const idea = await prisma.idea.deleteMany({
      where: { id, userId },
    });

    if (idea.count === 0) {
      return res.status(404).json({ success: false, error: 'Idea not found' });
    }

    res.json({ success: true, message: 'Idea deleted' });
  } catch (error) {
    console.error('Error deleting idea:', error);
    res.status(500).json({ success: false, error: 'Failed to delete idea' });
  }
});

export default router;
