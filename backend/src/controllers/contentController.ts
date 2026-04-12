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

    // Buscar instrucoes da IA nas settings do usuario
    let userAiInstructions = '';
    try {
      const userRecord = await prisma.user.findUnique({ where: { id: req.userId! }, select: { settings: true } });
      const settings = (userRecord?.settings as any) || {};
      if (settings.aiInstructions) userAiInstructions = settings.aiInstructions;
    } catch {}

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
${product ? `PRODUTO/LINK A MENCIONAR: ${product} — coloque o link APENAS no campo "cta" do JSON, NAO no corpo do post` : ''}
${tone ? `TOM ADICIONAL: ${tone}` : ''}

${userAiInstructions ? `INSTRUCOES PERSONALIZADAS DO USUARIO (prioridade maxima, siga rigorosamente):\n---\n${userAiInstructions}\n---\n` : ''}

${kbContext ? `BASE DE CONHECIMENTO (use estas informacoes como fonte):\n---\n${kbContext}\n---\n` : ''}

REGRAS IMPORTANTES:
- O corpo do post (campo "content") NAO deve conter o CTA nem o link
- O CTA vai APENAS no campo "cta" do JSON, no formato: texto de chamada + link
- As hashtags vao APENAS no campo "hashtags", NAO no corpo do post
- O corpo deve terminar naturalmente, sem repetir CTA

HASHTAGS A USAR: ${hashtags.join(' ')}

Retorne SOMENTE JSON valido:
{
  "content": "corpo do post SEM cta e SEM hashtags",
  "cta": "frase de chamada para acao + link do produto se houver",
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
    const { platform, content, cta, hashtags, scheduledAt, status, imageUrl } = req.body;
    const post = await prisma.post.create({
      data: {
        userId: req.userId!,
        platform,
        content,
        cta,
        hashtags: Array.isArray(hashtags) ? hashtags.join(' ') : hashtags,
        status: status || 'draft',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        imageUrl: imageUrl || null,
      },
    });
    return res.json(post);
  } catch {
    return res.status(500).json({ error: 'Erro ao salvar post' });
  }
}

export async function updatePost(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status, scheduledAt, imageUrl } = req.body;
    const post = await prisma.post.updateMany({
      where: { id, userId: req.userId! },
      data: {
        ...(status && { status }),
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
        ...(imageUrl && { imageUrl }),
      },
    });
    return res.json(post);
  } catch {
    return res.status(500).json({ error: 'Erro ao atualizar post' });
  }
}

export async function scheduleBatch(req: AuthRequest, res: Response) {
  try {
    const { items } = req.body as { items: { postId: string; scheduledAt: string }[] };
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Nenhum item enviado' });

    const updates = await Promise.all(
      items.map(({ postId, scheduledAt }) =>
        prisma.post.updateMany({
          where: { id: postId, userId: req.userId! },
          data: { status: 'scheduled', scheduledAt: new Date(scheduledAt) },
        })
      )
    );
    return res.json({ scheduled: updates.length, items });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function generateWeeklyPosts(req: AuthRequest, res: Response) {
  try {
    const { topic, platform = 'linkedin', tone = 'mix' } = req.body;
    if (!topic) return res.status(400).json({ error: 'Tema obrigatorio' });

    // Buscar instrucoes da IA nas settings do usuario
    let userAiInstructions = '';
    try {
      const userRecord = await prisma.user.findUnique({ where: { id: req.userId! }, select: { settings: true } });
      const settings = (userRecord?.settings as any) || {};
      if (settings.aiInstructions) userAiInstructions = settings.aiInstructions;
    } catch {}

    const kbContext = await searchKnowledgeForTopic(req.userId!, topic);
    const template = TEMPLATES[platform as 'linkedin' | 'facebook'] || TEMPLATES.linkedin;
    const hashtags = getHashtags(topic, platform);

    const systemPrompt = `Voce e o assistente de conteudo do Jonas, criador do Manual do Eletricista.
Jonas e eletricista industrial e encarregado de obras desde 1997, com especializacao em automacao de armazenagem de graos.
Ele vende ebooks no Hotmart: Vol.1 (go.hotmart.com/E104935068T) e Vol.2 (go.hotmart.com/A105044012Q).
Tom: direto, linguagem de obra, sem academicismo, sem cliches motivacionais. Nunca inventar dados tecnicos.`;

    const userPrompt = `${template}

GERE 7 POSTS DIFERENTES sobre o tema: "${topic}"
Plataforma: ${platform}
${userAiInstructions ? `INSTRUCOES PERSONALIZADAS DO USUARIO (prioridade maxima):\n---\n${userAiInstructions}\n---\n` : ''}
${kbContext ? `BASE DE CONHECIMENTO:\n---\n${kbContext}\n---\n` : ''}

Angulos obrigatorios (um por post, nessa ordem):
1. "dor" - problema/frustacao que todo eletricista conhece
2. "dica" - tecnica pratica do campo, nao do livro
3. "erro" - engano comum que custa caro ou e perigoso
4. "conceito" - explicacao tecnica simplificada
5. "historia" - caso real de obra (sem nome de cliente)
6. "comparacao" - antes/depois ou certo/errado lado a lado
7. "cta" - post com chamada clara para o ebook

REGRAS:
- "content" = corpo do post SEM cta e SEM hashtags
- "cta" = chamada para acao (inclua link go.hotmart.com/E104935068T no post 7)
- Horarios sugeridos: 8h, 9h, 10h, 12h, 17h, 18h, 19h

Retorne SOMENTE JSON valido:
{
  "posts": [
    {
      "day": "Segunda",
      "suggestedTime": "08:00",
      "angle": "dor",
      "content": "corpo do post",
      "cta": "chamada",
      "hashtags": ${JSON.stringify(hashtags)}
    }
  ]
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao gerar posts semanais' });
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
