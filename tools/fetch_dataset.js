/**
 * Emiralia — Recuperar dataset de un run de Apify ya completado
 *
 * Uso:
 *   node tools/fetch_dataset.js <DATASET_ID>
 *
 * Ejemplo:
 *   node tools/fetch_dataset.js wVWPaEfQBxDoCfRaV
 */

import 'dotenv/config';
import axios from 'axios';
import pg from 'pg';
import { trackSkill } from './workspace-skills/skill-tracker.js';

const { Pool } = pg;

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_BASE = 'https://api.apify.com/v2';
const MAX_RESULTS = parseInt(process.env.MAX_RESULTS || '0', 10);

const datasetId = process.argv[2];

if (!datasetId) {
    console.error('❌ Uso: node tools/fetch_dataset.js <DATASET_ID>');
    console.error('   Ejemplo: node tools/fetch_dataset.js wVWPaEfQBxDoCfRaV');
    process.exit(1);
}

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5433', 10),
    database: process.env.PG_DB || 'emiralia',
    user: process.env.PG_USER || 'emiralia',
    password: process.env.PG_PASSWORD || 'changeme',
});

function mapAndUpsert(items, client) {
    // Reutilizamos la misma lógica del scraper principal
    const UPSERT_SQL = `
    INSERT INTO properties (
      pf_id, url, title, display_address, building_name, community, community_name, city,
      property_type, bedrooms, bedrooms_value, bathrooms, size_sqft, size_unit,
      price_aed, price_currency, features, images, latitude, longitude,
      agent_name, agent_phone, agent_whatsapp, agent_email,
      broker_name, broker_phone, broker_email,
      rera, is_verified, is_off_plan, completion_status,
      location_tree, raw_data, added_on_pf, scraped_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,
      $9,$10,$11,$12,$13,$14,
      $15,$16,$17,$18,$19,$20,
      $21,$22,$23,$24,
      $25,$26,$27,
      $28,$29,$30,$31,
      $32,$33,$34, NOW()
    )
    ON CONFLICT (pf_id) DO UPDATE SET
      title             = EXCLUDED.title,
      price_aed         = EXCLUDED.price_aed,
      is_off_plan       = EXCLUDED.is_off_plan,
      completion_status = EXCLUDED.completion_status,
      raw_data          = EXCLUDED.raw_data,
      updated_at        = NOW()
    RETURNING (xmax = 0) AS inserted
  `;

    let inserted = 0, updated = 0;
    const promises = items.map(async item => {
        if (!item.id) return;
        const isOffPlan = item.isNewConstruction === true
            || (typeof item.completionStatus === 'string' && item.completionStatus.length > 0)
            || item.isBrokerProjectProperty === true;

        const values = [
            item.id?.toString(), item.url, item.title, item.displayAddress,
            item.buildingName, item.community, item.communityName, item.city,
            item.propertyType, item.bedrooms, item.bedroomsValue, item.bathroomsValue,
            item.size, item.sizeUnit ?? 'sqft',
            item.price, item.priceCurrency ?? 'AED',
            JSON.stringify(item.features ?? []), JSON.stringify(item.images ?? []),
            item.coordinates?.latitude ?? null, item.coordinates?.longitude ?? null,
            item.agent, item.agentPhone, item.agentWhatsapp, item.agentEmail,
            item.broker, item.brokerInfo?.phone ?? null, item.brokerInfo?.email ?? null,
            item.rera, item.isVerified ?? false, isOffPlan, item.completionStatus ?? null,
            JSON.stringify(item.locationTree ?? []), JSON.stringify(item), item.addedOn ?? null,
        ];
        const res = await client.query(UPSERT_SQL, values);
        if (res.rows[0]?.inserted) inserted++;
        else updated++;
    });

    return Promise.all(promises).then(() => ({ inserted, updated }));
}

async function main() {
    trackSkill('data-agent', 'fetch-dataset', 'data', 'completed').catch(() => {});
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║  Emiralia — Recuperar Dataset de Apify               ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    console.log(`   Dataset ID: ${datasetId}\n`);

    try {
        await pool.query('SELECT 1');
        console.log('✅ Conexión a PostgreSQL OK');

        console.log(`📥 Descargando dataset...`);
        const res = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
            params: { token: APIFY_TOKEN, format: 'json', clean: true, ...(MAX_RESULTS > 0 && { limit: MAX_RESULTS }) },
        });

        const items = res.data;
        console.log(`   ${items.length} propiedades encontradas`);

        if (items.length === 0) {
            console.log('\n⚠️  Dataset vacío. El run puede no haber terminado o no encontró resultados.');
            return;
        }

        console.log('\n💾 Guardando en base de datos...');
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { inserted, updated } = await mapAndUpsert(items, client);
            await client.query('COMMIT');
            console.log('\n╔══════════════════════════════════════════════════════╗');
            console.log(`║  ✅ Completado                                        ║`);
            console.log(`║  📥 Nuevas:       ${inserted.toString().padEnd(36)}║`);
            console.log(`║  🔄 Actualizadas: ${updated.toString().padEnd(36)}║`);
            console.log(`║  📊 Total:        ${items.length.toString().padEnd(36)}║`);
            console.log('╚══════════════════════════════════════════════════════╝');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('\n❌ Error:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
