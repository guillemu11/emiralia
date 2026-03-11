/**
 * Emiralia — Data Agent: PropertyFinder Scraper
 *
 * Lanza el actor Apify `dhrumil/propertyfinder-scraper`,
 * descarga el dataset resultante y hace upsert en PostgreSQL.
 *
 * Uso:
 *   node tools/apify_propertyfinder.js
 *
 * Variables de entorno (ver .env.example):
 *   APIFY_TOKEN, PG_HOST, PG_PORT, PG_DB, PG_USER, PG_PASSWORD,
 *   SEARCH_URL, MAX_RESULTS, APIFY_THREADS
 */

import 'dotenv/config';
import axios from 'axios';
import pg from 'pg';
import { trackSkill } from './workspace-skills/skill-tracker.js';

const { Pool } = pg;

// ─── CLI Args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const forceFlag = args.includes('--force');
const incrementalFlag = args.includes('--incremental');
const monitoringFlag = args.includes('--monitoring');
const runIdArg = args.find(a => !a.startsWith('--')) || null;
const resultsArg = args.find(a => a.startsWith('--results='))?.split('=')[1];

if (args.includes('--help')) {
    console.log(`
Uso: node tools/apify_propertyfinder.js [RUN_ID] [Opciones]

Opciones:
  RUN_ID            ID de una ejecución existente para descargar y procesar.
  --force           Permite ejecutar sin límite de resultados (MAX_RESULTS=0).
  --results=N       Sobrescribe MAX_RESULTS del .env.
  --incremental     Solo procesa propiedades nuevas (filtra las ya existentes en DB).
  --monitoring      Activa monitoringMode en Apify (solo devuelve nuevas/modificadas).
    `);
    process.exit(0);
}

// ─── Config ──────────────────────────────────────────────────────────────────

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = 'dhrumil/propertyfinder-scraper';
const SEARCH_URL = process.env.SEARCH_URL || 'https://www.propertyfinder.ae/en/search?c=1&fu=0&rms=1&ob=nd';
let MAX_RESULTS = parseInt(resultsArg || process.env.MAX_RESULTS || '50', 10);
const THREADS = parseInt(process.env.APIFY_THREADS || '3', 10);

const APIFY_BASE = 'https://api.apify.com/v2';
const POLL_INTERVAL = 5000; // ms entre polls de estado
const RUN_TIMEOUT = 60 * 60 * 1000; // Aumentado a 60 minutos para runs largos

if (!APIFY_TOKEN) {
    console.error('❌ APIFY_TOKEN no está definido en .env');
    process.exit(1);
}

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    database: process.env.PG_DB || 'emiralia',
    user: process.env.PG_USER || 'emiralia',
    password: process.env.PG_PASSWORD || 'changeme',
    ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false }
});

// ─── Apify helpers ───────────────────────────────────────────────────────────

async function startRun() {
    const input = {
        listUrls: [{ url: SEARCH_URL }],
        threads: String(THREADS),
        retrieveUnitNumber: false,
        monitoringMode: monitoringFlag,
        enableDelistingTracker: false,
        addEmptyTrackerRecord: false,
        ...(MAX_RESULTS > 0 && { maxItems: MAX_RESULTS }),
    };

    console.log(`🚀 Iniciando actor Apify: ${ACTOR_ID}`);
    console.log(`   URL: ${SEARCH_URL}`);
    console.log(`   Límite: ${MAX_RESULTS > 0 ? MAX_RESULTS : 'sin límite'} propiedades`);
    if (monitoringFlag) console.log(`   📡 Modo MONITORING: solo propiedades nuevas/modificadas desde último run`);
    if (incrementalFlag) console.log(`   🔄 Modo INCREMENTAL: se filtrarán duplicados contra DB local`);

    const res = await axios.post(
        `${APIFY_BASE}/acts/${encodeURIComponent(ACTOR_ID)}/runs`,
        input,
        {
            headers: { 'Content-Type': 'application/json' },
            params: { token: APIFY_TOKEN },
        }
    );

    const run = res.data.data;
    console.log(`   Run ID: ${run.id} | Status: ${run.status}`);
    return run;
}

async function waitForRun(runId) {
    const deadline = Date.now() + RUN_TIMEOUT;
    let dots = 0;

    while (Date.now() < deadline) {
        const res = await axios.get(
            `${APIFY_BASE}/actor-runs/${runId}`,
            { params: { token: APIFY_TOKEN } }
        );
        const run = res.data.data;

        if (['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(run.status)) {
            console.log(`\n   Run finalizado: ${run.status}`);
            if (run.status !== 'SUCCEEDED') {
                throw new Error(`El run de Apify terminó con estado: ${run.status}`);
            }
            return run;
        }

        process.stdout.write(dots % 10 === 0 ? `\n   ⏳ Esperando (${Math.round((Date.now() - (deadline - RUN_TIMEOUT)) / 1000)}s)` : '.');
        dots++;
        await sleep(POLL_INTERVAL);
    }

    throw new Error('Timeout esperando el run de Apify (> 10 min)');
}

async function fetchDataset(datasetId) {
    console.log(`📥 Descargando dataset: ${datasetId}`);
    const res = await axios.get(
        `${APIFY_BASE}/datasets/${datasetId}/items`,
        {
            params: {
                token: APIFY_TOKEN,
                format: 'json',
                clean: true,
                ...(MAX_RESULTS > 0 && { limit: MAX_RESULTS }),
            },
        }
    );
    console.log(`   ${res.data.length} propiedades descargadas`);
    return res.data;
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

async function getExistingProperties() {
    const res = await pool.query('SELECT pf_id, price_aed FROM properties');
    const map = new Map();
    for (const row of res.rows) {
        map.set(row.pf_id, row.price_aed ? Number(row.price_aed) : null);
    }
    return map;
}

function filterNewItems(items, existingMap) {
    const newItems = [];
    const unchanged = [];
    const priceChanged = [];

    for (const item of items) {
        const pfId = item.id?.toString();
        if (!pfId) continue;

        if (!existingMap.has(pfId)) {
            newItems.push(item);
        } else {
            const oldPrice = existingMap.get(pfId);
            const newPrice = item.price ?? null;
            if (oldPrice !== null && newPrice !== null && oldPrice !== newPrice) {
                priceChanged.push(item);
            } else {
                unchanged.push(item);
            }
        }
    }

    return { newItems, priceChanged, unchanged };
}

function mapProperty(item) {
    // Detectar si es off-plan: isNewConstruction o completionStatus presente
    const isOffPlan = item.isNewConstruction === true
        || (typeof item.completionStatus === 'string' && item.completionStatus.length > 0)
        || item.isBrokerProjectProperty === true;

    return {
        pf_id: item.id?.toString() ?? null,
        url: item.url ?? null,
        listing_id: item.listingId ?? null,
        reference: item.reference ?? null,
        rera: item.rera ?? null,

        title: item.title ?? null,
        description: item.description ?? null,
        display_address: item.displayAddress ?? null,

        building_name: item.buildingName ?? null,
        community: item.community ?? null,
        community_name: item.communityName ?? null,
        city: item.city ?? null,
        location_tree: item.locationTree ?? null,
        latitude: item.coordinates?.latitude ?? null,
        longitude: item.coordinates?.longitude ?? null,

        property_type: item.propertyType ?? null,
        property_type_id: item.propertyTypeId ?? null,
        listing_type: item.type ?? null,
        bedrooms: item.bedrooms ?? null,
        bedrooms_value: item.bedroomsValue ?? null,
        bathrooms: item.bathroomsValue ?? null,
        size_sqft: item.size ?? null,
        size_min: item.sizeMin ?? null,
        size_unit: item.sizeUnit ?? 'sqft',
        furnishing: item.furnishing ?? null,
        completion_status: item.completionStatus ?? null,

        price_aed: item.price ?? null,
        price_currency: item.priceCurrency ?? 'AED',
        price_duration: item.priceDuration ?? null,
        payment_method: item.paymentMethod ?? null,

        features: item.features ?? null,
        amenities: item.amenities ?? null,
        images: item.images ?? null,

        agent_name: item.agent ?? null,
        agent_phone: item.agentPhone ?? null,
        agent_whatsapp: item.agentWhatsapp ?? null,
        agent_email: item.agentEmail ?? null,
        agent_info: item.agentInfo ?? null,

        broker_name: item.broker ?? null,
        broker_phone: item.brokerInfo?.phone ?? null,
        broker_email: item.brokerInfo?.email ?? null,
        broker_info: item.brokerInfo ?? null,

        is_verified: item.isVerified ?? false,
        is_off_plan: isOffPlan,
        is_premium: item.isPremium ?? false,
        is_exclusive: item.isExclusive ?? false,
        is_direct_developer: item.isDirectFromDeveloper ?? false,
        is_new_construction: item.isNewConstruction ?? false,
        is_available: item.isAvailable ?? true,
        is_featured: item.isFeatured ?? false,
        listing_level: item.listingLevel ?? null,

        raw_data: item,

        added_on_pf: item.addedOn ?? null,
    };
}

async function upsertProperties(items) {
    const client = await pool.connect();
    let inserted = 0;
    let updated = 0;

    const UPSERT_SQL = `
    INSERT INTO properties (
      pf_id, url, listing_id, reference, rera,
      title, description, display_address,
      building_name, community, community_name, city, location_tree, latitude, longitude,
      property_type, property_type_id, listing_type,
      bedrooms, bedrooms_value, bathrooms, size_sqft, size_min, size_unit,
      furnishing, completion_status,
      price_aed, price_currency, price_duration, payment_method,
      features, amenities, images,
      agent_name, agent_phone, agent_whatsapp, agent_email, agent_info,
      broker_name, broker_phone, broker_email, broker_info,
      is_verified, is_off_plan, is_premium, is_exclusive,
      is_direct_developer, is_new_construction, is_available, is_featured, listing_level,
      raw_data, added_on_pf, scraped_at
    ) VALUES (
      $1,$2,$3,$4,$5,
      $6,$7,$8,
      $9,$10,$11,$12,$13,$14,$15,
      $16,$17,$18,
      $19,$20,$21,$22,$23,$24,
      $25,$26,
      $27,$28,$29,$30,
      $31,$32,$33,
      $34,$35,$36,$37,$38,
      $39,$40,$41,$42,
      $43,$44,$45,$46,
      $47,$48,$49,$50,$51,
      $52,$53, NOW()
    )
    ON CONFLICT (pf_id) DO UPDATE SET
      url               = EXCLUDED.url,
      title             = EXCLUDED.title,
      price_aed         = EXCLUDED.price_aed,
      description       = EXCLUDED.description,
      features          = EXCLUDED.features,
      images            = EXCLUDED.images,
      is_available      = EXCLUDED.is_available,
      is_off_plan       = EXCLUDED.is_off_plan,
      completion_status = EXCLUDED.completion_status,
      raw_data          = EXCLUDED.raw_data,
      updated_at        = NOW()
    RETURNING (xmax = 0) AS inserted
  `;

    try {
        await client.query('BEGIN');

        for (const item of items) {
            if (!item.id) continue;

            const p = mapProperty(item);
            const values = [
                p.pf_id, p.url, p.listing_id, p.reference, p.rera,
                p.title, p.description, p.display_address,
                p.building_name, p.community, p.community_name, p.city,
                JSON.stringify(p.location_tree), p.latitude, p.longitude,
                p.property_type, p.property_type_id, p.listing_type,
                p.bedrooms, p.bedrooms_value, p.bathrooms, p.size_sqft, p.size_min, p.size_unit,
                p.furnishing, p.completion_status,
                p.price_aed, p.price_currency, p.price_duration, JSON.stringify(p.payment_method),
                JSON.stringify(p.features), JSON.stringify(p.amenities), JSON.stringify(p.images),
                p.agent_name, p.agent_phone, p.agent_whatsapp, p.agent_email, JSON.stringify(p.agent_info),
                p.broker_name, p.broker_phone, p.broker_email, JSON.stringify(p.broker_info),
                p.is_verified, p.is_off_plan, p.is_premium, p.is_exclusive,
                p.is_direct_developer, p.is_new_construction, p.is_available, p.is_featured, p.listing_level,
                JSON.stringify(p.raw_data), p.added_on_pf,
            ];

            const res = await client.query(UPSERT_SQL, values);
            if (res.rows[0]?.inserted) inserted++;
            else updated++;
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

    return { inserted, updated };
}

async function updatePriceOnly(items) {
    if (items.length === 0) return 0;
    const client = await pool.connect();
    let count = 0;

    const SQL = `
    UPDATE properties SET
      price_aed = $2,
      is_available = $3,
      updated_at = NOW()
    WHERE pf_id = $1 AND (price_aed IS DISTINCT FROM $2 OR is_available IS DISTINCT FROM $3)
    `;

    try {
        await client.query('BEGIN');
        for (const item of items) {
            const pfId = item.id?.toString();
            if (!pfId) continue;
            const res = await client.query(SQL, [pfId, item.price ?? null, item.isAvailable ?? true]);
            if (res.rowCount > 0) count++;
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

    return count;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDuration(ms) {
    const s = Math.round(ms / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    trackSkill('data-agent', 'apify-propertyfinder', 'data', 'completed').catch(() => {});
    const startTime = Date.now();
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║  Emiralia — Data Agent: PropertyFinder Scraper       ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    try {
        // 0. Salvaguardas
        if (MAX_RESULTS === 0 && !forceFlag && !runIdArg) {
            console.error('❌ SEGURIDAD: MAX_RESULTS está a 0 (sin límite).');
            console.error('   Esto puede consumir muchos créditos en Apify.');
            console.error('   Usa un valor > 0 en .env o usa la bandera --force si estás seguro.');
            process.exit(1);
        }

        // 1. Test conexión a DB
        await pool.query('SELECT 1');
        console.log('✅ Conexión a PostgreSQL OK\n');

        let finishedRun;

        if (runIdArg) {
            // Modo Rescate: Usar un Run ID existente
            console.log(`🔍 Modo RESCATE: Recuperando datos del Run ID: ${runIdArg}`);
            const res = await axios.get(`${APIFY_BASE}/actor-runs/${runIdArg}`, { params: { token: APIFY_TOKEN } });
            finishedRun = res.data.data;
            if (!['SUCCEEDED', 'ABORTED', 'TIMED-OUT'].includes(finishedRun.status)) {
                console.warn(`⚠️  El run ${runIdArg} tiene estado ${finishedRun.status}. Intentando descargar igual...`);
            }
        } else {
            // Modo Normal: Lanzar nuevo run
            const run = await startRun();
            finishedRun = await waitForRun(run.id);
        }

        // 4. Descargar dataset
        const items = await fetchDataset(finishedRun.defaultDatasetId);

        if (items.length === 0) {
            console.log('\n⚠️  No se encontraron propiedades. Revisa la SEARCH_URL en .env');
            return;
        }

        // 5. Filtrar y hacer upsert
        let inserted = 0, updated = 0, skipped = 0, priceUpdated = 0;

        if (incrementalFlag) {
            console.log(`\n🔍 Modo incremental: comparando ${items.length} items contra DB...`);
            const existingMap = await getExistingProperties();
            console.log(`   ${existingMap.size} propiedades ya en DB`);

            const { newItems, priceChanged, unchanged } = filterNewItems(items, existingMap);
            skipped = unchanged.length;
            console.log(`   📊 Nuevas: ${newItems.length} | Precio cambiado: ${priceChanged.length} | Sin cambios: ${skipped}`);

            if (newItems.length > 0) {
                console.log(`\n💾 Insertando ${newItems.length} propiedades nuevas...`);
                const result = await upsertProperties(newItems);
                inserted = result.inserted;
                updated = result.updated;
            }

            if (priceChanged.length > 0) {
                console.log(`💰 Actualizando precio de ${priceChanged.length} propiedades...`);
                priceUpdated = await updatePriceOnly(priceChanged);
            }
        } else {
            console.log(`\n💾 Guardando ${items.length} propiedades en base de datos...`);
            const result = await upsertProperties(items);
            inserted = result.inserted;
            updated = result.updated;
        }

        // 6. Resumen
        const elapsed = formatDuration(Date.now() - startTime);
        const savedPct = items.length > 0 ? Math.round((skipped / items.length) * 100) : 0;
        console.log('\n╔══════════════════════════════════════════════════════╗');
        console.log(`║  ✅ Completado en ${elapsed.padEnd(36)}║`);
        console.log(`║  📥 Nuevas:       ${inserted.toString().padEnd(36)}║`);
        console.log(`║  🔄 Actualizadas: ${updated.toString().padEnd(36)}║`);
        if (incrementalFlag) {
        console.log(`║  💰 Precio upd:   ${priceUpdated.toString().padEnd(36)}║`);
        console.log(`║  ⏭️  Omitidas:     ${skipped.toString().padEnd(36)}║`);
        console.log(`║  💡 Ahorro DB:     ${(savedPct + '%').padEnd(36)}║`);
        }
        console.log(`║  📊 Total Apify:   ${items.length.toString().padEnd(36)}║`);
        console.log('╚══════════════════════════════════════════════════════╝');

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        if (err.response?.data) {
            console.error('   Respuesta Apify:', JSON.stringify(err.response.data, null, 2));
        }
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
