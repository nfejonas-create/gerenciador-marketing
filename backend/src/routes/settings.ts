import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/authGuard';

const router = Router();
const prisma = new PrismaClient();

// Buscar configurações do usuário
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    let settings = await prisma.generatorSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.generatorSettings.create({
        data: {
          userId,
          instructions: 'Gere conteúdo profissional para eletricistas. Use tom técnico mas acessível. Máximo 1300 caracteres para LinkedIn.',
          tone: 'mix',
        },
      });
    }

    // Não retornar tokens completos por segurança
    const safeSettings = {
      ...settings,
      linkedinToken: settings.linkedinToken ? '***' : null,
      facebookToken: settings.facebookToken ? '***' : null,
    };

    res.json({ success: true, settings: safeSettings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// Atualizar configurações
router.put('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const {
      instructions,
      tone,
      linkedinUrl,
      facebookUrl,
      siteUrl,
      otherUrl,
      linkedinToken,
      facebookToken,
    } = req.body;

    const settings = await prisma.generatorSettings.upsert({
      where: { userId },
      update: {
        instructions,
        tone,
        linkedinUrl,
        facebookUrl,
        siteUrl,
        otherUrl,
        ...(linkedinToken && linkedinToken !== '***' && { linkedinToken }),
        ...(facebookToken && facebookToken !== '***' && { facebookToken }),
      },
      create: {
        userId,
        instructions,
        tone,
        linkedinUrl,
        facebookUrl,
        siteUrl,
        otherUrl,
        linkedinToken,
        facebookToken,
      },
    });

    const safeSettings = {
      ...settings,
      linkedinToken: settings.linkedinToken ? '***' : null,
      facebookToken: settings.facebookToken ? '***' : null,
    };

    res.json({ success: true, settings: safeSettings });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

export default router;
