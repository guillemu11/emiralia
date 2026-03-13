/**
 * Railway Data Migration Script
 * Exporta datos de DB local e importa a Railway
 */

import pg from 'pg';

const { Client } = pg;

// DB Local
const localClient = new Client({
  host: 'localhost',
  port: 5433,
  database: 'emiralia',
  user: 'emiralia',
  password: 'changeme'
});

// DB Railway (usar DATABASE_PUBLIC_URL)
const railwayUrl = process.argv[2];

if (!railwayUrl) {
  console.error('❌ Error: DATABASE_PUBLIC_URL requerida');
  console.error('   Uso: node railway-migrate-data.js <DATABASE_PUBLIC_URL>');
  process.exit(1);
}

const railwayClient = new Client({
  connectionString: railwayUrl,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log('🚀 Iniciando migración de datos...\n');

  try {
    // Conectar a ambas DBs
    await localClient.connect();
    await railwayClient.connect();
    console.log('✅ Conectado a ambas bases de datos\n');

    // Tablas a migrar (en orden de dependencias)
    const tables = [
      'agents',
      'projects',
      'phases',
      'tasks',
      'weekly_sessions',
      'weekly_brainstorms',
      'eod_reports',
      'pm_reports',
      'inbox_items',
      'audit_log',
      'agent_memory'
    ];

    for (const table of tables) {
      console.log(`📋 Migrando tabla: ${table}...`);

      // Obtener datos de local
      const data = await localClient.query(`SELECT * FROM ${table}`);

      if (data.rows.length === 0) {
        console.log(`   ⏭️  Sin datos, saltando...\n`);
        continue;
      }

      console.log(`   Encontrados ${data.rows.length} registros`);

      // Obtener nombres de columnas
      const columns = Object.keys(data.rows[0]);

      // Construir query INSERT para cada registro
      let inserted = 0;
      for (const row of data.rows) {
        const values = columns.map(col => row[col]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

        const insertQuery = `
          INSERT INTO ${table} (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;

        try {
          await railwayClient.query(insertQuery, values);
          inserted++;
        } catch (err) {
          // Ignorar errores de duplicados
          if (!err.message.includes('duplicate')) {
            console.error(`   ⚠️  Error en registro:`, err.message);
          }
        }
      }

      console.log(`   ✅ Insertados ${inserted}/${data.rows.length} registros\n`);
    }

    // Verificar migración
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Migración completada\n');
    console.log('📊 Verificación:');

    const projectCount = await railwayClient.query('SELECT COUNT(*) FROM projects');
    const agentCount = await railwayClient.query('SELECT COUNT(*) FROM agents');
    const taskCount = await railwayClient.query('SELECT COUNT(*) FROM tasks');

    console.log(`   - Proyectos: ${projectCount.rows[0].count}`);
    console.log(`   - Agentes: ${agentCount.rows[0].count}`);
    console.log(`   - Tasks: ${taskCount.rows[0].count}`);
    console.log('═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error durante migración:', error.message);
    process.exit(1);
  } finally {
    await localClient.end();
    await railwayClient.end();
  }
}

migrate();
