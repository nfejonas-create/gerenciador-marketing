# Gerenciador Inteligente de Marketing e Vendas

Plataforma fullstack para automatizar, analisar e escalar estrategias de marketing no LinkedIn e Facebook.

## Stack

- Frontend: React 18 + Vite + TypeScript + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Banco: PostgreSQL + Prisma ORM
- IA: OpenAI GPT-4
- Auth: JWT + OAuth (Google + LinkedIn)

## Como rodar

### 1. Configurar o banco

Crie um banco PostgreSQL e configure o .env:

```
cd backend
copy .env.example .env
# Edite o .env com suas credenciais
```

### 2. Backend

```
cd backend
npm install
npx prisma migrate dev --name init
npm run dev
```

### 3. Frontend

```
cd frontend
npm install
npm run dev
```

Acesse: http://localhost:5173

## Variaveis de Ambiente

Copie `backend/.env.example` para `backend/.env` e preencha:

- `DATABASE_URL`: URL do PostgreSQL
- `JWT_SECRET`: string secreta para JWT
- `OPENAI_API_KEY`: chave da OpenAI
- `LINKEDIN_CLIENT_ID/SECRET`: credenciais do app LinkedIn
- `GOOGLE_CLIENT_ID/SECRET`: credenciais do app Google
- `FACEBOOK_APP_ID/SECRET`: credenciais do app Meta
