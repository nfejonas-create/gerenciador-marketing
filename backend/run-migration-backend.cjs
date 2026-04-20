// run: node run-migration-backend.cjs
// Requer: npm install pg (já deve estar instalado)
// Substitua DATABASE_URL pela URL do banco gerenciador-marketing-backend

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://SEU_USER:SUA_SENHA@SEU_HOST/SEU_BANCO';

async function run() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Conectado ao banco...');

  const sql = `
    DO $$ BEGIN
      CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'USER',
      ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

    CREATE TABLE IF NOT EXISTS "AdminSession" (
      "id" TEXT NOT NULL,
      "adminId" TEXT NOT NULL,
      "targetUserId" TEXT NOT NULL,
      "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "endedAt" TIMESTAMP(3),
      CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX IF NOT EXISTS "AdminSession_adminId_idx" ON "AdminSession"("adminId");
    CREATE INDEX IF NOT EXISTS "AdminSession_targetUserId_idx" ON "AdminSession"("targetUserId");

    UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = 'nfe.jonas@gmail.com';
  `;

  await client.query(sql);
  console.log('Migracao concluida!');

  const r = await client.query('SELECT id, email, role FROM "User"');
  console.log('Usuarios:', r.rows);
  await client.end();
}

run().catch(e => { console.error(e); process.exit(1); });
