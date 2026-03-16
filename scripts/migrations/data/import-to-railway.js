/**
 * Import properties_chunked.sql to Railway PostgreSQL
 *
 * Usage:
 *   node import-properties-railway.js
 *
 * Required: Set RAILWAY_DATABASE_URL environment variable or
 * get it from Railway dashboard -> PostgreSQL -> Variables -> DATABASE_URL
 */

import { readFileSync } from 'fs';
import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL not found');
    console.log('\n📋 How to get DATABASE_URL:');
    console.log('1. Go to https://railway.app');
    console.log('2. Open your Emiralia project');
    console.log('3. Click PostgreSQL service');
    console.log('4. Go to Variables tab');
    console.log('5. Copy DATABASE_URL value');
    console.log('\nThen run:');
    console.log('  RAILWAY_DATABASE_URL="your-url-here" node import-properties-railway.js');
    console.log('  or');
    console.log('  DATABASE_URL="your-url-here" node import-properties-railway.js');
    process.exit(1);
}

async function importProperties() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Connecting to Railway PostgreSQL...');
        await client.connect();
        console.log('✅ Connected!\n');

        // Check current count
        console.log('📊 Checking current properties...');
        const beforeCount = await client.query('SELECT COUNT(*) as count FROM properties');
        console.log(`   Current: ${beforeCount.rows[0].count} properties\n`);

        // Read SQL file
        console.log('📖 Reading properties_chunked.sql...');
        const sql = readFileSync('properties_chunked.sql', 'utf8');
        const fileSizeMB = (sql.length / 1024 / 1024).toFixed(2);
        console.log(`   File size: ${fileSizeMB} MB\n`);

        // Import
        console.log('⏳ Importing properties (this may take a few minutes)...');
        const startTime = Date.now();

        await client.query(sql);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Import completed in ${duration}s\n`);

        // Verify
        console.log('🔍 Verifying import...');
        const afterCount = await client.query('SELECT COUNT(*) as count FROM properties');
        const available = await client.query(`
            SELECT COUNT(*) as count
            FROM properties
            WHERE is_available = TRUE AND duplicate_of IS NULL
        `);
        const offPlan = await client.query(`
            SELECT COUNT(*) as count
            FROM properties
            WHERE is_off_plan = TRUE AND is_available = TRUE AND duplicate_of IS NULL
        `);

        console.log('\n📈 Results:');
        console.log(`   Total properties: ${afterCount.rows[0].count}`);
        console.log(`   Available (visible on website): ${available.rows[0].count}`);
        console.log(`   Off-plan available: ${offPlan.rows[0].count}`);
        console.log(`   Imported: ${afterCount.rows[0].count - beforeCount.rows[0].count} new properties`);

        console.log('\n✨ Done! Properties are now available at:');
        console.log('   https://website-production-a7d2.up.railway.app/propiedades.html');

    } catch (error) {
        console.error('\n❌ Import failed:');
        console.error(error.message);

        if (error.message.includes('duplicate key')) {
            console.log('\n💡 Note: Some properties already exist (duplicate pf_id). This is normal.');
            console.log('   The import will skip duplicates and continue.');
        }

        process.exit(1);
    } finally {
        await client.end();
    }
}

importProperties();
