import axios from 'axios';
import PDFDocument from 'pdfkit';

interface LinkedInAccount {
  accessToken: string;
  personId?: string;
  pageId?: string;
}

interface Slide {
  slide: number;
  emoji: string;
  title: string;
  body: string;
  style: 'cover' | 'content' | 'cta';
}

const LINKEDIN_VERSION = '202504';

const COLORS = {
  cover: { bg: '#7C3AED', text: '#FFFFFF', accent: '#A78BFA' },
  content: { bg: '#1F2937', text: '#FFFFFF', accent: '#9CA3AF' },
  cta: { bg: '#2563EB', text: '#FFFFFF', accent: '#60A5FA' },
};

// Gerar PNG de cada slide (para MultiImage API)
export async function generateSlideImages(slides: Slide[]): Promise<Buffer[]> {
  console.log('[Carousel] Gerando imagens dos slides...');
  
  // Usar PDFKit para criar imagens
  const images: Buffer[] = [];
  
  for (const slide of slides) {
    const doc = new PDFDocument({ size: [1080, 1080] });
    const chunks: Buffer[] = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
      
      const colors = COLORS[slide.style];
      
      // Fundo
      doc.rect(0, 0, 1080, 1080).fill(colors.bg);
      
      // Emoji
      doc.fontSize(80).fillColor(colors.text).text(slide.emoji, 80, 100);
      
      // Título
      const titleY = slide.style === 'cover' ? 350 : 250;
      const titleSize = slide.style === 'cover' ? 72 : 48;
      doc.fontSize(titleSize).font('Helvetica-Bold').fillColor(colors.text);
      
      if (slide.style === 'cover') {
        doc.text(slide.title, 80, titleY, { align: 'center', width: 920 });
      } else {
        doc.text(slide.title, 80, titleY, { width: 920 });
      }
      
      // Corpo
      const bodyY = slide.style === 'cover' ? 550 : 450;
      const bodySize = slide.style === 'cover' ? 36 : 28;
      doc.fontSize(bodySize).font('Helvetica').fillColor(colors.accent);
      
      if (slide.style === 'cover') {
        doc.text(slide.body, 80, bodyY, { align: 'center', width: 920 });
      } else {
        doc.text(slide.body, 80, bodyY, { width: 920 });
      }
      
      // Número do slide
      doc.fontSize(24).fillColor(colors.accent).text(
        `${slide.slide}/${slides.length}`, 
        980, 1020, 
        { align: 'right' }
      );
      
      doc.end();
    });
    
    // Converter PDF para PNG usando sharp (será adicionado)
    // Por enquanto, vamos usar o PDF direto e converter via API externa
    const pdfBuffer = Buffer.concat(chunks);
    images.push(pdfBuffer);
  }
  
  return images;
}

// Obter person ID via /v2/me
export async function getLinkedInPersonId(accessToken: string): Promise<string> {
  const res = await axios.get('https://api.linkedin.com/v2/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Linkedin-Version': LINKEDIN_VERSION,
    },
  });
  return res.data.id;
}

// Upload de imagem para LinkedIn (MultiImage API)
async function uploadImage(
  account: LinkedInAccount,
  imageBuffer: Buffer,
  ownerUrn: string
): Promise<string> {
  const headers = {
    Authorization: `Bearer ${account.accessToken}`,
    'Linkedin-Version': LINKEDIN_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
    'Content-Type': 'application/json',
  };

  // 1. Registrar upload
  const reg = await axios.post(
    'https://api.linkedin.com/rest/images?action=initializeUpload',
    { initializeUploadRequest: { owner: ownerUrn } },
    { headers }
  );
  
  const { uploadUrl, image: imageUrn } = reg.data.value;

  // 2. Upload da imagem
  await axios.put(uploadUrl, imageBuffer, {
    headers: { 'Content-Type': 'application/octet-stream' },
    maxBodyLength: Infinity,
  });

  // 3. Poll até AVAILABLE
  const encoded = encodeURIComponent(imageUrn);
  let status = '';
  for (let i = 0; i < 10 && status !== 'AVAILABLE'; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const s = await axios.get(
      `https://api.linkedin.com/rest/images/${encoded}`,
      { headers }
    );
    status = s.data.status;
  }

  return imageUrn;
}

// Postar carrossel MultiImage
async function postMultiImage(
  account: LinkedInAccount,
  imageUrns: string[],
  ownerUrn: string,
  text: string
): Promise<string> {
  const headers = {
    Authorization: `Bearer ${account.accessToken}`,
    'Linkedin-Version': LINKEDIN_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
    'Content-Type': 'application/json',
  };

  const postRes = await axios.post(
    'https://api.linkedin.com/rest/posts',
    {
      author: ownerUrn,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: {
        multiImage: {
          images: imageUrns.map(id => ({ id, altText: '' })),
        },
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    },
    { headers }
  );

  return postRes.headers['x-restli-id'] || '';
}

// Fluxo completo: publicar carrossel como MultiImage
export async function publishCarouselToLinkedIn(
  account: LinkedInAccount,
  slides: Slide[],
  commentary: string
): Promise<{ postUrn: string; imageUrns: string[] }> {
  // Obter person ID se não tiver
  if (!account.personId && !account.pageId) {
    account.personId = await getLinkedInPersonId(account.accessToken);
  }

  const ownerUrn = account.pageId 
    ? `urn:li:organization:${account.pageId}`
    : `urn:li:person:${account.personId}`;

  console.log('[LinkedIn] Publicando carrossel MultiImage...');
  console.log('[LinkedIn] Owner:', ownerUrn);
  console.log('[LinkedIn] Slides:', slides.length);

  // Gerar imagens dos slides (simplificado - usando canvas seria melhor)
  // Por enquanto, vamos criar um post de texto apenas para testar
  // TODO: Implementar conversão PDF -> PNG

  // Postar como texto por enquanto (funciona com w_member_social)
  const headers = {
    Authorization: `Bearer ${account.accessToken}`,
    'Linkedin-Version': LINKEDIN_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
    'Content-Type': 'application/json',
  };

  const postRes = await axios.post(
    'https://api.linkedin.com/rest/posts',
    {
      author: ownerUrn,
      commentary: commentary,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    },
    { headers }
  );

  const postUrn = postRes.headers['x-restli-id'] || '';
  console.log('[LinkedIn] Post criado:', postUrn);

  return { postUrn, imageUrns: [] };
}
