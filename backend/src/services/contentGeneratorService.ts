import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import { buildContentReference, buildUserSystemPrompt, settingsToContentProfile } from './userContentProfile';

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface GenerateOptions {
  headline: string;
  snippet: string;
  template: 'post' | 'carousel' | 'article';
  persona?: string;
  niche?: string;
}

interface GeneratedResult {
  text: string;
  hashtags: string[];
  readTime: number;
}

const DEFAULT_SYSTEM_PROMPT = `Você é um especialista em conteúdo profissional para LinkedIn.
Escreva com linguagem técnica mas acessível, sempre com aplicação prática.
Tom: direto, útil e sem clichês motivacionais.
Nunca inventar dados técnicos, leis ou métricas. Basear-se no material fornecido.`;

// Gerar conteúdo via Claude
export async function generateContent(
  userId: string,
  options: GenerateOptions
): Promise<GeneratedResult> {
  // Buscar configurações do usuário
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true, name: true },
  });
  
  const settings = (user?.settings as any) || {};
  const profile = settingsToContentProfile(
    { ...settings, ...(options.niche ? { niche: options.niche } : {}), ...(options.persona ? { persona: options.persona } : {}) },
    user?.name?.split(' ')[0] || 'Usuario',
  );
  const userName = profile.userName;
  const systemPrompt = buildUserSystemPrompt(profile, DEFAULT_SYSTEM_PROMPT);
  
  const templateDescriptions: Record<string, string> = {
    post: 'post único para LinkedIn (máx 3000 caracteres)',
    carousel: 'roteiro para carrossel de 5-7 slides com títulos e bullets',
    article: 'artigo longo formatado para LinkedIn (máx 5000 caracteres)',
  };
  
  const userPrompt = `Baseado nesta notícia/tendência:

TÍTULO: ${options.headline}
RESUMO: ${options.snippet}

Crie um ${templateDescriptions[options.template]} sobre este assunto aplicado ao contexto de ${profile.niche}.

${buildContentReference(profile)}

REGRAS:
- Abertura impactante (gancho forte nos primeiros 2 segundos)
- Conteúdo técnico prático e aplicável
- CTA alinhado ao objetivo do usuario no final
- Tom: ${userName} falando diretamente com o leitor
- Use 2-3 emojis relevantes (não exagere)
- Parágrafos curtos (máx 3 linhas cada)

Retorne SOMENTE JSON válido:
{
  "text": "conteúdo completo do post",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "readTime": 3
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  
  const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error('Claude não retornou JSON válido');
  }
  
  const parsed = JSON.parse(jsonMatch[0]);
  
  return {
    text: parsed.text || rawText,
    hashtags: parsed.hashtags || ['#ManualDoEletricista', '#Eletricista'],
    readTime: parsed.readTime || 3,
  };
}

// Salvar conteúdo gerado
export async function saveGeneratedContent(
  userId: string,
  suggestionId: string,
  data: GeneratedResult,
  template: string
) {
  return prisma.generatedContent.create({
    data: {
      userId,
      suggestionId,
      text: data.text,
      hashtags: data.hashtags,
      template,
      status: 'draft',
    },
  });
}
