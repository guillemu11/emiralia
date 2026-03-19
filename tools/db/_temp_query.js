import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5433', 10),
    database: process.env.PG_DB || 'emiralia',
    user: process.env.PG_USER || 'emiralia',
    password: process.env.PG_PASSWORD || 'changeme',
});

try {
  const projects = await pool.query(`
    SELECT id, name, created_at
    FROM projects
    ORDER BY created_at DESC
    LIMIT 10
  `);

  console.log('=== ÚLTIMOS 10 PROYECTOS ===');
  projects.rows.forEach(p => {
    console.log(`${p.id} | ${p.name}`);
  });

  const inbox = await pool.query(`
    SELECT id, title, status, created_at
    FROM inbox_items
    ORDER BY created_at DESC
    LIMIT 10
  `);

  console.log('\n=== ÚLTIMOS 10 INBOX ITEMS ===');
  inbox.rows.forEach(i => {
    console.log(`${i.id} | [${i.status}] ${i.title.substring(0, 80)}`);
  });
} finally {
  await pool.end();
}
