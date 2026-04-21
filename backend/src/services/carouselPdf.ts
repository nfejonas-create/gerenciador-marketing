import PDFDocument from 'pdfkit';
// canvas é importado de forma lazy dentro de generateSlideImages
// pois usa binários nativos que podem não estar disponíveis em todos os ambientes

interface Slide {
  slide: number;
  emoji: string;
  title: string;
  body: string;
  style: 'cover' | 'content' | 'cta';
  imageUrl?: string;
}

const COLORS = {
  cover: { bg: '#7C3AED', text: '#FFFFFF', accent: '#A78BFA' },
  content: { bg: '#1F2937', text: '#FFFFFF', accent: '#9CA3AF' },
  cta: { bg: '#2563EB', text: '#FFFFFF', accent: '#60A5FA' },
};

// Gerar PDF (mantido para download)
export async function generateCarouselPDF(slides: Slide[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: [1080, 1080] });
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      slides.forEach((slide, index) => {
        if (index > 0) doc.addPage();
        
        const colors = COLORS[slide.style];
        
        doc.rect(0, 0, 1080, 1080).fill(colors.bg);
        
        doc.fontSize(80)
           .fillColor(colors.text)
           .text(slide.emoji, 80, 100, { align: 'left' });
        
        const titleY = slide.style === 'cover' ? 350 : 250;
        const titleSize = slide.style === 'cover' ? 72 : 48;
        doc.fontSize(titleSize)
           .font('Helvetica-Bold')
           .fillColor(colors.text)
           .text(slide.title, 80, titleY, { 
             align: slide.style === 'cover' ? 'center' : 'left',
             width: 920,
             lineGap: 10
           });
        
        const bodyY = slide.style === 'cover' ? 550 : 450;
        const bodySize = slide.style === 'cover' ? 36 : 28;
        doc.fontSize(bodySize)
           .font('Helvetica')
           .fillColor(colors.accent)
           .text(slide.body, 80, bodyY, {
             align: slide.style === 'cover' ? 'center' : 'left',
             width: 920,
             lineGap: 15
           });
        
        doc.fontSize(24)
           .fillColor(colors.accent)
           .text(`${slide.slide}/${slides.length}`, 980, 1020, { align: 'right' });
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Gerar imagens PNG de cada slide para carrossel LinkedIn
export async function generateSlideImages(slides: Slide[]): Promise<Buffer[]> {
  // import lazy — canvas requer binários nativos
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createCanvas } = require('canvas') as typeof import('canvas');
  const images: Buffer[] = [];
  
  for (const slide of slides) {
    const canvas = createCanvas(1080, 1080);
    const ctx = canvas.getContext('2d');
    const colors = COLORS[slide.style];
    
    // Fundo
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, 1080, 1080);
    
    // Emoji
    ctx.font = '80px Arial';
    ctx.fillStyle = colors.text;
    ctx.textAlign = 'left';
    ctx.fillText(slide.emoji, 80, 160);
    
    // Título
    ctx.font = slide.style === 'cover' ? 'bold 72px Arial' : 'bold 48px Arial';
    ctx.fillStyle = colors.text;
    const titleY = slide.style === 'cover' ? 400 : 300;
    
    if (slide.style === 'cover') {
      ctx.textAlign = 'center';
      wrapText(ctx, slide.title, 540, titleY, 920, 80);
    } else {
      ctx.textAlign = 'left';
      wrapText(ctx, slide.title, 80, titleY, 920, 60);
    }
    
    // Corpo
    ctx.font = slide.style === 'cover' ? '36px Arial' : '28px Arial';
    ctx.fillStyle = colors.accent;
    const bodyY = slide.style === 'cover' ? 600 : 500;
    
    if (slide.style === 'cover') {
      ctx.textAlign = 'center';
      wrapText(ctx, slide.body, 540, bodyY, 920, 45);
    } else {
      ctx.textAlign = 'left';
      wrapText(ctx, slide.body, 80, bodyY, 920, 40);
    }
    
    // Número do slide
    ctx.font = '24px Arial';
    ctx.fillStyle = colors.accent;
    ctx.textAlign = 'right';
    ctx.fillText(`${slide.slide}/${slides.length}`, 1000, 1040);
    
    // Converter para PNG buffer
    const buffer = canvas.toBuffer('image/png');
    images.push(buffer);
  }
  
  return images;
}

// Função auxiliar para quebrar texto em múltiplas linhas
function wrapText(ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    
    if (testWidth > maxWidth && i > 0) {
      ctx.fillText(line, x, currentY);
      line = words[i] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  
  ctx.fillText(line, x, currentY);
}
