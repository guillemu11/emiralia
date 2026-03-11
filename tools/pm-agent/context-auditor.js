/**
 * Emiralia — PM Agent Context Auditor
 *
 * Audita el contexto del PM Agent en 6 dimensiones:
 *   completeness, consistency, freshness, usage, crossProject, alignment
 *
 * Produce un informe estructurado con score (0-100), grade (A-F),
 * y findings accionables clasificados por severidad.
 *
 * Uso desde codigo:
 *   import { auditPMContext } from './tools/pm-agent/context-auditor.js';
 *   const report = await auditPMContext(pool, { dimensions: ['completeness', 'freshness'] });
 *
 * Uso CLI:
 *   node tools/pm-agent/context-auditor.js full
 *   node tools/pm-agent/context-auditor.js completeness
 *   node tools/pm-agent/context-auditor.js consistency
 *   node tools/pm-agent/context-auditor.js freshness
 *   node tools/pm-agent/context-auditor.js usage
 *   node tools/pm-agent/context-auditor.js crossProject
 *   node tools/pm-agent/context-auditor.js alignment
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { getCheckRegistry } from './audit-checks.js';
import { trackSkill } from '../workspace-skills/skill-tracker.js';
import pool from '../db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

// ─── Scoring ────────────────────────────────────────────────────────────────

const SEVERITY_COST = { critical: 10, warning: 3, suggestion: 1 };

function calculateScore(findings) {
    let score = 100;
    for (const f of findings) {
        score -= SEVERITY_COST[f.severity] || 0;
    }
    return Math.max(0, score);
}

function scoreToGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
}

// ─── Core Audit ─────────────────────────────────────────────────────────────

/**
 * Ejecuta la auditoria del contexto del PM Agent.
 *
 * @param {Object} dbPool - PostgreSQL pool
 * @param {Object} [options]
 * @param {string[]} [options.dimensions] - Dimensiones a auditar (default: todas)
 * @param {number} [options.freshnessThresholdDays] - Dias para considerar stale (default: 7)
 * @param {boolean} [options.verbose] - Mostrar detalles extra
 * @returns {Object} Informe estructurado
 */
export async function auditPMContext(dbPool, options = {}) {
    const registry = getCheckRegistry();
    const allDimensions = [...registry.keys()];
    const targetDimensions = options.dimensions || allDimensions;

    const startTime = Date.now();
    const dimensions = {};
    const allFindings = [];

    for (const dim of targetDimensions) {
        const checks = registry.get(dim);
        if (!checks) {
            console.warn(`[ContextAuditor] Dimension desconocida: "${dim}"`);
            continue;
        }

        const dimFindings = [];
        for (const checkFn of checks) {
            try {
                const results = await checkFn(dbPool, ROOT, options);
                dimFindings.push(...results);
            } catch (err) {
                dimFindings.push({
                    severity: 'warning',
                    dimension: dim,
                    code: 'CHECK_ERROR',
                    message: `Error ejecutando check: ${err.message}`,
                    details: { error: err.message },
                    action: 'Revisar logs para diagnosticar el error',
                });
            }
        }

        const dimScore = calculateScore(dimFindings);
        dimensions[dim] = {
            score: dimScore,
            grade: scoreToGrade(dimScore),
            findings: dimFindings,
        };
        allFindings.push(...dimFindings);
    }

    const totalScore = calculateScore(allFindings);
    const durationMs = Date.now() - startTime;

    const critical = allFindings.filter(f => f.severity === 'critical').length;
    const warnings = allFindings.filter(f => f.severity === 'warning').length;
    const suggestions = allFindings.filter(f => f.severity === 'suggestion').length;

    // Top 5 acciones recomendadas (priorizando critical > warning > suggestion)
    const sorted = [...allFindings].sort((a, b) => {
        const order = { critical: 0, warning: 1, suggestion: 2 };
        return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
    });
    const topActions = sorted.slice(0, 5).map(f => f.action).filter(Boolean);

    return {
        timestamp: new Date().toISOString(),
        score: totalScore,
        grade: scoreToGrade(totalScore),
        durationMs,
        dimensionsAudited: targetDimensions,
        dimensions,
        summary: {
            critical,
            warnings,
            suggestions,
            total: allFindings.length,
            topActions,
        },
    };
}

// ─── Formatters ─────────────────────────────────────────────────────────────

function formatReportMarkdown(report) {
    let md = `# PM Agent Context Audit Report — ${report.timestamp.split('T')[0]}\n\n`;
    md += `**Score: ${report.score}/100** (${report.grade})\n`;
    md += `**Issues encontrados:** ${report.summary.critical} critical | ${report.summary.warnings} warnings | ${report.summary.suggestions} suggestions\n`;
    md += `**Duracion:** ${report.durationMs}ms\n\n---\n\n`;

    // Critical Issues
    const criticals = Object.values(report.dimensions)
        .flatMap(d => d.findings)
        .filter(f => f.severity === 'critical');
    if (criticals.length > 0) {
        md += `## Critical Issues\n\n`;
        for (const f of criticals) {
            md += `- **[${f.code}]** ${f.message}\n  - Accion: ${f.action}\n\n`;
        }
    }

    // Warnings
    const warns = Object.values(report.dimensions)
        .flatMap(d => d.findings)
        .filter(f => f.severity === 'warning');
    if (warns.length > 0) {
        md += `## Warnings\n\n`;
        for (const f of warns) {
            md += `- **[${f.code}]** ${f.message}\n  - Recomendacion: ${f.action}\n\n`;
        }
    }

    // Suggestions
    const suggs = Object.values(report.dimensions)
        .flatMap(d => d.findings)
        .filter(f => f.severity === 'suggestion');
    if (suggs.length > 0) {
        md += `## Suggestions\n\n`;
        for (const f of suggs) {
            md += `- **[${f.code}]** ${f.message}\n`;
        }
        md += '\n';
    }

    // Score por dimension
    md += `---\n\n## Score por dimension\n\n`;
    md += `| Dimension | Score | Grade | Findings |\n|-----------|-------|-------|----------|\n`;
    for (const [dim, data] of Object.entries(report.dimensions)) {
        md += `| ${dim} | ${data.score}/100 | ${data.grade} | ${data.findings.length} |\n`;
    }

    // Top acciones
    if (report.summary.topActions.length > 0) {
        md += `\n---\n\n## Top acciones recomendadas\n\n`;
        for (let i = 0; i < report.summary.topActions.length; i++) {
            md += `${i + 1}. ${report.summary.topActions[i]}\n`;
        }
    }

    return md;
}

function formatReportConsole(report) {
    console.log(`\n=== PM AGENT CONTEXT AUDIT ===`);
    console.log(`Score: ${report.score}/100 (${report.grade})`);
    console.log(`Issues: ${report.summary.critical} critical | ${report.summary.warnings} warnings | ${report.summary.suggestions} suggestions`);
    console.log(`Duracion: ${report.durationMs}ms\n`);

    for (const [dim, data] of Object.entries(report.dimensions)) {
        console.log(`  ${dim}: ${data.score}/100 (${data.grade}) — ${data.findings.length} findings`);
        for (const f of data.findings) {
            const icon = f.severity === 'critical' ? 'X' : f.severity === 'warning' ? '!' : '~';
            console.log(`    [${icon}] ${f.code}: ${f.message}`);
        }
    }

    if (report.summary.topActions.length > 0) {
        console.log(`\nTop acciones:`);
        for (let i = 0; i < report.summary.topActions.length; i++) {
            console.log(`  ${i + 1}. ${report.summary.topActions[i]}`);
        }
    }
    console.log('');
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const [,, cmd] = process.argv;
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('context-auditor.js');

if (cmd && isDirectRun) {
    const validDimensions = ['completeness', 'consistency', 'freshness', 'usage', 'crossProject', 'alignment'];

    let dimensions;
    if (cmd === 'full') {
        dimensions = undefined; // all
    } else if (validDimensions.includes(cmd)) {
        dimensions = [cmd];
    } else {
        console.error(`Comando desconocido: "${cmd}"`);
        console.error(`Uso: node tools/pm-agent/context-auditor.js [full|${validDimensions.join('|')}]`);
        process.exit(1);
    }

    try {
        const report = await auditPMContext(pool, { dimensions });

        // Console output
        formatReportConsole(report);

        // JSON output to stdout (parseable)
        console.log('\n--- JSON ---');
        console.log(JSON.stringify(report, null, 2));

        // Track skill invocation
        await trackSkill('pm-agent', 'pm-context-audit', 'ejecucion', 'completed', report.durationMs, cmd, 'user')
            .catch(() => {});

    } catch (err) {
        console.error('[ContextAuditor] Error:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

export { formatReportMarkdown, formatReportConsole };
