/**
 * Emiralia — Property Search API Routes
 *
 * Endpoints consumed by the website property listing page (propiedades.html).
 * All queries exclude duplicates (duplicate_of IS NULL) and unavailable listings.
 */

import { Router } from 'express';
import pool from '../../../../tools/db/pool.js';

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

const ALLOWED_SORTS = {
    newest: 'scraped_at DESC',
    price_asc: 'price_aed ASC',
    price_desc: 'price_aed DESC',
    size_desc: 'size_sqft DESC NULLS LAST',
};

function buildWhereClause(query) {
    const conditions = ['is_available = TRUE', 'duplicate_of IS NULL'];
    const params = [];

    if (query.q) {
        params.push(`%${query.q}%`);
        conditions.push(`(title ILIKE $${params.length} OR community ILIKE $${params.length} OR display_address ILIKE $${params.length})`);
    }
    if (query.city) {
        params.push(query.city);
        conditions.push(`city = $${params.length}`);
    }
    if (query.community) {
        params.push(`%${query.community}%`);
        conditions.push(`community ILIKE $${params.length}`);
    }
    if (query.property_type) {
        params.push(query.property_type);
        conditions.push(`property_type = $${params.length}`);
    }
    if (query.bedrooms) {
        const beds = query.bedrooms.split(',').map(b => b.trim());
        const bedConditions = [];
        const hasStudio = beds.includes('studio') || beds.includes('0');
        const numericBeds = beds.filter(b => b !== 'studio' && b !== '0').map(Number).filter(n => !isNaN(n));

        if (hasStudio) {
            bedConditions.push('bedrooms_value = 0');
        }
        if (numericBeds.length > 0) {
            params.push(numericBeds);
            bedConditions.push(`bedrooms_value = ANY($${params.length}::int[])`);
        }
        if (bedConditions.length > 0) {
            conditions.push(`(${bedConditions.join(' OR ')})`);
        }
    }
    if (query.price_min) {
        params.push(Number(query.price_min));
        conditions.push(`price_aed >= $${params.length}`);
    }
    if (query.price_max) {
        params.push(Number(query.price_max));
        conditions.push(`price_aed <= $${params.length}`);
    }
    if (query.size_min) {
        params.push(Number(query.size_min));
        conditions.push(`size_sqft >= $${params.length}`);
    }
    if (query.size_max) {
        params.push(Number(query.size_max));
        conditions.push(`size_sqft <= $${params.length}`);
    }
    if (query.is_off_plan === 'true') {
        conditions.push('is_off_plan = TRUE');
    } else if (query.is_off_plan === 'false') {
        conditions.push('(is_off_plan = FALSE OR is_off_plan IS NULL)');
    }
    if (query.is_verified === 'true') {
        conditions.push('is_verified = TRUE');
    }
    if (query.furnishing) {
        params.push(query.furnishing);
        conditions.push(`furnishing = $${params.length}`);
    }

    return { where: conditions.join(' AND '), params };
}

// ─── GET /api/properties ────────────────────────────────────────────────────
// Main search + filter + pagination endpoint.

router.get('/properties', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(48, Math.max(1, parseInt(req.query.limit) || 24));
        const offset = (page - 1) * limit;
        const sortKey = ALLOWED_SORTS[req.query.sort] ? req.query.sort : 'newest';
        const orderBy = ALLOWED_SORTS[sortKey];

        const { where, params } = buildWhereClause(req.query);

        params.push(limit);
        const limitParam = `$${params.length}`;
        params.push(offset);
        const offsetParam = `$${params.length}`;

        const sql = `
            SELECT
                pf_id, title, display_address, community, city,
                property_type, bedrooms, bedrooms_value, bathrooms,
                size_sqft, price_aed,
                furnishing, completion_status, is_off_plan, is_verified,
                is_premium, is_featured, is_exclusive,
                images, agent_name, broker_name,
                latitude, longitude,
                COUNT(*) OVER() AS total_count
            FROM properties
            WHERE ${where}
            ORDER BY ${orderBy}
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `;

        const result = await pool.query(sql, params);
        const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

        res.json({
            data: result.rows.map(r => {
                const { total_count, ...row } = r;
                return row;
            }),
            meta: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error('GET /api/properties error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/properties/map ────────────────────────────────────────────────
// Lightweight coords-only endpoint for map markers. Max 500.

router.get('/properties/map', async (req, res) => {
    try {
        const { where, params } = buildWhereClause(req.query);

        const sql = `
            SELECT pf_id, latitude AS lat, longitude AS lng, price_aed, is_off_plan
            FROM properties
            WHERE ${where}
              AND latitude IS NOT NULL
              AND longitude IS NOT NULL
            ORDER BY is_featured DESC NULLS LAST, scraped_at DESC
            LIMIT 500
        `;

        const result = await pool.query(sql, params);
        res.json({ markers: result.rows });
    } catch (err) {
        console.error('GET /api/properties/map error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/properties/facets ─────────────────────────────────────────────
// Aggregated counts for filter badges.

router.get('/properties/facets', async (req, res) => {
    try {
        const { where, params } = buildWhereClause(req.query);

        const [typesRes, citiesRes, bedsRes, priceRes] = await Promise.all([
            pool.query(`
                SELECT property_type AS value, COUNT(*)::int AS count
                FROM properties WHERE ${where} AND property_type IS NOT NULL
                GROUP BY property_type ORDER BY count DESC
            `, params),
            pool.query(`
                SELECT city AS value, COUNT(*)::int AS count
                FROM properties WHERE ${where} AND city IS NOT NULL
                GROUP BY city ORDER BY count DESC
            `, params),
            pool.query(`
                SELECT bedrooms_value AS value, COUNT(*)::int AS count
                FROM properties WHERE ${where} AND bedrooms_value IS NOT NULL
                GROUP BY bedrooms_value ORDER BY bedrooms_value ASC
            `, params),
            pool.query(`
                SELECT MIN(price_aed)::bigint AS min, MAX(price_aed)::bigint AS max
                FROM properties WHERE ${where} AND price_aed IS NOT NULL
            `, params),
        ]);

        res.json({
            property_types: typesRes.rows,
            cities: citiesRes.rows,
            bedrooms: bedsRes.rows.map(r => ({
                value: r.value,
                label: r.value === 0 ? 'Studio' : `${r.value} Hab.`,
                count: r.count,
            })),
            price_range: priceRes.rows[0] || { min: 0, max: 0 },
        });
    } catch (err) {
        console.error('GET /api/properties/facets error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/properties/:pf_id ─────────────────────────────────────────────
// Single property detail (for map popup).

router.get('/properties/:pf_id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM properties WHERE pf_id = $1`,
            [req.params.pf_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Property not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('GET /api/properties/:pf_id error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
