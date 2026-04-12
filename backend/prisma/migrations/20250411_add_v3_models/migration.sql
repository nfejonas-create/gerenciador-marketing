-- Adicionar coluna category na tabela Post
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "category" TEXT;

-- Criar tabela GeneratorSettings
CREATE TABLE IF NOT EXISTS "GeneratorSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instructions" TEXT NOT NULL DEFAULT 'Gere conteúdo profissional para eletricistas. Use tom técnico mas acessível. Máximo 1300 caracteres para LinkedIn.',
    "tone" TEXT NOT NULL DEFAULT 'mix',
    "linkedinUrl" TEXT,
    "facebookUrl" TEXT,
    "siteUrl" TEXT,
    "otherUrl" TEXT,
    "linkedinToken" TEXT,
    "facebookToken" TEXT,
    CONSTRAINT "GeneratorSettings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GeneratorSettings_userId_key" UNIQUE ("userId")
);

-- Criar tabela Idea
CREATE TABLE IF NOT EXISTS "Idea" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "breakText" TEXT NOT NULL,
    "pain" TEXT NOT NULL,
    "agitate" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "proof" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- Criar tabela AnalyticsSnapshot
CREATE TABLE IF NOT EXISTS "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "sales" INTEGER NOT NULL DEFAULT 0,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analysisText" TEXT,
    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- Adicionar foreign keys
ALTER TABLE "GeneratorSettings" ADD CONSTRAINT "GeneratorSettings_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Idea" ADD CONSTRAINT "Idea_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
