/**
 * Emiralia — Detect Duplicate Properties
 *
 * Detecta cross-broker duplicates en la tabla `properties`:
 * el mismo inmueble físico listado por diferentes agentes con distintos pf_id.
 *
 * Tier 1: Mismo rera (no nulo), diferente pf_id → duplicado definitivo
 * Tier 2: building_name + community + bedrooms_value + size_sqft (±1%) + price_aed (±5%)
 * Tier 3: GPS dentro de ~50m + bedrooms_value + size_sqft (±1%)
 *
 * Uso CLI:
 *   node tools/db/detect_duplicates.js --tier all --dry-run
 *   node tools/db/detect_duplicates.js --tier 1 --mark
 *   node tools/db/detect_duplicates.js --mark
 *
 * Uso como módulo:
 *   import { detectDuplicates } from './tools/db/detect_duplicates.js';
 */

import pool from './pool.js';
import { setMemory } from './memory.js';
import { trackSkill } from '../workspace-skills/skill-tracker.js';

// ─── SQL Queries ─────────────────────────────────────────────────────────────

const SQL_TIER1 = `
WITH rera_groups AS (
  SELECT
    rera,
    array_agg(
      pf_id ORDER BY
        is_verified DESC,
        is_premium DESC,
        scraped_at DESC
    ) AS pf_ids
  FROM properties
  WHERE rera IS NOT NULL
    AND rera != ''
    AND duplicate_of IS NULL
  GROUP BY rera
  HAVING COUNT(*) > 1
)
SELECT
  rera                     AS match_key,
  pf_ids[1]                AS canonical_pf_id,
  pf_ids[2:]               AS duplicate_pf_ids,
  pf_ids                   AS all_pf_ids,
  array_length(pf_ids, 1)  AS group_size
FROM rera_groups
ORDER BY group_size DESC;
`;

const SQL_TIER2 = `
SELECT
  a.pf_id                AS pf_id_a,
  b.pf_id                AS pf_id_b,
  a.building_name,
  a.community,
  a.bedrooms_value,
  a.size_sqft             AS size_a,
  b.size_sqft             AS size_b,
  a.price_aed             AS price_a,
  b.price_aed             AS price_b,
  a.broker_name           AS broker_a,
  b.broker_name           AS broker_b,
  a.scraped_at            AS scraped_a,
  b.scraped_at            AS scraped_b,
  a.is_verified           AS verified_a,
  b.is_verified           AS verified_b,
  a.is_premium            AS premium_a,
  b.is_premium            AS premium_b
FROM properties a
JOIN properties b ON (
  a.pf_id < b.pf_id
  AND a.building_name IS NOT NULL
  AND a.building_name != ''
  AND LOWER(TRIM(a.building_name)) = LOWER(TRIM(b.building_name))
  AND LOWER(TRIM(a.community))     = LOWER(TRIM(b.community))
  AND a.bedrooms_value              = b.bedrooms_value
  AND a.size_sqft IS NOT NULL
  AND b.size_sqft IS NOT NULL
  AND ABS(a.size_sqft - b.size_sqft) / NULLIF(a.size_sqft, 0) <= 0.01
  AND a.price_aed IS NOT NULL
  AND b.price_aed IS NOT NULL
  AND ABS(a.price_aed - b.price_aed)::FLOAT / NULLIF(a.price_aed, 0) <= 0.05
)
WHERE
  NOT (a.rera IS NOT NULL AND a.rera != '' AND b.rera IS NOT NULL AND b.rera != '' AND a.rera = b.rera)
  AND a.duplicate_of IS NULL
  AND b.duplicate_of IS NULL
ORDER BY a.building_name, a.community, a.bedrooms_value;
`;

/**
 * Tier 3: GPS proximity within ~50m + bedrooms_value + size_sqft (±1%).
 * At Dubai latitude (~25°N): 50m ≈ 0.00045° lat, 0.0005° lon.
 * Threshold 0.00055° is conservative (~55m worst case).
 */
const SQL_TIER3 = `
SELECT
  a.pf_id                AS pf_id_a,
  b.pf_id                AS pf_id_b,
  a.latitude              AS lat_a,
  a.longitude             AS lon_a,
  b.latitude              AS lat_b,
  b.longitude             AS lon_b,
  point(a.longitude, a.latitude) <-> point(b.longitude, b.latitude) AS gps_distance_deg,
  a.bedrooms_value,
  a.size_sqft             AS size_a,
  b.size_sqft             AS size_b,
  a.broker_name           AS broker_a,
  b.broker_name           AS broker_b,
  a.scraped_at            AS scraped_a,
  b.scraped_at            AS scraped_b,
  a.is_verified           AS verified_a,
  b.is_verified           AS verified_b,
  a.is_premium            AS premium_a,
  b.is_premium            AS premium_b
FROM properties a
JOIN properties b ON (
  a.pf_id < b.pf_id
  AND a.latitude  IS NOT NULL AND b.latitude  IS NOT NULL
  AND a.longitude IS NOT NULL AND b.longitude IS NOT NULL
  AND point(a.longitude, a.latitude) <-> point(b.longitude, b.latitude) < 0.00055
  AND a.bedrooms_value = b.bedrooms_value
  AND a.size_sqft IS NOT NULL AND b.size_sqft IS NOT NULL
  AND ABS(a.size_sqft - b.size_sqft) / NULLIF(a.size_sqft, 0) <= 0.01
)
WHERE
  NOT (a.rera IS NOT NULL AND a.rera != '' AND b.rera IS NOT NULL AND b.rera != '' AND a.rera = b.rera)
  AND a.duplicate_of IS NULL
  AND b.duplicate_of IS NULL
ORDER BY gps_distance_deg ASC;
`;

// ─── Union-Find (agrupa pares en clusters transitivos) ────────────────────────

function clusterPairs(pairs, detailByPfId) {
  const parent = new Map();

  function find(x) {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)));
    return parent.get(x);
  }

  function union(x, y) {
    const px = find(x), py = find(y);
    if (px !== py) parent.set(px, py);
  }

  for (const pair of pairs) {
    union(pair.pf_id_a, pair.pf_id_b);
  }

  const groups = new Map();
  for (const id of parent.keys()) {
    const root = find(id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(id);
  }

  return Array.from(groups.values()).map((ids) => {
    const details = ids
      .map((id) => detailByPfId.get(id) || { pf_id: id })
      .sort((a, b) => {
        if (b.is_verified !== a.is_verified) return (b.is_verified ? 1 : 0) - (a.is_verified ? 1 : 0);
        if (b.is_premium !== a.is_premium) return (b.is_premium ? 1 : 0) - (a.is_premium ? 1 : 0);
        return new Date(b.scraped_at || 0) - new Date(a.scraped_at || 0);
      });
    const canonical = details[0].pf_id;
    return {
      all_pf_ids: ids,
      canonical_pf_id: canonical,
      duplicate_pf_ids: ids.filter((id) => id !== canonical),
      group_size: ids.length,
    };
  });
}

// ─── Tier runners ─────────────────────────────────────────────────────────────

function buildDetailMap(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.pf_id_a)) {
      map.set(row.pf_id_a, {
        pf_id: row.pf_id_a,
        is_verified: row.verified_a,
        is_premium: row.premium_a,
        scraped_at: row.scraped_a,
        broker_name: row.broker_a,
      });
    }
    if (!map.has(row.pf_id_b)) {
      map.set(row.pf_id_b, {
        pf_id: row.pf_id_b,
        is_verified: row.verified_b,
        is_premium: row.premium_b,
        scraped_at: row.scraped_b,
        broker_name: row.broker_b,
      });
    }
  }
  return map;
}

async function runTier1() {
  const res = await pool.query(SQL_TIER1);
  return res.rows.map((row, i) => ({
    group_id: `t1-${i + 1}`,
    tier: 1,
    confidence: 'definitivo',
    canonical_pf_id: row.canonical_pf_id,
    duplicate_pf_ids: row.duplicate_pf_ids,
    all_pf_ids: row.all_pf_ids,
    group_size: row.group_size,
    reason: `rera: ${row.match_key}`,
  }));
}

async function runTier2() {
  const res = await pool.query(SQL_TIER2);
  if (res.rows.length === 0) return [];

  const detailByPfId = buildDetailMap(res.rows);
  const clusters = clusterPairs(res.rows, detailByPfId);

  return clusters.map((c, i) => ({
    group_id: `t2-${i + 1}`,
    tier: 2,
    confidence: 'probable',
    canonical_pf_id: c.canonical_pf_id,
    duplicate_pf_ids: c.duplicate_pf_ids,
    all_pf_ids: c.all_pf_ids,
    group_size: c.group_size,
    reason: 'building + community + specs match',
  }));
}

async function runTier3() {
  const res = await pool.query(SQL_TIER3);
  if (res.rows.length === 0) return [];

  const detailByPfId = buildDetailMap(res.rows);
  const clusters = clusterPairs(res.rows, detailByPfId);

  return clusters.map((c, i) => ({
    group_id: `t3-${i + 1}`,
    tier: 3,
    confidence: 'probable',
    canonical_pf_id: c.canonical_pf_id,
    duplicate_pf_ids: c.duplicate_pf_ids,
    all_pf_ids: c.all_pf_ids,
    group_size: c.group_size,
    reason: 'GPS proximity (~50m) + specs match',
  }));
}

// ─── Report ───────────────────────────────────────────────────────────────────

function printReport(groups) {
  const total = groups.reduce((acc, g) => acc + g.duplicate_pf_ids.length, 0);
  console.log(`\n${'='.repeat(70)}`);
  console.log('EMIRALIA — Dedup Report');
  console.log(`Grupos encontrados: ${groups.length} | Duplicados totales: ${total}`);
  console.log(`${'='.repeat(70)}\n`);

  const byTier = { 1: [], 2: [], 3: [] };
  for (const g of groups) byTier[g.tier].push(g);

  const tierLabels = {
    1: 'Definitivo — RERA',
    2: 'Probable — Edificio+Specs',
    3: 'Probable — GPS+Specs',
  };

  for (const tier of [1, 2, 3]) {
    const tierGroups = byTier[tier];
    if (tierGroups.length === 0) continue;

    console.log(`--- Tier ${tier} (${tierLabels[tier]}) ---`);
    console.log(
      `${'group_id'.padEnd(10)} ${'canonical'.padEnd(16)} ${'duplicates'.padEnd(35)} ${'size'.padEnd(5)} reason`
    );
    console.log('-'.repeat(80));

    for (const g of tierGroups) {
      console.log(
        `${g.group_id.padEnd(10)} ` +
        `${String(g.canonical_pf_id).padEnd(16)} ` +
        `${g.duplicate_pf_ids.join(', ').substring(0, 34).padEnd(35)} ` +
        `${String(g.group_size).padEnd(5)} ` +
        `${g.reason}`
      );
    }
    console.log('');
  }
}

// ─── Mark duplicates (--mark mode) ────────────────────────────────────────────

async function markDuplicates(groups) {
  const client = await pool.connect();
  let marked = 0;

  try {
    await client.query('BEGIN');

    for (const group of groups) {
      if (group.duplicate_pf_ids.length === 0) continue;

      const groupId = group.canonical_pf_id;
      const placeholders = group.duplicate_pf_ids.map((_, i) => `$${i + 3}`).join(', ');

      await client.query(
        `UPDATE properties
         SET duplicate_of = $1, duplicate_group = $2, updated_at = NOW()
         WHERE pf_id IN (${placeholders})
           AND duplicate_of IS NULL`,
        [group.canonical_pf_id, groupId, ...group.duplicate_pf_ids]
      );

      await client.query(
        `UPDATE properties
         SET duplicate_group = $1, updated_at = NOW()
         WHERE pf_id = $2
           AND duplicate_group IS NULL`,
        [groupId, group.canonical_pf_id]
      );

      marked += group.duplicate_pf_ids.length;
    }

    await client.query('COMMIT');
    console.log(`\n[Dedup] Marcados ${marked} duplicados en DB (transaccion completada).`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Dedup] Error en --mark mode. Rollback ejecutado.', err.message);
    throw err;
  } finally {
    client.release();
  }

  return marked;
}

// ─── Persist to agent memory ──────────────────────────────────────────────────

async function persistToMemory(groups, mode) {
  const now = new Date().toISOString();
  const totalDuplicates = groups.reduce((acc, g) => acc + g.duplicate_pf_ids.length, 0);
  const byTier = {
    tier1: groups.filter((g) => g.tier === 1).length,
    tier2: groups.filter((g) => g.tier === 2).length,
    tier3: groups.filter((g) => g.tier === 3).length,
  };

  await setMemory('data-agent', 'last_dedup_at', now, 'shared');
  await setMemory('data-agent', 'last_dedup_mode', mode, 'shared');
  await setMemory('data-agent', 'last_dedup_groups_found', groups.length, 'shared');
  await setMemory('data-agent', 'last_dedup_duplicates_found', totalDuplicates, 'shared');
  await setMemory('data-agent', 'last_dedup_by_tier', byTier, 'shared');

  console.log('[Memory] Estado guardado en agent_memory (data-agent).');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function detectDuplicates({ tier = 'all', dryRun = true, mark = false } = {}) {
  trackSkill('data-agent', 'detect-duplicates', 'data', 'completed').catch(() => {});
  const runAll = tier === 'all';
  let groups = [];

  console.log(`\n[Dedup] Iniciando deteccion — tier: ${tier} | mode: ${dryRun ? 'dry-run' : 'mark'}`);

  if (runAll || tier === '1') {
    console.log('[Dedup] Ejecutando Tier 1: RERA exacto...');
    const t1 = await runTier1();
    console.log(`  → ${t1.length} grupos encontrados`);
    groups.push(...t1);
  }

  if (runAll || tier === '2') {
    console.log('[Dedup] Ejecutando Tier 2: edificio + specs...');
    const t2 = await runTier2();
    console.log(`  → ${t2.length} grupos encontrados`);
    groups.push(...t2);
  }

  if (runAll || tier === '3') {
    console.log('[Dedup] Ejecutando Tier 3: GPS + specs...');
    const t3 = await runTier3();
    console.log(`  → ${t3.length} grupos encontrados`);
    groups.push(...t3);
  }

  printReport(groups);

  if (mark && !dryRun) {
    await markDuplicates(groups);
  } else {
    console.log('\n[Dedup] Modo dry-run — ninguna propiedad modificada en DB.');
    console.log('        Para marcar duplicados: node tools/db/detect_duplicates.js --mark');
  }

  await persistToMemory(groups, dryRun ? 'dry-run' : 'mark');

  return groups;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length > 0 || process.argv[1]?.includes('detect_duplicates')) {
  const tier = args.includes('--tier') ? args[args.indexOf('--tier') + 1] : 'all';
  const dryRun = !args.includes('--mark');
  const mark = args.includes('--mark');

  const validTiers = ['1', '2', '3', 'all'];
  if (!validTiers.includes(tier)) {
    console.error(`[Dedup] Tier invalido: "${tier}". Usar: 1 | 2 | 3 | all`);
    process.exit(1);
  }

  detectDuplicates({ tier, dryRun, mark })
    .then(() => pool.end())
    .catch((err) => {
      console.error('[Dedup] Error fatal:', err.message);
      pool.end();
      process.exit(1);
    });
}
