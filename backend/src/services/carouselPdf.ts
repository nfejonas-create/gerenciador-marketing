import PDFDocument from 'pdfkit';

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

export async function generateCarouselPDF(slides: Slide[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: [1080, 1080] });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      slides.forEach((slide, index) => {
        if (index > 0) {
          doc.addPage();
        }

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
            lineGap: 10,
          });

        const bodyY = slide.style === 'cover' ? 550 : 450;
        const bodySize = slide.style === 'cover' ? 36 : 28;
        doc.fontSize(bodySize)
          .font('Helvetica')
          .fillColor(colors.accent)
          .text(slide.body, 80, bodyY, {
            align: slide.style === 'cover' ? 'center' : 'left',
            width: 920,
            lineGap: 15,
          });

        doc.fontSize(24)
          .fillColor(colors.accent)
          .text(`${slide.slide}/${slides.length}`, 980, 1020, { align: 'right' });
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateSlideImages(_slides: Slide[]): Promise<Buffer[]> {
  throw new Error('generateSlideImages indisponível nesta versão do servidor');
}