const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postflow:fqYPbIjvv0c6znzWzzRemnWtEpDT8bYW@dpg-d7iljppo3t8c738iu000-a.oregon-postgres.render.com/postflow_1cei' });
async function main() {
  await client.connect();
  const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('ContentSuggestion','GeneratedContent','ScheduledPost')");
  console.log('Tabelas encontradas:', res.rows);
  await client.end();
}
main().catch(console.error);
