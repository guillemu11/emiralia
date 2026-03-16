#!/usr/bin/env node
/**
 * Importación usando Supabase REST API - Fixed para duplicates
 */

import pkg from 'pg';
const { Client } = pkg;
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://lizjfuoreixzxdzzxfyk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpempmdW9yZWl4enhkenp4ZnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTEwNzAsImV4cCI6MjA4ODk4NzA3MH0.b8c80_EiUcVqSloOnHnRkrKb4CCIt2OqHSuAFZ0bp1M';

const localClient = new Client({
  host: 'localhost',
  port: 5433,
  database: 'emiralia',
  user: 'emiralia',
  password: 'changeme'
});

async function upsertBatch(table, rows) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(rows)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error insertando en ${table}: ${response.status} - ${error}`);
  }

  return response;
}

async function importData() {
  console.log('🚀 Iniciando importación via API...\n');

  try {
    console.log('📡 Conectando a PostgreSQL local...');
    await localClient.connect();
    console.log('✅ Conectado\n');

    // 1. Importar properties (SIN duplicate_of para evitar FK constraint)
    console.log('📋 1/2: Importando properties (sin duplicados)...');
    const propertiesCount = await localClient.query('SELECT COUNT(*) FROM properties');
    console.log(`   Total: ${propertiesCount.rows[0].count} propiedades`);

    let imported = 0;
    const batchSize = 50;
    let offset = 0;

    while (true) {
      const batch = await localClient.query(
        `SELECT
          pf_id, url, listing_id, reference, rera, title, description, display_address,
          building_name, community, community_name, city, location_tree, latitude, longitude,
          property_type, property_type_id, listing_type, bedrooms, bedrooms_value, bathrooms,
          size_sqft, size_min, size_unit, furnishing, completion_status, price_aed,
          price_currency, price_duration, payment_method, features, amenities, images,
          agent_name, agent_phone, agent_whatsapp, agent_email, agent_info,
          broker_name, broker_phone, broker_email, broker_info,
          is_verified, is_off_plan, is_premium, is_exclusive, is_direct_developer,
          is_new_construction, is_available, is_featured, listing_level, raw_data,
          added_on_pf, scraped_at, updated_at
         FROM properties ORDER BY pf_id LIMIT $1 OFFSET $2`,
        [batchSize, offset]
      );

      if (batch.rows.length === 0) break;

      await upsertBatch('properties', batch.rows);

      imported += batch.rows.length;
      offset += batchSize;
      process.stdout.write(`\r   Progreso: ${imported}/${propertiesCount.rows[0].count}`);

      await new Promise(resolve => setTimeout(resolve, 150));
    }

    console.log(`\n✅ ${imported} properties importadas\n`);

    // 2. Actualizar duplicate_of y duplicate_group
    console.log('📋 2/2: Actualizando campos de deduplicación...');
    const duplicates = await localClient.query(
      `SELECT pf_id, duplicate_of, duplicate_group
       FROM properties
       WHERE duplicate_of IS NOT NULL OR duplicate_group IS NOT NULL`
    );

    let updated = 0;
    for (const row of duplicates.rows) {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/properties?pf_id=eq.${row.pf_id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            duplicate_of: row.duplicate_of,
            duplicate_group: row.duplicate_group
          })
        }
      );

      if (!response.ok) {
        console.log(`\n⚠️  Error actualizando ${row.pf_id}: ${response.status}`);
      } else {
        updated++;
        if (updated % 100 === 0) {
          process.stdout.write(`\r   Actualizados: ${updated}/${duplicates.rows.length}`);
        }
      }
    }

    console.log(`\n✅ ${updated} registros de deduplicación actualizados\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 ¡Importación completada!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n📊 Resumen:`);
    console.log(`   - Properties: ${imported}`);
    console.log(`   - Duplicados: ${updated}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await localClient.end();
  }
}

importData();
