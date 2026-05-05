// backend/src/controllers/contentController.ts
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { AuthRequest } from '../middleware/authGuard';
import { getKnowledgeReferenceForUser, searchKnowledgeForTopic } from './knowledgeController';
import {
  fetchGoogleNewsSuggestions,
  fetchLinkedInNewsSuggestions,
  getCachedSuggestions,
  saveSuggestions,
} from '../services/suggestionsService';
import { normalizeSuggestionViews, toSuggestionsResponse } from '../services/suggestionsContract';
import {
  buildContentReference,
  buildResearchQuery,
  buildUserSystemPrompt,
  getUserContentProfile,
} from '../services/userContentProfile';

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function normalizeWeeklyPostsResult(raw: any) {
  const posts = Array.isArray(raw?.posts) ? raw.posts : [];
  return {
    posts: posts
      .map((post: any, index: number) => ({
        day: String(post?.day || ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'][index] || 'Segunda'),
        suggestedTime: String(post?.suggestedTime || '08:00'),
        angle: String(post?.angle || 'pratico'),
        content: String(post?.content || '').trim(),
        cta: String(post?.cta || '').trim(),
        hashtags: typeof post?.hashtags === 'string'
          ? post.hashtags.trim()
          : Array.isArray(post?.hashtags)
            ? post.hashtags.join(' ').trim()
            : '',
      }))
      .filter((post: any) => post.content.length > 20),
  };
}

function parseWeeklyPostsResponse(text: string) {
  const cleanedText = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();

  const candidates: string[] = [];
  const objectMatch = cleanedText.match(/\{[\s\S]*\}/);
  if (objectMatch) candidates.push(objectMatch[0]);

  const arrayMatch = cleanedText.match(/\[[\s\S]*\]/);
  if (arrayMatch) candidates.push(`{"posts":${arrayMatch[0]}}`);

  candidates.push(cleanedText);

  for (const candidate of candidates) {
    const normalizedCandidate = candidate
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/\u0000/g, '')
      .trim();

    try {
      const parsed = JSON.parse(normalizedCandidate);
      const normalized = normalizeWeeklyPostsResult(parsed);
      if (normalized.posts.length > 0) return normalized;
    } catch {}
  }

  throw new Error('JSON invalido retornado pela IA');
}

async function extractTextFromFile(buffer: Buffer, mimetype: string, niche = 'conteudo tecnico'): Promise<string> {
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
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimetype as 'image/jpeg' | 'image/png' | 'image/webp', data: base64 } },
          { type: 'text', text: `Descreva em detalhes este material relacionado ao nicho: ${niche}. Se houver texto, transcreva. Se for diagrama, processo ou documento tecnico, descreva os componentes, etapas e informacoes importantes.` },
        ],
      }],
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  return '';
}

const HASHTAG_SETS: Record<string, string[]> = {
  default: ['#ConteudoProfissional', '#LinkedInBrasil', '#DicaPratica', '#Carreira', '#Negocios'],
  automacao: ['#ManualDoEletricista', '#AutomacaoIndustrial', '#Eletricista', '#ArmazenamentoDeGraos', '#AgronegocioBrasil'],
  motores: ['#ManualDoEletricista', '#MotoresEletricos', '#Eletricista', '#ManutencaoEletrica', '#EletricidadeIndustrial'],
  sensores: ['#ManualDoEletricista', '#Sensores', '#Eletricista', '#AutomacaoIndustrial', '#InstalacaoEletrica'],
  protecao: ['#ManualDoEletricista', '#ProtecaoEletrica', '#Eletricista', '#NR10', '#SegurancaEletrica'],
  comando: ['#ManualDoEletricista', '#CirquitosDeComando', '#Eletricista', '#ContatoresEletricos', '#ManutencaoEletrica'],
  paineis: ['#ManualDoEletricista', '#PaineisEletricos', '#Eletricista', '#ProjetosEletricos', '#EletricidadeIndustrial'],
  linkedin: ['#ManualDoEletricista', '#Eletricista', '#MercadoEletrico', '#CarreiraEletricista', '#TecnologiaEletrica'],
};

function hashtagFromTerm(term: string) {
  const normalized = term
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
  return normalized ? `#${normalized}` : '';
}

function getHashtags(topic: string, platform: string, niche = ''): string[] {
  const contextual = [topic, niche]
    .join(' ')
    .split(/[,;|]/)
    .map(hashtagFromTerm)
    .filter(Boolean)
    .slice(0, 5);
  if (contextual.length >= 3) return contextual;

  const t = topic.toLowerCase();
  if (platform === 'linkedin' && !niche) return HASHTAG_SETS.linkedin;
  if (t.includes('automa') || t.includes('grao') || t.includes('silo')) return HASHTAG_SETS.automacao;
  if (t.includes('motor')) return HASHTAG_SETS.motores;
  if (t.includes('sensor') || t.includes('fim de curso') || t.includes('boia')) return HASHTAG_SETS.sensores;
  if (t.includes('protec') || t.includes('disjuntor') || t.includes('fusivel') || t.includes('nr10')) return HASHTAG_SETS.protecao;
  if (t.includes('comando') || t.includes('contator') || t.includes('rele')) return HASHTAG_SETS.comando;
  if (t.includes('painel') || t.includes('quadro')) return HASHTAG_SETS.paineis;
  return [...contextual, ...HASHTAG_SETS.default].slice(0, 5);
}

const TEMPLATES = {
  linkedin: `FORMATO LINKEDIN - Profissional e Autoridade:
🎯 ESTRUTURA VARIADA (escolha UMA das opcoes abaixo conforme o tema):

OPCAO 1 - "A verdade que ninguem conta":
🔥 Gancho: "[Afirmacao polemica ou contraintuitiva sobre o tema]"
💡 Desenvolvimento: Contexto + problema real
⚡ Virada: O insight ou solucao pratica
✅ Conclusao: Mencione o produto/servico naturalmente

OPCAO 2 - "Erro que custa caro":
❌ Gancho: "[Erro comum que todo mundo comete]"
📊 Impacto: Quanto isso custa ou prejudica
🎯 Solucao: Como fazer certo passo a passo
💼 CTA: Como voce pode ajudar

OPCAO 3 - "O que aprendi na pratica":
💭 Gancho: "[Licao aprendida com experiencia real]"
📖 Contexto: Breve historia ou situacao
🔑 Aprendizado: O insight principal
🚀 Aplicacao: Como usar isso hoje

OPCAO 4 - "Comparativo direto":
⚖️ Gancho: "[Antes vs Depois] ou [Certo vs Errado]"
📋 Lado A: Como a maioria faz (errado)
✅ Lado B: Como deveria ser (certo)
🎯 Dica bonus: Um detalhe extra

REGRAS LINKEDIN:
- Use 2-3 emojis relevantes no texto (nao exagere)
- Paragrafos curtos (max 3 linhas cada)
- Linguagem profissional mas conversacional
- Limite: 1300 caracteres
- CTA sutil no final`,

  facebook: `FORMATO FACEBOOK - Engajamento e Conversa:
🎯 ESTRUTURA VARIADA (escolha UMA das opcoes abaixo):

OPCAO 1 - "Pergunta que gera discussao":
❓ [Pergunta direta relacionada ao tema]
📝 [Contexto curto em 2-3 linhas]
👇 "Comenta aqui sua experiencia!"

OPCAO 2 - "Dica rapida de hoje":
💡 "[Dica pratica em uma frase]"
📌 [Explicacao rapida em 3-4 linhas]
❤️ "Curta se voce ja sabia disso!"

OPCAO 3 - "Marcar o amigo":
😂 "[Situacao engracada ou identificavel]"
👥 [Contexto em 2-3 linhas]
🏷️ "Marca aquele colega que precisa ver isso!"

OPCAO 4 - "Votação simples":
🤔 "[Pergunta com duas opcoes]"
A) [Opcao 1]
B) [Opcao 2]
👇 "Comenta A ou B!"

REGRAS FACEBOOK:
- Use 1-2 emojis por paragrafo
- Texto curto e direto (max 500 caracteres)
- Linguagem mais casual e proxima
- Perguntas que geram comentarios
- CTA clara para engajamento`,
};

export async function generatePost(req: AuthRequest, res: Response) {
  try {
    const { topic, platform, tone, product, kbIds } = req.body;

    const profile = await getUserContentProfile(prisma, req.effectiveUserId!);

    let kbContext = '';
    if (kbIds && Array.isArray(kbIds) && kbIds.length > 0) {
      const items = await prisma.knowledgeBase.findMany({
        where: { id: { in: kbIds }, userId: req.effectiveUserId! },
        select: { title: true, content: true },
      });
      kbContext = items.map(i => `[${i.title}]\n${i.content.substring(0, 2000)}`).join('\n\n---\n\n');
    } else {
      kbContext = await searchKnowledgeForTopic(req.effectiveUserId!, topic);
    }

    const hashtags = getHashtags(topic, platform || 'linkedin', profile.niche);
    const template = TEMPLATES[platform as 'linkedin' | 'facebook'] || TEMPLATES.linkedin;

    const systemPrompt = buildUserSystemPrompt(
      profile,
      `Voce e um assistente especializado em criacao de conteudo para ${profile.userName}.`,
    );

    const userPrompt = `🎨 CRIE UM POST UNICO E CRIATIVO SOBRE O TEMA ABAIXO

TEMA: ${topic}
PLATAFORMA: ${platform || 'linkedin'}
${product ? `PRODUTO/LINK A MENCIONAR: ${product} - coloque o link APENAS no campo "cta" do JSON, NAO no corpo do post` : ''}
${tone ? `TOM ADICIONAL: ${tone}` : ''}

${buildContentReference(profile)}

${template}

${kbContext ? `📚 BASE DE CONHECIMENTO (use como fonte):
---
${kbContext}
---

` : ''}⚠️ REGRAS OBRIGATORIAS:
1. ESCOLHA APENAS UMA das opcoes de estrutura acima (nao misture)
2. Use emojis relevantes (2-3 para LinkedIn, 1-2 para Facebook)
3. O corpo do post (campo "content") NAO deve conter o CTA nem hashtags
4. O CTA vai APENAS no campo "cta" do JSON
5. As hashtags vao APENAS no campo "hashtags"
6. Varie o formato a cada post - nao fique repetindo a mesma estrutura
7. Seja criativo e evite clichês como "Voce sabia que..."
8. GERE HASHTAGS CONTEXTUAIS baseadas no tema, relevantes para ${profile.niche}

HASHTAGS SUGERIDAS (use como inspiracao ou crie melhores): ${hashtags.join(' ')}

Retorne SOMENTE JSON valido:
{
  "content": "corpo do post SEM cta e SEM hashtags - com emojis e formato variado",
  "cta": "chamada para acao + link do produto se houver",
  "hashtags": "#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
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
    const profile = await getUserContentProfile(prisma, req.effectiveUserId!);
    const kbContext = await getKnowledgeReferenceForUser(req.effectiveUserId!, 3);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Analise este post para ${platform}.

${buildContentReference(profile)}
${kbContext ? `\nBASE DE CONHECIMENTO DO USUARIO:\n${kbContext}\n` : ''}

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
    const profile = await getUserContentProfile(prisma, req.effectiveUserId!);
    const kbContext = await getKnowledgeReferenceForUser(req.effectiveUserId!, 5);

    const kbItems = await prisma.knowledgeBase.findMany({
      where: { userId: req.effectiveUserId!, active: true },
      select: { title: true, tags: true },
      take: 20,
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Crie um calendario editorial de ${weeks} semanas.

${buildContentReference(profile)}
${kbContext ? `\nBASE DE CONHECIMENTO DO USUARIO (use para puxar temas e evitar conteudo generico):\n${kbContext}\n` : ''}

Plataformas: ${platforms.join(', ')}.
Materiais: ${kbItems.map(i => i.title).join(', ') || `conteudo geral sobre ${profile.niche}`}.
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
    const profile = await getUserContentProfile(prisma, req.effectiveUserId!);
    const kbContext = await getKnowledgeReferenceForUser(req.effectiveUserId!, 3);
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Analise este material e identifique temas com potencial de engajamento.

${buildContentReference(profile)}
${kbContext ? `\nBASE DE CONHECIMENTO DO USUARIO:\n${kbContext}\n` : ''}

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
    where: { userId: req.effectiveUserId! },
    orderBy: [
      { scheduledAt: 'desc' },
      { publishedAt: 'desc' },
      { createdAt: 'desc' },
    ],
  });
  return res.json(posts);
}

export async function savePost(req: AuthRequest, res: Response) {
  try {
    const { platform, content, cta, hashtags, scheduledAt, status, imageUrl } = req.body;
    const finalStatus = status || 'draft';
    const post = await prisma.post.create({
      data: {
        userId: req.effectiveUserId!,
        platform,
        content,
        cta,
        hashtags: Array.isArray(hashtags) ? hashtags.join(' ') : hashtags,
        status: finalStatus,
        scheduledAt: finalStatus === 'scheduled' && scheduledAt ? new Date(scheduledAt) : null,
        imageUrl: imageUrl || null,
      },
    });
    return res.json(post);
  } catch {
    return res.status(500).json({ error: 'Erro ao salvar post' });
  }
}

export async function savePostsBatch(req: AuthRequest, res: Response) {
  try {
    const { posts } = req.body;
    if (!Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({ error: 'Lista de posts obrigatoria' });
    }

    const created = await prisma.$transaction(
      posts.map((item: any) =>
        {
          const finalStatus = item.status || 'draft';
          return prisma.post.create({
            data: {
              userId: req.effectiveUserId!,
              platform: item.platform,
              content: item.content,
              cta: item.cta || null,
              hashtags: Array.isArray(item.hashtags) ? item.hashtags.join(' ') : (item.hashtags || null),
              status: finalStatus,
              scheduledAt: finalStatus === 'scheduled' && item.scheduledAt ? new Date(item.scheduledAt) : null,
              imageUrl: item.imageUrl || null,
            },
          });
        }
      )
    );

    return res.json({ ok: true, count: created.length, posts: created });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao salvar posts em lote' });
  }
}

export async function updatePost(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status, scheduledAt, imageUrl } = req.body;
    const post = await prisma.post.updateMany({
      where: { id, userId: req.effectiveUserId! },
      data: {
        ...(status && { status }),
        ...(status === 'draft' ? { scheduledAt: null } : {}),
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
        ...(imageUrl && { imageUrl }),
      },
    });
    return res.json(post);
  } catch {
    return res.status(500).json({ error: 'Erro ao atualizar post' });
  }
}

export async function deletePost(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    await prisma.post.deleteMany({
      where: { id, userId: req.effectiveUserId! },
    });
    return res.json({ success: true, message: 'Post excluido com sucesso' });
  } catch {
    return res.status(500).json({ error: 'Erro ao excluir post' });
  }
}

export async function scheduleBatch(req: AuthRequest, res: Response) {
  try {
    const { items } = req.body as { items: { postId: string; scheduledAt: string }[] };
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Nenhum item enviado' });

    const updates = await Promise.all(
      items.map(({ postId, scheduledAt }) =>
        prisma.post.updateMany({
          where: { id: postId, userId: req.effectiveUserId! },
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

    const profile = await getUserContentProfile(prisma, req.effectiveUserId!);

    const kbContext = await searchKnowledgeForTopic(req.effectiveUserId!, topic);
    const template = TEMPLATES[platform as 'linkedin' | 'facebook'] || TEMPLATES.linkedin;
    const hashtags = getHashtags(topic, platform, profile.niche);

    const systemPrompt = buildUserSystemPrompt(
      profile,
      `Voce e um assistente especializado em criacao de conteudo para ${profile.userName}.`,
    );

    const userPrompt = `🎨 GERE 7 POSTS UNICOS E VARIADOS sobre o tema: "${topic}"

PLATAFORMA: ${platform}
${buildContentReference(profile)}

${template}

${kbContext ? `📚 BASE DE CONHECIMENTO:
---
${kbContext}
---

` : ''}🎯 VARIACAO DE FORMATOS (use um diferente para cada dia):
- Segunda: "A verdade que ninguem conta" (polemico/contraintuitivo)
- Terca: "Erro que custa caro" (problema + solucao)
- Quarta: "O que aprendi na pratica" (historia/licao)
- Quinta: "Comparativo direto" (antes/depois ou certo/errado)
- Sexta: "Pergunta que gera discussao" (engajamento)
- Sabado: "Dica rapida de hoje" (valor rapido)
- Domingo: "Marcar o amigo" (situacao identificavel)

⚠️ REGRAS:
- Cada post deve ter ESTRUTURA DIFERENTE (nao repita o mesmo formato)
- Use emojis relevantes (2-3 para LinkedIn, 1-2 para Facebook)
- "content" = corpo do post SEM cta e SEM hashtags
- "cta" = chamada para acao (inclua link no post 7 se houver produto)
- GERE HASHTAGS CONTEXTUAIS baseadas no tema de cada post
- Horarios sugeridos: 8h, 9h, 10h, 12h, 17h, 18h, 19h
- NUNCA escreva texto antes ou depois do JSON
- NUNCA use markdown, observacoes ou comentarios
- Todas as strings devem estar entre aspas duplas validas JSON
- Retorne apenas um objeto JSON com a chave "posts"

Retorne SOMENTE JSON valido:
{
  "posts": [
    {
      "day": "Segunda",
      "suggestedTime": "08:00",
      "angle": "verdade",
      "content": "corpo do post com emojis",
      "cta": "chamada",
      "hashtags": "#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5"
    }
  ]
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

    try {
      const result = parseWeeklyPostsResponse(text);
      return res.json(result);
    } catch (parseError: any) {
      console.error('[generateWeeklyPosts] Erro ao fazer parse do JSON:', parseError.message);
      console.error('[generateWeeklyPosts] Resposta bruta:', text.substring(0, 1500));
      return res.status(500).json({ error: 'JSON invalido retornado pela IA' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao gerar posts semanais' });
  }
}

export async function uploadAndGeneratePosts(req: AuthRequest, res: Response) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const { originalname, mimetype, buffer } = req.file;
    const { platform = 'linkedin', tone = 'direto, pratico e profissional', quantity = '5' } = req.body;
    const profile = await getUserContentProfile(prisma, req.effectiveUserId!);

    let extractedText = '';

    extractedText = await extractTextFromFile(buffer, mimetype, profile.niche);

    if (!extractedText.trim()) return res.status(422).json({ error: 'Nao foi possivel extrair conteudo.' });

    const hashtags = getHashtags(extractedText.substring(0, 200), platform, profile.niche);
    const template = TEMPLATES[platform as 'linkedin' | 'facebook'] || TEMPLATES.linkedin;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: buildUserSystemPrompt(
        profile,
        `Voce e um assistente especializado em transformar materiais em conteudo para ${profile.userName}.`,
      ),
      messages: [{
        role: 'user',
        content: `${buildContentReference(profile)}

${template}

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
    
    // Extrair apenas o JSON da resposta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'IA nao retornou JSON valido' });
    }
    
    try {
      const result = JSON.parse(jsonMatch[0].replace(/```json|```/g, '').trim());
      return res.json({ filename: originalname, type: mimetype, extractedLength: extractedText.length, ...result });
    } catch (parseError: any) {
      return res.status(500).json({ error: 'JSON invalido retornado pela IA' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// Sugestões de conteúdo (Google News RSS como radar de tendências)
export async function getSuggestions(req: AuthRequest, res: Response) {
  try {
    const source = req.query.source === 'linkedin' ? 'linkedin' : 'google';
    const date = String(req.query.date || new Date().toISOString());

    const profile = await getUserContentProfile(prisma, req.effectiveUserId!);
    const query = buildResearchQuery(profile);

    let suggestions = source === 'linkedin'
      ? await fetchLinkedInNewsSuggestions(query, date)
      : await fetchGoogleNewsSuggestions(query, date);

    if (suggestions.length > 0) {
      await saveSuggestions(req.effectiveUserId!, source, suggestions);
    } else {
      suggestions = await getCachedSuggestions(req.effectiveUserId!, source, date);
      if (suggestions.length > 0) {
        console.log(`[getSuggestions] Usando cache para ${source} sem resultado novo`);
      }
    }

    const normalized = normalizeSuggestionViews(source, suggestions);
    return res.json(toSuggestionsResponse(normalized));
  } catch (err: any) {
    console.error('[getSuggestions]', err);
    const fallback = normalizeSuggestionViews('fallback', [
      {
        headline: 'Tendências do nicho configurado podem virar pauta prática',
        url: 'https://www.linkedin.com/news/',
        source: 'fallback',
        snippet: 'Use a configuracao de nicho do usuario como filtro enquanto o radar externo estiver indisponivel.',
      },
      {
        headline: 'Transforme noticias recentes em posts educativos e comerciais',
        url: 'https://news.google.com/',
        source: 'fallback',
        snippet: 'Pauta evergreen alinhada ao publico e objetivo salvos nas configuracoes.',
      },
    ]);
    return res.json(toSuggestionsResponse(fallback));
  }
}
