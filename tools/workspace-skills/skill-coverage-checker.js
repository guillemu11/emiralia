/**
 * Emiralia — Skill Coverage Checker
 *
 * Scans tools/**\/*.js and checks which files have trackSkill instrumentation.
 * Used by WAT Auditor to detect uninstrumented tools.
 *
 * Usage:
 *   node tools/workspace-skills/skill-coverage-checker.js
 */

import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOLS_ROOT = resolve(__dirname, '..');

// Files to exclude from coverage check (infrastructure, not feature tools)
const EXCLUDED = new Set([
    'tools/db/pool.js',
    'tools/db/schema.sql',
    'tools/db/memory.js',
    'tools/db/wat-memory.js',
    'tools/db/init_db.js',
    'tools/db/seed_agents.js',
    'tools/db/save_project.js',
    'tools/db/save_research.js',
    'tools/db/migrate_memory.js',
    'tools/db/track_skill.js',
    'tools/workspace-skills/skill-tracker.js',
    'tools/workspace-skills/activity-harvester.js',
    'tools/workspace-skills/seed-skill-invocations.js',
    'tools/workspace-skills/skill-coverage-checker.js',
    'tools/telegram/telegram-prompt.js',
    'tools/telegram/skill-ranking-prompt.js',
    'tools/pm-agent/context-builder.js',
    'tools/pm-agent/inbox-cli.js',
    'tools/translate/glossary.js',
    'tools/db/query_skill_usage.js',
    'tools/telegram/bot.js',
]);

/**
 * Check tracking coverage across all tool JS files.
 * @returns {{ instrumented: string[], missing: string[], total: number, percentage: number }}
 */
export async function checkCoverage() {
    const instrumented = [];
    const missing = [];

    // Find all JS files under tools/
    const files = [];
    for await (const entry of findJsFiles(TOOLS_ROOT)) {
        files.push(entry);
    }

    for (const filePath of files) {
        const rel = relative(resolve(TOOLS_ROOT, '..'), filePath).replace(/\\/g, '/');

        if (EXCLUDED.has(rel)) continue;

        try {
            const content = await readFile(filePath, 'utf-8');
            const hasTracking = /trackSkill|track\(|from.*track_skill/.test(content);

            if (hasTracking) {
                instrumented.push(rel);
            } else {
                missing.push(rel);
            }
        } catch {
            // Skip unreadable files
        }
    }

    const total = instrumented.length + missing.length;
    const percentage = total > 0 ? Math.round((instrumented.length / total) * 100) : 0;

    return { instrumented, missing, total, percentage };
}

async function* findJsFiles(dir) {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const full = resolve(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules') {
            yield* findJsFiles(full);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            yield full;
        }
    }
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('skill-coverage-checker.js');

if (isDirectRun) {
    try {
        const { instrumented, missing, total, percentage } = await checkCoverage();

        console.log(`\n📊 Skill Coverage Report`);
        console.log(`${'─'.repeat(50)}`);
        console.log(`✅ Instrumented: ${instrumented.length}/${total} (${percentage}%)\n`);

        if (instrumented.length > 0) {
            console.log('Instrumented:');
            for (const f of instrumented) console.log(`  ✅ ${f}`);
        }

        if (missing.length > 0) {
            console.log('\nMissing tracking:');
            for (const f of missing) console.log(`  ❌ ${f}`);
        }

        console.log(`\n${'─'.repeat(50)}`);
        console.log(`Coverage: ${percentage}%`);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}
