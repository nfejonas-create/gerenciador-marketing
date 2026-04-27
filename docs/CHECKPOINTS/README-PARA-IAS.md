# 🤖 GUIA PARA IAs E AGENTES - Gerenciador Marketing

## 📄 LEIA PRIMEIRO

Se você é uma IA chegando neste projeto, leia nesta ordem:

1. Este arquivo (README-PARA-IAS.md) 
2. PROGRESS.md - contexto geral do projeto
3. CHECKPOINTS/PHASE1-CURRENT.md ou latest.md

---

## ⚠️ REGRAS IMUTÁVEIS - NUNCA QUEBRAR

### 1. NUNCA AUTO-POST DIRETO
- TODO conteúdo GERADO vai para RASCUNHO PRIMEIRO
- Nunca postar direto via API
- Usuário escolhe QUANDO postar

### 2. ISOLAMENTO DE DADOS
- Cada usuário tem dados INDEPENDENTES
- Usuário A NUNCA vê dados de Usuário B
- Tokens LinkedIn são por usuário
- Histórico é por usuário

### 3. GERENCIAR TOKENS
- Não desperdiçar em testes
- Logar consumo
- Rate limiting quando necessário

---

## 🎯 QUICK START

### PASSO 1: Verificar Deploy (5 min)
```
Ir para: https://dashboard.render.com/web/srv-d7iln9favr4c73fqaql0
- Se "Live" (verde) → Passo 2
- Se "Building" → Aguarde, depois Passo 2
- Se "Failed" → Ver logs, corrigir, re-deploy
```

### PASSO 2: Testar Fase 1 (10 min)
```
Ir para: https://gerenciador-marketing-netlify.netlify.app/gerador-conteudo
1. Clicar "Gerar post"
2. DevTools F12 → Network tab
3. POST /content/generate deve retornar 201
4. Response com status: "rascunho"
5. Aparecer em "Histórico"
```

### PASSO 3: Testar Endpoints (5 min)
```
GET /history → array de rascunhos
PATCH /history/:id → edita
DELETE /history/:id → deleta
```

### PASSO 4: Quando Tudo Passar
1. Atualizar PHASE1-CURRENT.md com Status COMPLETO
2. Atualizar PROGRESS.md - Fase 1 COMPLETA
3. Criar PHASE2-START.md
4. Commit: "feat: Phase 1 COMPLETE"

---

## 📁 ESTRUTURA

```
/docs/
  PROGRESS.md
  README-PARA-IAS.md
  /CHECKPOINTS/
    PHASE1-CURRENT.md
    PHASE2-START.md
/backend/src/
  /routes/
    generatedContentRoutes.ts
  index.ts
```

---

## 📱 INFORMAÇÕES

Owner: Jonas (nfejonas-create)
GitHub: https://github.com/nfejonas-create/gerenciador-marketing
Frontend: https://gerenciador-marketing-netlify.netlify.app
Backend: postflow-backend (Render)

---

## 🔄 DEPOIS DE CADA SESSÃO

1. Atualizar /docs/CHECKPOINTS/PHASE1-CURRENT.md
2. Adicionar timestamp e status
3. Listar o que foi feito
4. COMMIT com mensagem clara

---

Criado: 27/04/2026
Para: Qualquer IA/Agente trabalhando no projeto
🚀 Boa sorte!
