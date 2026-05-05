const { Client } = require("pg");
const client = new Client({ 
  connectionString: "postgresql://postflow:fqYPbIjvv0c6znzWzzRemnWtEpDT8bYW@dpg-d7iljppo3t8c738iu000-a.oregon-postgres.render.com/postflow_1cei",
  ssl: { rejectUnauthorized: false }
});
async function main() {
  await client.connect();
  
  // Colunas do ContentSuggestion
  const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='ContentSuggestion' AND table_schema='public' ORDER BY ordinal_position");
  console.log("ContentSuggestion cols:", cols.rows.map(r => r.column_name).join(", "));
  
  // Colunas do User
  const userCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='User' AND table_schema='public' ORDER BY ordinal_position");
  console.log("User cols:", userCols.rows.map(r => r.column_name).join(", "));
  
  // Versão do Prisma _migrations
  const mig = await client.query("SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5");
  console.log("Migrações recentes:", mig.rows.map(r => r.migration_name + " (" + (r.finished_at ? "ok" : "pendente") + ")").join(", "));
  
  await client.end();
}
main().catch(console.error);
