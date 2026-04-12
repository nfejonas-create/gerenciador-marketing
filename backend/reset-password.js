const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_CVTiNJ2F0HnE@ep-proud-credit-amxvsozi.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  await client.connect();
  
  // Lista usuários
  const users = await client.query('SELECT id, email, name FROM "User"');
  console.log('Usuarios no banco:', users.rows);
  
  // Atualiza senha para Jonas2026
  const hash = '$2a$10$rNqGtrltGQHAFwDnuZ5h/ea4dwKOZ3qPVBDeK7qgJ/AAQ7vS3n4xq';
  const result = await client.query(
    'UPDATE "User" SET password = $1 WHERE email = $2',
    [hash, 'nfe.jonas@gmail.com']
  );
  console.log('Senha atualizada para Jonas2026. Linhas afetadas:', result.rowCount);
  
  await client.end();
}

run().catch(e => { console.error(e); process.exit(1); });
