/**
 * Emiralia — Run Migrations on Railway Production
 *
 * Ejecuta las migrations de agent_conversations y telegram_users
 * en la base de datos de producción de Railway.
 *
 * Uso:
 *   node tools/db/run-migrations-railway.js
 *
 * Requiere variables de entorno de Railway (PG_*):
 *   PG_HOST, PG_PORT, PG_DB, PG_USER, PG_PASSWORD
 */

import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// ─── Database Connection (Railway) ───────────────────────────────────────────

const pool = new Pool({
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT || '5432', 10),
    database: process.env.PG_DB,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    ssl: { rejectUnauthorized: false }, // Railway requires SSL
});

// ─── Migrations ──────────────────────────────────────────────────────────────

const migrations = [
    {
        name: 'agent_conversations',
        file: path.join(__dirname, 'migration_agent_conversations.sql'),
        checkQuery: `SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'agent_conversations'
        )`,
    },
    {
        name: 'telegram_users',
        file: path.join(__dirname, 'migration_telegram_users.sql'),
        checkQuery: `SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'telegram_users'
        )`,
    },
];

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Lee un archivo SQL y filtra comandos psql que no son SQL válido
 */
function readSQLFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Filter out psql commands (lines starting with \)
    const lines = content.split('\n');
    const sqlLines = lines.filter(line => {
        const trimmed = line.trim();
        return !trimmed.startsWith('\\') && trimmed.length > 0;
    });

    return sqlLines.join('\n');
}

/**
 * Verifica si una tabla ya existe
 */
async function tableExists(client, checkQuery) {
    const result = await client.query(checkQuery);
    return result.rows[0].exists;
}

/**
 * Ejecuta una migration SQL
 */
async function runMigration(client, name, sqlContent) {
    console.log(`\n[Migration] Executing: ${name}`);

    try {
        await client.query(sqlContent);
        console.log(`[Migration] ✅ ${name} completed successfully`);
        return true;
    } catch (err) {
        console.error(`[Migration] ❌ ${name} failed:`, err.message);
        throw err;
    }
}

/**
 * Verifica la conexión a la base de datos
 */
async function verifyConnection() {
    console.log('[DB] Testing connection to Railway...');
    console.log(`[DB] Host: ${process.env.PG_HOST}`);
    console.log(`[DB] Database: ${process.env.PG_DB}`);
    console.log(`[DB] User: ${process.env.PG_USER}`);

    try {
        const result = await pool.query('SELECT NOW(), version()');
        console.log(`[DB] ✅ Connected to PostgreSQL`);
        console.log(`[DB] Server time: ${result.rows[0].now}`);
        console.log(`[DB] Version: ${result.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
        return true;
    } catch (err) {
        console.error('[DB] ❌ Connection failed:', err.message);
        throw err;
    }
}

/**
 * Verifica que las tablas necesarias existan
 */
async function verifyPrerequisites(client) {
    console.log('\n[Verify] Checking prerequisites...');

    // Verificar que existe la tabla agents
    const agentsExists = await client.query(`
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'agents'
        )
    `);

    if (!agentsExists.rows[0].exists) {
        console.error('[Verify] ❌ Table "agents" does not exist');
        console.error('[Verify] This is a critical dependency for agent_conversations');
        throw new Error('Missing prerequisite table: agents');
    }

    console.log('[Verify] ✅ Prerequisite table "agents" exists');

    // Verificar que existe la función update_updated_at
    const functionExists = await client.query(`
        SELECT EXISTS (
            SELECT FROM pg_proc
            WHERE proname = 'update_updated_at'
        )
    `);

    if (!functionExists.rows[0].exists) {
        console.log('[Verify] ⚠️  Function "update_updated_at" does not exist');
        console.log('[Verify] Creating function...');

        await client.query(`
            CREATE OR REPLACE FUNCTION update_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        console.log('[Verify] ✅ Function "update_updated_at" created');
    } else {
        console.log('[Verify] ✅ Function "update_updated_at" exists');
    }
}

// ─── Main Execution ──────────────────────────────────────────────────────────

async function main() {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║  Emiralia — Railway Migrations                      ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    // Verificar que tenemos las credenciales
    if (!process.env.PG_HOST || !process.env.PG_DB || !process.env.PG_USER || !process.env.PG_PASSWORD) {
        console.error('❌ Missing Railway database credentials');
        console.error('\nRequired environment variables:');
        console.error('  - PG_HOST');
        console.error('  - PG_PORT (optional, default: 5432)');
        console.error('  - PG_DB');
        console.error('  - PG_USER');
        console.error('  - PG_PASSWORD');
        console.error('\nGet these from Railway dashboard → Your Service → Variables');
        process.exit(1);
    }

    let client;

    try {
        // 1. Verificar conexión
        await verifyConnection();

        // 2. Conectar
        client = await pool.connect();
        console.log('\n[DB] Client connected');

        // 3. Verificar prerrequisitos
        await verifyPrerequisites(client);

        // 4. Ejecutar migrations
        console.log('\n[Migrations] Starting execution...\n');

        let executed = 0;
        let skipped = 0;

        for (const migration of migrations) {
            console.log(`\n──────────────────────────────────────────────────────`);
            console.log(`[Migration] ${migration.name}`);
            console.log(`──────────────────────────────────────────────────────`);

            // Verificar si ya existe
            const exists = await tableExists(client, migration.checkQuery);

            if (exists) {
                console.log(`[Migration] ⏭️  Table "${migration.name}" already exists, skipping`);
                skipped++;
                continue;
            }

            // Leer SQL
            const sqlContent = readSQLFile(migration.file);

            // Ejecutar
            await runMigration(client, migration.name, sqlContent);
            executed++;
        }

        // 5. Resumen
        console.log('\n╔══════════════════════════════════════════════════════╗');
        console.log('║  Migration Summary                                   ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log(`✅ Executed: ${executed}`);
        console.log(`⏭️  Skipped:  ${skipped}`);
        console.log(`📊 Total:    ${migrations.length}\n`);

        // 6. Verificar que las tablas existen
        console.log('[Verify] Final verification...');

        for (const migration of migrations) {
            const exists = await tableExists(client, migration.checkQuery);
            if (exists) {
                console.log(`[Verify] ✅ ${migration.name} exists`);
            } else {
                console.log(`[Verify] ❌ ${migration.name} NOT FOUND`);
            }
        }

        console.log('\n🎉 Migrations completed successfully!\n');

    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        console.error('\nStack trace:');
        console.error(err.stack);
        process.exit(1);
    } finally {
        if (client) {
            client.release();
            console.log('[DB] Client released');
        }
        await pool.end();
        console.log('[DB] Pool closed\n');
    }
}

// Execute
main();
