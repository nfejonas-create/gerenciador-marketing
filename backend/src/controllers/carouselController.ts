import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authGuard';
import https from 'https';

const prisma = new PrismaClient();

// Publicar no LinkedIn usando módulo nativo https (evita axios)
export async function publishCarousel(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    
    const carousel = await prisma.carousel.findFirst({
      where: { id, userId: req.effectiveUserId! },
    });
    if (!carousel) return res.status(404).json({ error: 'Carrossel não encontrado' });

    // Buscar conta LinkedIn
    const linkedInAccount = await prisma.socialAccount.findFirst({
      where: { userId: req.effectiveUserId!, platform: 'linkedin' },
    });
    if (!linkedInAccount) {
      return res.status(400).json({ error: 'Conta LinkedIn não conectada' });
    }

    // Obter person ID
    const personId = await new Promise<string>((resolve, reject) => {
      const req = https.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${linkedInAccount.accessToken}`,
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.sub);
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
    });

    const authorUrn = `urn:li:person:${personId}`;
    const firstSlide = (carousel.slides as any[])[0];
    const text = `📊 ${carousel.title}\n\n${firstSlide?.body || ''}`;

    // Publicar post usando https nativo
    const postId = await new Promise<string>((resolve, reject) => {
      const postData = JSON.stringify({
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      });

      const request = https.request({
        hostname: 'api.linkedin.com',
        path: '/v2/ugcPosts',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${linkedInAccount.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }, (response) => {
        console.log('[LinkedIn] Status:', response.statusCode);
        console.log('[LinkedIn] Headers:', response.headers);
        
        const postId = response.headers['x-restli-id'] as string;
        resolve(postId || '');
      });

      request.on('error', reject);
      request.write(postData);
      request.end();
    });

    // Atualizar carrossel
    const updated = await prisma.carousel.update({
      where: { id },
      data: { 
        status: 'published', 
        publishedAt: new Date(),
        linkedinUrn: postId,
      },
    });

    return res.json({ 
      ok: true, 
      carousel: updated,
      linkedInPostUrn: postId,
    });
  } catch (err: any) {
    console.error('[publishCarousel]', err);
    return res.status(500).json({ error: 'Erro ao publicar', details: err.message });
  }
}
