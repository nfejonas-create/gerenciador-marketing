// Estratégias de conteúdo baseadas em pesquisa LinkedIn 2024
// Fontes: análise de posts com maior engajamento

export type HookType = 
  | 'confession' 
  | 'curiosity' 
  | 'story' 
  | 'credibility' 
  | 'question' 
  | 'contrarian' 
  | 'list' 
  | 'urgency';

export type StructureType = 
  | 'aida' 
  | 'pas' 
  | 'listicle' 
  | 'storytelling' 
  | 'howto' 
  | 'comparison';

export interface ContentStrategy {
  hook: HookType;
  structure: StructureType;
  cta: string;
  template: string;
  example: string;
}

// Hooks de alta conversão (baseado em dados 2024)
export const HOOKS: Record<HookType, { label: string; templates: string[] }> = {
  confession: {
    label: 'Confissão Profissional',
    templates: [
      'Vou ser honesto com você...',
      'Preciso confessar uma coisa...',
      'Ninguém me perguntou, mas vou contar...',
      'Errei feio e aprendi...',
      'Vou te contar o que ninguém conta...'
    ]
  },
  curiosity: {
    label: 'Curiosidade/Gap de Conhecimento',
    templates: [
      'Você sabia que...',
      'O segredo que os experts não contam...',
      'Descobri algo que mudou tudo...',
      'Por que ninguém fala sobre...',
      'A verdade sobre...'
    ]
  },
  story: {
    label: 'Storytelling',
    templates: [
      'Em 2020 eu estava quebrado...',
      'Meu cliente me disse uma coisa que mudou tudo...',
      'Aconteceu algo incrível ontem...',
      'Lembro como se fosse ontem...',
      'Essa história vai te surpreender...'
    ]
  },
  credibility: {
    label: 'Credibilidade/Autoridade',
    templates: [
      'Depois de 10 anos nesse mercado...',
      'Já ajudei mais de 500 clientes a...',
      'Como especialista em...',
      'O que aprendi processando R$ X em vendas...',
      'Minha experiência com...'
    ]
  },
  question: {
    label: 'Pergunta Engajadora',
    templates: [
      'Você já se perguntou por que...',
      'Qual dessas opções você escolheria?',
      'Será que você está cometendo esse erro?',
      'Quantas vezes você...',
      'Você concorda com isso?'
    ]
  },
  contrarian: {
    label: 'Opinião Impopular/Contraponto',
    templates: [
      'Vou ser polêmico aqui...',
      'Discordo de 99% das pessoas sobre...',
      'O que ninguém quer te contar...',
      'Mentira: [tema popular]. A verdade é...',
      'Pare de fazer isso agora...'
    ]
  },
  list: {
    label: 'Lista de Valor',
    templates: [
      '7 coisas que eu gostaria de saber antes de...',
      '5 erros que estão te custando dinheiro...',
      '3 mudanças que triplicaram meus resultados...',
      'O checklist que uso todo dia...',
      '10 lições aprendidas em...'
    ]
  },
  urgency: {
    label: 'Urgência/Escassez',
    templates: [
      'Últimas 24 horas para...',
      'Isso vai mudar em breve...',
      'Não espere até amanhã...',
      'A janela está fechando...',
      'Atenção: mudança importante...'
    ]
  }
};

// Estruturas de post comprovadas
export const STRUCTURES: Record<StructureType, { label: string; framework: string }> = {
  aida: {
    label: 'AIDA (Atenção, Interesse, Desejo, Ação)',
    framework: 'Hook forte → Contexto/Problema → Solução/Benefício → CTA claro'
  },
  pas: {
    label: 'PAS (Problema, Agitação, Solução)',
    framework: 'Problema → Agitação (pior cenário) → Solução → Resultado'
  },
  listicle: {
    label: 'Lista Numerada',
    framework: 'Hook prometendo lista → Lista numerada com valor → CTA de engajamento'
  },
  storytelling: {
    label: 'Storytelling',
    framework: 'Contexto → Conflito → Clímax → Resolução → Lição → CTA'
  },
  howto: {
    label: 'Como Fazer (How-To)',
    framework: 'Promessa de resultado → Passos práticos → Prova social → CTA'
  },
  comparison: {
    label: 'Comparação/VS',
    framework: 'Apresentar dois lados → Comparar → Sua posição → Por quê → CTA'
  }
};

// CTAs de alta conversão por objetivo
export const CTAS = {
  engagement: [
    'Qual sua opinião? Comenta aqui 👇',
    'Concorda? Me conta nos comentários',
    'Qual dessas você já experimentou?',
    'Me conta: você já passou por isso?',
    'Salva esse post para consultar depois'
  ],
  traffic: [
    'Link na bio para saber mais',
    'Clique no link dos comentários',
    'Acesse meu site (link no perfil)',
    'Quer o passo a passo completo? Link na bio'
  ],
  conversion: [
    'Vagas limitadas. Garanta a sua agora',
    'Últimas vagas. Link na bio',
    'Aproveite o preço especial (só hoje)',
    'Quer resultados assim? Me chama na DM'
  ],
  authority: [
    'Me segue para mais dicas assim',
    'Compartilha com alguém que precisa ver isso',
    'Salva para não perder',
    'Me conta se quer parte 2'
  ]
};

// Combinações otimizadas por dia da semana (LinkedIn)
export const LINKEDIN_DAILY_STRATEGIES: Record<string, ContentStrategy> = {
  segunda: {
    hook: 'confession',
    structure: 'storytelling',
    cta: CTAS.engagement[0],
    template: HOOKS.confession.templates[0],
    example: 'Vou ser honesto com você... [história pessoal/profissional]'
  },
  terca: {
    hook: 'curiosity',
    structure: 'pas',
    cta: CTAS.engagement[1],
    template: HOOKS.curiosity.templates[0],
    example: 'Você sabia que... [problema oculto]'
  },
  quarta: {
    hook: 'story',
    structure: 'storytelling',
    cta: CTAS.authority[0],
    template: HOOKS.story.templates[0],
    example: 'Meu cliente me disse... [case de sucesso]'
  },
  quinta: {
    hook: 'credibility',
    structure: 'howto',
    cta: CTAS.traffic[0],
    template: HOOKS.credibility.templates[0],
    example: 'Depois de 10 anos... [expertise]'
  },
  sexta: {
    hook: 'question',
    structure: 'comparison',
    cta: CTAS.engagement[2],
    template: HOOKS.question.templates[0],
    example: 'Você já se perguntou... [questionamento]'
  },
  sabado: {
    hook: 'contrarian',
    structure: 'aida',
    cta: CTAS.engagement[3],
    template: HOOKS.contrarian.templates[0],
    example: 'Vou ser polêmico... [opinião diferente]'
  },
  domingo: {
    hook: 'list',
    structure: 'listicle',
    cta: CTAS.authority[1],
    template: HOOKS.list.templates[0],
    example: '7 coisas que... [lista de valor]'
  }
};

// Facebook - mais casual, mais emojis, horários diferentes
export const FACEBOOK_DAILY_STRATEGIES: Record<string, ContentStrategy> = {
  segunda: {
    hook: 'story',
    structure: 'storytelling',
    cta: CTAS.engagement[3],
    template: HOOKS.story.templates[1],
    example: 'Gente, vocês não vão acreditar no que aconteceu...'
  },
  terca: {
    hook: 'question',
    structure: 'comparison',
    cta: CTAS.engagement[2],
    template: HOOKS.question.templates[1],
    example: 'E aí, qual vocês preferem? 👇'
  },
  quarta: {
    hook: 'curiosity',
    structure: 'pas',
    cta: CTAS.engagement[0],
    template: HOOKS.curiosity.templates[2],
    example: 'Descobri algo incrível e preciso compartilhar...'
  },
  quinta: {
    hook: 'list',
    structure: 'listicle',
    cta: CTAS.authority[2],
    template: HOOKS.list.templates[1],
    example: '5 erros que todo mundo comete...'
  },
  sexta: {
    hook: 'confession',
    structure: 'storytelling',
    cta: CTAS.engagement[1],
    template: HOOKS.confession.templates[2],
    example: 'Vou abrir o jogo com vocês...'
  },
  sabado: {
    hook: 'credibility',
    structure: 'howto',
    cta: CTAS.traffic[3],
    template: HOOKS.credibility.templates[2],
    example: 'Como especialista, posso te dizer que...'
  },
  domingo: {
    hook: 'contrarian',
    structure: 'aida',
    cta: CTAS.authority[3],
    template: HOOKS.contrarian.templates[3],
    example: 'Vou falar uma coisa que muita gente não vai gostar...'
  }
};

// Função para obter estratégia do dia
export function getDailyStrategy(platform: 'linkedin' | 'facebook', day: string): ContentStrategy {
  const strategies = platform === 'linkedin' ? LINKEDIN_DAILY_STRATEGIES : FACEBOOK_DAILY_STRATEGIES;
  return strategies[day.toLowerCase()] || LINKEDIN_DAILY_STRATEGIES.segunda;
}

// Função para gerar prompt da estratégia
export function generateStrategyPrompt(strategy: ContentStrategy, theme: string, tone: string): string {
  return `
Estratégia de Conteúdo:
- Hook: ${HOOKS[strategy.hook].label}
- Estrutura: ${STRUCTURES[strategy.structure].label}
- Framework: ${STRUCTURES[strategy.structure].framework}

Instruções:
1. Comece com: "${strategy.template}"
2. Use a estrutura ${strategy.structure.toUpperCase()}
3. Tom de voz: ${tone}
4. Tema: ${theme}
5. Finalize com CTA: "${strategy.cta}"
6. Use parágrafos curtos (máx 2-3 linhas)
7. Adicione emojis estratégicos
8. Total: 150-300 palavras
`;
}
