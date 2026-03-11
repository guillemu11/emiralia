/**
 * Emiralia — Data Agent: PanicSelling.xyz Scraper
 *
 * Lanza el actor Apify `apify/playwright-scraper` contra panicselling.xyz,
 * descarga los datos de price drops y hace upsert en PostgreSQL.
 *
 * Uso:
 *   node tools/apify_panicselling.js                  # Lanza nuevo run
 *   node tools/apify_panicselling.js <RUN_ID>         # Recupera un run existente
 *   node tools/apify_panicselling.js --help            # Ayuda
 *
 * Variables de entorno: APIFY_TOKEN, PG_HOST, PG_PORT, PG_DB, PG_USER, PG_PASSWORD
 */

import 'dotenv/config';
import axios from 'axios';
import pg from 'pg';
import crypto from 'crypto';
import { trackSkill } from './workspace-skills/skill-tracker.js';

const { Pool } = pg;

// ─── CLI Args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const runIdArg = args.find(a => !a.startsWith('--')) || null;
const maxPagesArg = args.find(a => a.startsWith('--pages='))?.split('=')[1];
const MAX_PAGES = parseInt(maxPagesArg || '10', 10);

if (args.includes('--help')) {
    console.log(`
Uso: node tools/apify_panicselling.js [RUN_ID] [Opciones]

Opciones:
  RUN_ID            ID de una ejecución existente para descargar y procesar.
  --pages=N         Número máximo de páginas a scrollear (default: 10).
  --help            Muestra esta ayuda.

Ejemplo:
  node tools/apify_panicselling.js                  # Nuevo scrape
  node tools/apify_panicselling.js --pages=5        # Limitar a 5 scrolls
  node tools/apify_panicselling.js abc123def         # Recuperar run existente
    `);
    process.exit(0);
}

// ─── Config ──────────────────────────────────────────────────────────────────

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = 'apify/playwright-scraper';
const TARGET_URL = 'https://www.panicselling.xyz/dubai/';

const APIFY_BASE = 'https://api.apify.com/v2';
const POLL_INTERVAL = 5000;
const RUN_TIMEOUT = 15 * 60 * 1000; // 15 min

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
});

// ─── Page Function (runs in browser context) ────────────────────────────────
// This function is serialized and sent to Apify's Playwright actor.
// It executes inside the actual browser on panicselling.xyz.

const PAGE_FUNCTION_STR = `
async function pageFunction(context) {
    const { page, request, log } = context;

    log.info('Navigating to ' + request.url);

    // Wait for the page to fully render
    await page.waitForTimeout(5000);

    // Scroll down to load more listings (infinite scroll / lazy load)
    const MAX_SCROLLS = ${MAX_PAGES};
    let previousHeight = 0;

    for (let i = 0; i < MAX_SCROLLS; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(2000);

        const currentHeight = await page.evaluate(() => document.body.scrollHeight);
        if (currentHeight === previousHeight) {
            log.info('No more content to load after ' + (i + 1) + ' scrolls');
            break;
        }
        previousHeight = currentHeight;
        log.info('Scroll ' + (i + 1) + '/' + MAX_SCROLLS + ' - height: ' + currentHeight);
    }

    // Extract all property cards/listings from the page
    const listings = await page.evaluate(() => {
        const results = [];

        // Strategy 1: Look for common listing card patterns
        // PanicSelling likely uses cards with price drop info
        const cards = document.querySelectorAll(
            '[class*="card"], [class*="listing"], [class*="property"], ' +
            '[class*="Card"], [class*="Listing"], [class*="Property"], ' +
            'article, [data-testid*="listing"], [data-testid*="property"]'
        );

        if (cards.length > 0) {
            cards.forEach((card, idx) => {
                const text = card.innerText || '';
                const links = card.querySelectorAll('a[href]');
                const images = card.querySelectorAll('img[src]');

                // Extract prices - look for AED amounts
                const priceMatches = text.match(/AED[\\s]*([\\d,]+)/gi) || [];
                const pctMatch = text.match(/(\\d+\\.?\\d*)\\s*%/);

                // Try to find structured data
                const result = {
                    index: idx,
                    text: text.substring(0, 2000),
                    html: card.outerHTML.substring(0, 3000),
                    prices: priceMatches.map(p => p.replace(/[^\\d]/g, '')),
                    dropPct: pctMatch ? pctMatch[1] : null,
                    links: Array.from(links).map(a => ({
                        href: a.href,
                        text: (a.innerText || '').substring(0, 200)
                    })),
                    images: Array.from(images).map(img => img.src).filter(s => s && !s.startsWith('data:')),
                    tagName: card.tagName,
                    className: card.className
                };

                // Only include cards that look like property listings
                // (have price data or links to property sites)
                const hasPropertyLink = result.links.some(l =>
                    l.href.includes('propertyfinder') ||
                    l.href.includes('bayut') ||
                    l.href.includes('dubizzle')
                );
                const hasPrice = result.prices.length > 0;
                const hasDrop = result.dropPct !== null;
                const textLooksLikeProperty = /bed|bath|sqft|sq\\.?\\s*ft|apartment|villa|penthouse|townhouse|studio/i.test(text);

                if (hasPrice || hasDrop || hasPropertyLink || textLooksLikeProperty) {
                    results.push(result);
                }
            });
        }

        // Strategy 2: If no cards found, try table rows
        if (results.length === 0) {
            const rows = document.querySelectorAll('tr, [role="row"]');
            rows.forEach((row, idx) => {
                const text = row.innerText || '';
                if (/AED|\\d{1,3}(,\\d{3})+/.test(text) && /bed|bath|sqft|apartment|villa/i.test(text)) {
                    const links = row.querySelectorAll('a[href]');
                    results.push({
                        index: idx,
                        text: text.substring(0, 2000),
                        html: row.outerHTML.substring(0, 3000),
                        links: Array.from(links).map(a => ({ href: a.href, text: (a.innerText || '').substring(0, 200) })),
                        tagName: 'TR',
                        className: row.className
                    });
                }
            });
        }

        // Strategy 3: Fallback - grab the entire page structure for analysis
        if (results.length === 0) {
            const body = document.body.innerText || '';
            results.push({
                index: 0,
                text: body.substring(0, 50000),
                html: document.body.innerHTML.substring(0, 50000),
                links: Array.from(document.querySelectorAll('a[href]')).slice(0, 100).map(a => ({
                    href: a.href,
                    text: (a.innerText || '').substring(0, 200)
                })),
                tagName: 'BODY',
                className: '_fallback_full_page_',
                note: 'No structured listings found - returning full page for analysis'
            });
        }

        return results;
    });

    log.info('Extracted ' + listings.length + ' items from page');
    return listings;
}
`;

// ─── Apify helpers ───────────────────────────────────────────────────────────

async function startRun() {
    const input = {
        startUrls: [{ url: TARGET_URL }],
        pageFunction: PAGE_FUNCTION_STR,
        proxyConfiguration: { useApifyProxy: true },
        preNavigationHooks: `[
            async ({ page }, goToOptions) => {
                goToOptions.waitUntil = 'networkidle';
                goToOptions.timeout = 60000;
            }
        ]`,
        maxRequestsPerCrawl: 1,
        requestHandlerTimeoutSecs: 120,
        headless: true,
        browserLog: false,
    };

    console.log(`🚀 Iniciando actor Apify: ${ACTOR_ID}`);
    console.log(`   Target: ${TARGET_URL}`);
    console.log(`   Max scrolls: ${MAX_PAGES}`);

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

    throw new Error('Timeout esperando el run de Apify (> 15 min)');
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
            },
        }
    );

    // The playwright-scraper returns an array of arrays (one per page)
    // Flatten it
    let items = res.data;
    if (Array.isArray(items) && items.length > 0 && Array.isArray(items[0])) {
        items = items.flat();
    }

    console.log(`   ${items.length} items descargados del dataset`);
    return items;
}

// ─── Data parsing ────────────────────────────────────────────────────────────

function generateSourceId(item) {
    // Create a unique ID from the item's key properties
    const key = (item.text || '').substring(0, 500) +
        (item.links?.[0]?.href || '') +
        (item.index || 0);
    return crypto.createHash('md5').update(key).digest('hex').substring(0, 16);
}

function parsePrice(str) {
    if (!str) return null;
    const cleaned = str.replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) : null;
}

function parseListingFromCard(item) {
    const text = item.text || '';

    // Extract location - usually after property type
    const locationPatterns = [
        /(?:in|at|,)\s+([A-Z][a-zA-Z\s]+(?:Dubai|Marina|Creek|Heights|Bay|Hills|Palm|Downtown|JBR|JLT|JVC|Business Bay))/i,
        /(?:Dubai\s+)?([A-Za-z\s]+(?:Marina|Creek|Heights|Bay|Hills|Palm|Downtown|JBR|JLT|JVC|Business Bay))/i,
    ];
    let location = null;
    for (const pat of locationPatterns) {
        const m = text.match(pat);
        if (m) { location = m[1].trim(); break; }
    }

    // Extract property type
    const typeMatch = text.match(/\b(apartment|villa|penthouse|townhouse|studio|duplex|loft)\b/i);
    const propertyType = typeMatch ? typeMatch[1] : null;

    // Extract bedrooms
    const bedMatch = text.match(/(\d+)\s*(?:bed|br|bedroom)/i) || text.match(/\b(studio)\b/i);
    const bedrooms = bedMatch ? bedMatch[1] : null;

    // Extract bathrooms
    const bathMatch = text.match(/(\d+)\s*(?:bath|ba|bathroom)/i);
    const bathrooms = bathMatch ? bathMatch[1] : null;

    // Extract size
    const sizeMatch = text.match(/([\d,]+)\s*(?:sq\.?\s*ft|sqft)/i);
    const sizeSqft = sizeMatch ? parsePrice(sizeMatch[1]) : null;

    // Extract prices (AED amounts)
    const prices = (item.prices || []).map(p => parseInt(p, 10)).filter(p => p > 0).sort((a, b) => b - a);
    let originalPrice = null;
    let currentPrice = null;

    if (prices.length >= 2) {
        originalPrice = prices[0]; // highest = original
        currentPrice = prices[prices.length - 1]; // lowest = current
    } else if (prices.length === 1) {
        currentPrice = prices[0];
    }

    // Extract drop percentage
    const dropPct = item.dropPct ? parseFloat(item.dropPct) : null;

    // Calculate missing values
    let priceDropAed = null;
    if (originalPrice && currentPrice) {
        priceDropAed = originalPrice - currentPrice;
    }

    // If we have dropPct and currentPrice but no original, calculate it
    if (!originalPrice && currentPrice && dropPct) {
        originalPrice = Math.round(currentPrice / (1 - dropPct / 100));
        priceDropAed = originalPrice - currentPrice;
    }

    // Extract source URL
    const sourceUrl = item.links?.find(l =>
        l.href.includes('propertyfinder') ||
        l.href.includes('bayut') ||
        l.href.includes('dubizzle')
    )?.href || item.links?.[0]?.href || null;

    // Extract title
    const title = text.split('\n').find(line => line.trim().length > 10 && line.trim().length < 200)?.trim()
        || (propertyType ? `${propertyType} in ${location || 'Dubai'}` : null);

    // Extract image
    const imageUrl = item.images?.[0] || null;

    return {
        source_id: generateSourceId(item),
        source_url: sourceUrl,
        title,
        location,
        property_type: propertyType,
        bedrooms,
        bathrooms,
        size_sqft: sizeSqft,
        original_price: originalPrice,
        current_price: currentPrice,
        price_drop_aed: priceDropAed,
        price_drop_pct: dropPct,
        developer: null,
        building_name: null,
        image_url: imageUrl,
        listed_date: null,
        drop_detected_at: null,
        raw_data: item,
    };
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

async function ensureTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS price_drops (
            id                SERIAL PRIMARY KEY,
            source_id         TEXT UNIQUE,
            source_url        TEXT,
            title             TEXT,
            location          TEXT,
            property_type     TEXT,
            bedrooms          TEXT,
            bathrooms         TEXT,
            size_sqft         NUMERIC(10, 2),
            original_price    BIGINT,
            current_price     BIGINT,
            price_drop_aed    BIGINT,
            price_drop_pct    NUMERIC(5, 2),
            price_currency    TEXT DEFAULT 'AED',
            developer         TEXT,
            building_name     TEXT,
            image_url         TEXT,
            listed_date       TEXT,
            drop_detected_at  TEXT,
            raw_data          JSONB,
            scraped_at        TIMESTAMPTZ DEFAULT NOW(),
            updated_at        TIMESTAMPTZ DEFAULT NOW()
        );
    `);
}

async function upsertPriceDrops(listings) {
    const client = await pool.connect();
    let inserted = 0;
    let updated = 0;

    const UPSERT_SQL = `
    INSERT INTO price_drops (
        source_id, source_url, title, location, property_type,
        bedrooms, bathrooms, size_sqft,
        original_price, current_price, price_drop_aed, price_drop_pct,
        developer, building_name, image_url,
        listed_date, drop_detected_at,
        raw_data, scraped_at
    ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15,
        $16, $17,
        $18, NOW()
    )
    ON CONFLICT (source_id) DO UPDATE SET
        source_url      = EXCLUDED.source_url,
        title           = EXCLUDED.title,
        current_price   = EXCLUDED.current_price,
        price_drop_aed  = EXCLUDED.price_drop_aed,
        price_drop_pct  = EXCLUDED.price_drop_pct,
        raw_data        = EXCLUDED.raw_data,
        updated_at      = NOW()
    RETURNING (xmax = 0) AS inserted
    `;

    try {
        await client.query('BEGIN');

        for (const listing of listings) {
            if (!listing.source_id) continue;

            const values = [
                listing.source_id, listing.source_url, listing.title,
                listing.location, listing.property_type,
                listing.bedrooms, listing.bathrooms, listing.size_sqft,
                listing.original_price, listing.current_price,
                listing.price_drop_aed, listing.price_drop_pct,
                listing.developer, listing.building_name, listing.image_url,
                listing.listed_date, listing.drop_detected_at,
                JSON.stringify(listing.raw_data),
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
    trackSkill('data-agent', 'apify-panicselling', 'data', 'completed').catch(() => {});
    const startTime = Date.now();
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║  Emiralia — Data Agent: PanicSelling.xyz Scraper     ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    try {
        // 1. Test DB connection & ensure table
        await pool.query('SELECT 1');
        console.log('✅ Conexión a PostgreSQL OK');
        await ensureTable();
        console.log('✅ Tabla price_drops verificada\n');

        let finishedRun;

        if (runIdArg) {
            console.log(`🔍 Modo RESCATE: Recuperando datos del Run ID: ${runIdArg}`);
            const res = await axios.get(`${APIFY_BASE}/actor-runs/${runIdArg}`, { params: { token: APIFY_TOKEN } });
            finishedRun = res.data.data;
            if (!['SUCCEEDED', 'ABORTED', 'TIMED-OUT'].includes(finishedRun.status)) {
                console.warn(`⚠️  El run ${runIdArg} tiene estado ${finishedRun.status}. Intentando descargar igual...`);
            }
        } else {
            const run = await startRun();
            finishedRun = await waitForRun(run.id);
        }

        // Download dataset
        const rawItems = await fetchDataset(finishedRun.defaultDatasetId);

        if (rawItems.length === 0) {
            console.log('\n⚠️  No se encontraron datos. La página puede haber cambiado su estructura.');
            return;
        }

        // Check if we got a fallback full-page dump
        const isFallback = rawItems.some(i => i.className === '_fallback_full_page_');
        if (isFallback) {
            console.log('\n⚠️  No se encontraron listings estructurados.');
            console.log('   Se guardará el contenido completo de la página para análisis.');
            console.log('   Revisa el raw_data para adaptar los selectores.\n');

            // Save raw page data for manual analysis
            const dumpPath = 'tools/panicselling_page_dump.json';
            const fs = await import('fs');
            fs.writeFileSync(dumpPath, JSON.stringify(rawItems, null, 2));
            console.log(`   📄 Page dump guardado en: ${dumpPath}`);
            return;
        }

        // Parse listings
        console.log(`\n🔍 Parseando ${rawItems.length} items extraídos...`);
        const listings = rawItems
            .map(parseListingFromCard)
            .filter(l => l.current_price || l.price_drop_pct); // Only keep items with price data

        console.log(`   ${listings.length} listings con datos de precio válidos`);

        if (listings.length === 0) {
            console.log('\n⚠️  Ningún item tiene datos de precio. Guardando raw dump...');
            const fs = await import('fs');
            fs.writeFileSync('tools/panicselling_page_dump.json', JSON.stringify(rawItems, null, 2));
            console.log('   📄 Page dump guardado en: tools/panicselling_page_dump.json');
            return;
        }

        // Upsert to DB
        console.log(`\n💾 Guardando ${listings.length} price drops en base de datos...`);
        const { inserted, updated } = await upsertPriceDrops(listings);

        // Summary
        const elapsed = formatDuration(Date.now() - startTime);
        console.log('\n╔══════════════════════════════════════════════════════╗');
        console.log(`║  ✅ Completado en ${elapsed.padEnd(36)}║`);
        console.log(`║  📥 Nuevos:        ${inserted.toString().padEnd(35)}║`);
        console.log(`║  🔄 Actualizados:  ${updated.toString().padEnd(35)}║`);
        console.log(`║  📊 Total raw:     ${rawItems.length.toString().padEnd(35)}║`);
        console.log(`║  📊 Con precio:    ${listings.length.toString().padEnd(35)}║`);
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
