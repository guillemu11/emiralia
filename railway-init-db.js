/**
 * Railway DB Initialization Script
 * Ejecuta el schema SQL en PostgreSQL de Railway
 */

import pg from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Obtener DATABASE_PUBLIC_URL de argumentos
const DATABASE_URL = process.argv[2];

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL requerida');
  console.error('   Uso: node railway-init-db.js <DATABASE_PUBLIC_URL>');
  process.exit(1);
}

async function initDatabase() {
  console.log('🔧 Inicializando base de datos en Railway...\n');

  // Conectar a PostgreSQL
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // Leer schema.sql
    const schemaPath = join(__dirname, 'tools', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📋 Ejecutando schema.sql...');

    // Ejecutar schema completo
    await client.query(schema);

    console.log('✅ Schema ejecutado correctamente\n');

    // Verificar tablas creadas
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('📊 Tablas creadas:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    console.log('\n✅ Base de datos inicializada correctamente');

  } catch (error) {
    console.error('❌ Error al inicializar base de datos:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initDatabase();
