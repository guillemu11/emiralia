/**
 * Railway Data Import Script
 * Importa datos desde SQL dump a Railway
 */

import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

const railwayUrl = process.argv[2];
const sqlFile = process.argv[3] || 'railway-data-export.sql';

if (!railwayUrl) {
  console.error('❌ Error: DATABASE_PUBLIC_URL requerida');
  console.error('   Uso: node railway-import-data.js <DATABASE_PUBLIC_URL> [sql_file]');
  process.exit(1);
}

async function importData() {
  console.log('🚀 Importando datos a Railway...\n');

  const client = new Client({
    connectionString: railwayUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Configurar encoding UTF-8
    await client.query("SET client_encoding TO 'UTF8';");

    console.log('✅ Conectado a Railway PostgreSQL\n');

    // Leer archivo SQL
    console.log(`📋 Leyendo ${sqlFile}...`);
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Separar por líneas y ejecutar cada INSERT
    const lines = sql.split('\n').filter(line => line.trim().startsWith('INSERT'));
    console.log(`📤 Ejecutando ${lines.length} INSERT statements...\n`);

    let success = 0;
    let errors = 0;

    for (const line of lines) {
      try {
        await client.query(line);
        success++;
        if (success % 50 === 0) {
          console.log(`   Procesados ${success}/${lines.length}...`);
        }
      } catch (err) {
        errors++;
        if (errors <= 5) {
          console.error(`   ⚠️  Error: ${err.message.substring(0, 100)}`);
        }
      }
    }

    console.log(`\n✅ Importación completada: ${success} exitosos, ${errors} errores\n`);

    // Verificar
    console.log('📊 Verificación:');
    const projectCount = await client.query('SELECT COUNT(*) FROM projects');
    const agentCount = await client.query('SELECT COUNT(*) FROM agents');
    const taskCount = await client.query('SELECT COUNT(*) FROM tasks');

    console.log(`   - Proyectos: ${projectCount.rows[0].count}`);
    console.log(`   - Agentes: ${agentCount.rows[0].count}`);
    console.log(`   - Tasks: ${taskCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error durante importación:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

importData();
