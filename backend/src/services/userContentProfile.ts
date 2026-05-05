import { PrismaClient } from '@prisma/client';

export interface UserContentProfile {
  userName: string;
  niche: string;
  audience: string;
  contentGoals: string;
  blockedTopics: string;
  aiInstructions: string;
  persona: string;
}

const DEFAULT_NICHE = 'eletricidade industrial, CLP, automacao industrial, NR10, manutencao eletrica no Brasil';
const DEFAULT_AUDIENCE = 'eletricistas, tecnicos de manutencao, profissionais de automacao e eletricistas industriais no Brasil';
const DEFAULT_GOALS = 'gerar autoridade, educar o publico, captar leads e vender produtos tecnicos quando fizer sentido';
const RH_NICHE = 'departamento pessoal, RH, legislacao trabalhista brasileira, folha de pagamento, eSocial, recrutamento e gestao de pessoas';
const RH_AUDIENCE = 'profissionais de RH, departamento pessoal, gestores, pequenas empresas e trabalhadores no Brasil';

export function normalizeText(value: unknown, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function defaultsForUser(userName: string) {
  const key = userName.toLowerCase();
  if (key.includes('niulaine') || key.includes('niulane')) {
    return { niche: RH_NICHE, audience: RH_AUDIENCE, goals: 'gerar autoridade em RH/DP, educar empresas e profissionais e captar oportunidades comerciais' };
  }
  return { niche: DEFAULT_NICHE, audience: DEFAULT_AUDIENCE, goals: DEFAULT_GOALS };
}

export function settingsToContentProfile(settings: any, userName = 'Usuario'): UserContentProfile {
  const defaults = defaultsForUser(userName);
  const niche = normalizeText(settings?.niche || settings?.contentNiche, defaults.niche);
  const audience = normalizeText(settings?.audience || settings?.targetAudience, defaults.audience);
  return {
    userName,
    niche,
    audience,
    contentGoals: normalizeText(settings?.contentGoals || settings?.goals, defaults.goals),
    blockedTopics: normalizeText(settings?.blockedTopics),
    aiInstructions: normalizeText(settings?.generatorInstructions || settings?.aiInstructions),
    persona: normalizeText(settings?.persona),
  };
}

export async function getUserContentProfile(prisma: PrismaClient, userId: string): Promise<UserContentProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, settings: true },
  });
  return settingsToContentProfile(user?.settings as any, user?.name?.split(' ')[0] || 'Usuario');
}

export function buildResearchQuery(profile: UserContentProfile, extra = '') {
  return [profile.niche, profile.audience, extra].filter(Boolean).join(' ');
}

export function buildContentReference(profile: UserContentProfile) {
  return `REFERENCIA DO USUARIO:
- Nicho principal: ${profile.niche}
- Publico-alvo: ${profile.audience}
- Objetivo do conteudo: ${profile.contentGoals}
${profile.blockedTopics ? `- Evitar assuntos: ${profile.blockedTopics}` : ''}
${profile.aiInstructions ? `
PROMPT DAS CONFIGURACOES (prioridade alta):
${profile.aiInstructions}` : ''}

Use essa referencia e o prompt das configuracoes como filtro. Nao misture nichos de outros usuarios.`;
}

export function buildUserSystemPrompt(profile: UserContentProfile, fallbackRole: string) {
  const persona = profile.persona || fallbackRole;
  return `${persona}

${buildContentReference(profile)}

Nunca invente dados tecnicos, leis, metricas ou links. Pesquise/adapte pelo contexto recebido e preserve o nicho do usuario.`;
}
