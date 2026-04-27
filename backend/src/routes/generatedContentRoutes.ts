import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.post('/generate', async (req: Request, res: Response) => {
    try {
          const { headline, content } = req.body;
          const userId = (req as any).userId;

          if (!headline) return res.status(400).json({ error: 'Missing headline' });

          const draft = await prisma.generatedContent.create({
                  data: { userId, text: content || '', template: 'post', status: 'draft', suggestionId: 'manual-' + Date.now(), hashtags: [] }
          });

          res.status(201).json({ success: true, data: draft });
    } catch (error) {
          res.status(500).json({ error: 'Failed to generate' });
    }
});

router.get('/history', async (req: Request, res: Response) => {
    try {
          const userId = (req as any).userId;
          const drafts = await prisma.generatedContent.findMany({
                  where: { userId, status: 'rascunho' },
                  orderBy: { createdAt: 'desc' }
          });
          res.json({ success: true, data: drafts });
    } catch (error) {
          res.status(500).json({ error: 'Failed to fetch' });
    }
});

router.get('/history/:id', async (req: Request, res: Response) => {
    try {
          const { id } = req.params;
          const userId = (req as any).userId;
          const draft = await prisma.generatedContent.findFirst({
                  where: { id, userId, status: 'rascunho' }
          });
          if (!draft) return res.status(404).json({ error: 'Not found' });
          res.json({ success: true, data: draft });
    } catch (error) {
          res.status(500).json({ error: 'Failed to fetch' });
    }
});

router.patch('/history/:id', async (req: Request, res: Response) => {
    try {
          const { id } = req.params;
          const { headline, content } = req.body;
          const userId = (req as any).userId;

          const updated = await prisma.generatedContent.update({
                  where: { id },
                  data: { text: content || undefined }
          });
          res.json({ success: true, data: updated });
    } catch (error) {
          res.status(500).json({ error: 'Failed to update' });
    }
});

router.delete('/history/:id', async (req: Request, res: Response) => {
    try {
          const { id } = req.params;
          await prisma.generatedContent.delete({ where: { id } });
          res.json({ success: true, message: 'Deleted' });
    } catch (error) {
          res.status(500).json({ error: 'Failed to delete' });
    }
});

export default router;
