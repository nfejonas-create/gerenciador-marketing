// backend/src/controllers/contentController.ts
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { AuthRequest } from '../middleware/authGuard';
import { searchKnowledgeForTopic } from './knowledgeController';

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function extractTextFromFile(buffer: Buffer, mimetype: string): Promise<string> {
  const base64 = buffer.toString('base64');

  if (mimetype === 'application/pdf') {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } } as any,
          { type: 'text', text: 'Extraia todo o conteudo tecnico deste documento para uso na geracao de posts.' },
        ],
      }],
    });
    return response.content[0].type === 'text' ? response.content[0].text.substring(0, 8000) : '';
  }

  if (mimetype === 'text/plain') return buffer.toString('utf-8').substring(0, 8000);

  if (mimetype.startsWith('image/')) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimetype as 'image/jpeg' | 'image/png' | 'image/webp', data: base64 } },
          { type: 'text', text: 'Descreva em detalhes este material tecnico eletrico. Se houver texto, transcreva. Se for esquema eletrico, descreva os componentes e conexoes.' },
        ],
      }],
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  return '';
}

const HASHTAG_SETS: Record<string, string[]> = {
  default: ['#ManualDoEletricista', '#Eletricista', '#Eletrica', '#InstalacaoEletrica', '#EletricidadeIndustrial'],
  automacao: ['#ManualDoEletricista', '#AutomacaoIndustrial', '#Eletricista', '#ArmazenamentoDeGraos', '#AgronegocioBrasil'],
  motores: ['#ManualDoEletricista', '#MotoresEletricos', '#Eletricista', '#ManutencaoEletrica', '#EletricidadeIndustrial'],
  sensores: ['#ManualDoEletricista', '#Sensores', '#Eletricista', '#AutomacaoIndustrial', '#InstalacaoEletrica'],
  protecao: ['#ManualDoEletricista', '#ProtecaoEletrica', '#Eletricista', '#NR10', '#SegurancaEletrica'],
  comando: ['#ManualDoEletricista', '#CirquitosDeComando', '#Eletricista', '#ContatoresEletricos', '#ManutencaoEletrica'],
  paineis: ['#ManualDoEletricista', '#PaineisEletricos', '#Eletricista', '#ProjetosEletricos', '#EletricidadeIndustrial'],
  linkedin: ['#ManualDoEletricista', '#Eletricista', '#MercadoEletrico', '#CarreiraEletricista', '#TecnologiaEletrica'],
};

function getHashtags(topic: string, platform: string): string[] {
  const t = topic.toLowerCase();
  if (platform === 'linkedin') return HASHTAG_SETS.linkedin;
  if (t.includes('automa') || t.includes('grao') || t.includes('silo')) return HASHTAG_SETS.automacao;
  if (t.includes('motor')) return HASHTAG_SETS.motores;
  if (t.includes('sensor') || t.includes('fim de curso') || t.includes('boia')) return HASHTAG_SETS.sensores;
  if (t.includes('protec') || t.includes('disjuntor') || t.includes('fusivel') || t.includes('nr10')) return HASHTAG_SETS.protecao;
  if (t.includes('comando') || t.includes('contator') || t.includes('rele')) return HASHTAG_SETS.comando;
  if (t.includes('painel') || t.includes('quadro')) return HASHTAG_SETS.paineis;
  return HASHTAG_SETS.default;
}

const TEMPLATES = {
  linkedin: `FORMATO OBRIGATORIO - LinkedIn (Manual do Eletricista):
LINHA 1 (gancho): Frase de 1 linha que provoca, contraria ou afirma algo que todo eletricista ja viveu. NUNCA comece com "Voce sabia".
[linha em branco]
PARAGRAFO (contexto, 3-4 linhas): Situacao real de obra ou campo. Tom de conversa entre profissionais.
[linha em branco]
PARAGRAFO (virada, 2-3 linhas): O erro comum ou detalhe que faz diferenca na pratica.
[linha em branco]
PARAGRAFO (solucao, 2-3 linhas): O que fazer diferente. Baseado em experiencia de campo.
[linha em branco]
CTA (1 linha): Mencionar o Manual do Eletricista naturalmente.
LIMITE: 1300 caracteres.`,

  facebook: `FORMATO OBRIGATORIO - Facebook (Manual do Eletricista):
LINHA 1: Pergunta direta OU afirmacao que gera identificacao. Curta. Impactante.
CORPO (4-6 linhas): Situacao pratica, dica rapida ou erro comum. Linguagem de obra.
ENCERRAMENTO: Convite para comentar ou marcar um colega eletricista.
LIMITE: 500 caracteres.`,
};

export async function generatePost(req: AuthRequest, res: Response) {
  try {
    const { topic, platform, tone, product, kbIds } = req.body;

    let kbContext = '';
    if (kbIds && Array.isArray(kbIds) && kbIds.length > 0) {
      const items = await prisma.knowledgeBase.findMany({
        where: { id: { in: kbIds }, userId: req.userId! },
        select: { title: true, content: true },
      });
      kbContext = items.map(i => `[${i.title}]\n${i.content.substring(0, 2000)}`).join('\n\n---\n\n');
    } else {
      kbContext = await searchKnowledgeForTopic(req.userId!, topic);
    }

    const hashtags = getHashtags(topic, platform || 'linkedin');
    const template = TEMPLATES[platform as 'linkedin' | 'facebook'] || TEMPLATES.linkedin;

    const systemPrompt = `Voce e o assistente de conteudo do Jonas, criador do Manual do Eletricista.
Jonas e eletricista industrial e encarregado de obras desde 1997, com especializacao em automacao de armazenagem de graos.
Ele vende ebooks tecnicos no Hotmart: Vol. 1 (go.hotmart.com/E104935068T) e Vol. 2 (go.hotmart.com/A105044012Q).
Tom: direto, linguagem de obra, sem academicismo, sem cliches motivacionais.
Nunca inventar dados tecnicos. Basear-se no material fornecido.`;

    const userPrompt = `${template}

TEMA: ${topic}
${product ? `PRODUTO A MENCIONAR: ${product}` : ''}
${tone ? `TOM ADICIONAL: ${tone}` : ''}

${kbContext ? `BASE DE CONHECIMENTO (use estas informacoes como fonte):\n---\n${kbContext}\n---\n` : ''}

HASHTAGS A USAR (cole no final): ${hashtags.join(' ')}

Gere o post no formato exato acima e retorne SOMENTE JSON valido:
{
  "content": "texto completo do post com quebras de linha corretas",
  "cta": "a linha de CTA isolada",
  "hashtags": ${JSON.stringify(hashtags)}
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao gerar post' });
  }
}

export async function analyzeContent(req: AuthRequest, res: Response) {
  try {
    const { content, platform = 'linkedin' } = req.body;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Analise este post para ${platform} do Manual do Eletricista:
1. Gancho, 2. Clareza, 3. CTA, 4. Hashtags, 5. Tamanho

POST: "${content}"

Retorne SOMENTE JSON:
{
  "score": 0-10,
  "strengths": ["ponto forte 1"],
  "improvements": ["melhoria 1"],
  "rewritten": "versao melhorada se score < 7, senao null"
}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return res.json(JSON.parse(text.replace(/```json|```/g, '').trim()));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function generateCalendar(req: AuthRequest, res: Response) {
  try {
    const { weeks = 4, platforms = ['linkedin', 'facebook'] } = req.body;

    const kbItems = await prisma.knowledgeBase.findMany({
      where: { userId: req.userId!, active: true },
      select: { title: true, tags: true },
      take: 20,
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Crie um calendario editorial de ${weeks} semanas para o Manual do Eletricista.
Plataformas: ${platforms.join(', ')}.
Materiais: ${kbItems.map(i => i.title).join(', ') || 'conteudo geral de eletricidade industrial'}.
Cadencia: LinkedIn 3x/semana (Seg, Qua, Sex) + Facebook 5x/semana.

Retorne JSON:
{
  "calendar": [
    { "week": 1, "day": "Segunda", "platform": "linkedin", "topic": "...", "type": "autoridade|dica|erro|cta_ebook" }
  ]
}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return res.json(JSON.parse(text.replace(/```json|```/g, '').trim()));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function analyzeMaterial(req: AuthRequest, res: Response) {
  try {
    const { text, title } = req.body;
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Analise este material e identifique temas com potencial de engajamento:
"${title || 'Material'}"\n\n${text.substring(0, 3000)}

Retorne JSON:
{
  "themes": [{ "topic": "...", "potential": "alto|medio|baixo", "postIdeas": ["ideia 1"] }]
}`,
      }],
    });
    const t = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return res.json(JSON.parse(t.replace(/```json|```/g, '').trim()));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getPosts(req: AuthRequest, res: Response) {
  const posts = await prisma.post.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(posts);
}

export async function savePost(req: AuthRequest, res: Response) {
  try {
    const { platform, content, cta, hashtags, scheduledAt, status } = req.body;
    const post = await prisma.post.create({
      data: {
        userId: req.userId!,
        platform,
        content,
        cta,
        hashtags: Array.isArray(hashtags) ? hashtags.join(' ') : hashtags,
        status: status || 'draft',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });
    return res.json(post);
  } catch {
    return res.status(500).json({ error: 'Erro ao salvar post' });
  }
}

export async function uploadAndGeneratePosts(req: AuthRequest, res: Response) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const { originalname, mimetype, buffer } = req.file;
    const { platform = 'linkedin', tone = 'direto, linguagem de obra', quantity = '5' } = req.body;

    let extractedText = '';

    extractedText = await extractTextFromFile(buffer, mimetype);

    if (!extractedText.trim()) return res.status(422).json({ error: 'Nao foi possivel extrair conteudo.' });

    const hashtags = getHashtags(extractedText.substring(0, 200), platform);
    const template = TEMPLATES[platform as 'linkedin' | 'facebook'] || TEMPLATES.linkedin;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: `Voce e assistente do Manual do Eletricista. Jonas e eletricista industrial desde 1997. Tom: direto, linguagem de obra.`,
      messages: [{
        role: 'user',
        content: `${template}

Gere exatamente ${quantity} posts para ${platform} com base neste material:
---
${extractedText}
---
Tom: ${tone}
Hashtags: ${hashtags.join(' ')}

Retorne SOMENTE JSON:
{
  "summary": "resumo do material em 2 frases",
  "posts": [{ "theme": "nome do tema", "content": "texto completo", "cta": "chamada", "hashtags": ${JSON.stringify(hashtags)} }]
}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());
    return res.json({ filename: originalname, type: mimetype, extractedLength: extractedText.length, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
