/**
 * Migration Runner
 *
 * Ejecuta migrations SQL en PostgreSQL
 * Uso: node tools/db/run-migrations.js
 */

import fs from 'fs/promises';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

const { Pool } = pg;

// Pool de conexiones
const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5433'),
  database: process.env.PG_DB || 'emiralia',
  user: process.env.PG_USER || 'emiralia',
  password: process.env.PG_PASSWORD || 'changeme'
});

/**
 * Ejecuta un archivo de migración SQL
 */
async function runMigration(migrationFile) {
  const filePath = path.join(__dirname, migrationFile);
  console.log(`\n📁 Loading migration: ${migrationFile}`);

  try {
    // Leer el archivo SQL
    const sql = await fs.readFile(filePath, 'utf-8');

    // Filtrar comentarios de psql (\d, \dt, etc.) que no son SQL válido
    const statements = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('\\'))
      .join('\n');

    console.log(`⚙️  Executing migration...`);

    // Ejecutar la migración
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(statements);
      await client.query('COMMIT');
      console.log(`✅ Migration completed: ${migrationFile}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`❌ Error running migration ${migrationFile}:`, error.message);
    throw error;
  }
}

/**
 * Verifica que una tabla existe
 */
async function tableExists(tableName) {
  try {
    const result = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      )`,
      [tableName]
    );
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

/**
 * Muestra información de la tabla
 */
async function describeTable(tableName) {
  try {
    const result = await pool.query(
      `SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      ORDER BY ordinal_position`,
      [tableName]
    );

    console.log(`\n📊 Table: ${tableName}`);
    console.log('─'.repeat(80));
    console.log('Column Name'.padEnd(30), 'Type'.padEnd(20), 'Nullable'.padEnd(10), 'Default');
    console.log('─'.repeat(80));

    for (const row of result.rows) {
      console.log(
        row.column_name.padEnd(30),
        row.data_type.padEnd(20),
        row.is_nullable.padEnd(10),
        row.column_default || ''
      );
    }

    // Contar filas
    const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    console.log(`\nTotal rows: ${countResult.rows[0].count}`);
  } catch (error) {
    console.error(`Error describing table ${tableName}:`, error.message);
  }
}

/**
 * Script principal
 */
async function main() {
  console.log('\n🗃️  DATABASE MIGRATIONS - Agent Command Center\n');

  try {
    // Test de conexión
    console.log('🔌 Testing database connection...');
    const testResult = await pool.query('SELECT NOW()');
    console.log(`✅ Connected to database at ${testResult.rows[0].now}`);

    // Lista de migraciones a ejecutar
    const migrations = [
      'migration_agent_conversations.sql',
      'migration_telegram_users.sql'
    ];

    // Ejecutar cada migración
    for (const migration of migrations) {
      await runMigration(migration);
    }

    console.log('\n✅ All migrations completed successfully!\n');

    // Verificar que las tablas existen y mostrar información
    console.log('─'.repeat(80));
    console.log('VERIFICATION');
    console.log('─'.repeat(80));

    const tables = ['agent_conversations', 'telegram_users'];

    for (const table of tables) {
      const exists = await tableExists(table);
      if (exists) {
        await describeTable(table);
      } else {
        console.log(`\n❌ Table ${table} does not exist!`);
      }
    }

    console.log('\n' + '─'.repeat(80));
    console.log('✅ Migration verification complete!');
    console.log('─'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar
main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
