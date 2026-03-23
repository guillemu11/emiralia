#!/usr/bin/env node
/**
 * sync_project_to_db.js
 *
 * Triggered by PostToolUse hook when a .claude/projects/*.md is written.
 * Parses the full MD content and syncs to DB: project + phases + tasks.
 *
 * Usage: node tools/db/sync_project_to_db.js <file_path>
 */

import { readFileSync, writeFileSync } from 'fs';
import { default as pool } from './pool.js';

const filePath = process.argv[2];
if (!filePath) process.exit(0);

if (!filePath.match(/\.claude[/\\]projects[/\\].+\.md$/)) process.exit(0);

let content;
try {
  content = readFileSync(filePath, 'utf-8');
} catch {
  process.exit(0);
}

// ─── Frontmatter parsing ──────────────────────────────────────────────────────
const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
if (!fmMatch) process.exit(0);

const fm = fmMatch[1];
const getField = (key) => {
  const m = fm.match(new RegExp(`^${key}:\\s*(.+)`, 'm'));
  return m ? m[1].trim() : null;
};

const fmStatus = getField('status') || 'Planning';
const fmAgents = getField('agents') || '';

// ─── Title ────────────────────────────────────────────────────────────────────
const titleMatch = content.match(/^---[\s\S]*?---\s*\n#\s+(.+)/m);
if (!titleMatch) process.exit(0);
const projectName = titleMatch[1].trim();

// ─── Status map ───────────────────────────────────────────────────────────────
const STATUS_MAP = { 'Planning': 'Planning', 'In Progress': 'In Progress', 'Completed': 'Completed', 'Paused': 'Paused' };
const dbStatus = STATUS_MAP[fmStatus] || 'Planning';

// ─── Department from agents ───────────────────────────────────────────────────
function detectDepartment(agentsStr) {
  const a = agentsStr.toLowerCase();
  if (a.includes('dev')) return 'Tech';
  if (a.includes('data')) return 'Tech';
  if (a.includes('marketing') || a.includes('social') || a.includes('paid-media')) return 'Marketing';
  if (a.includes('content') || a.includes('seo') || a.includes('translation')) return 'Content';
  if (a.includes('design') || a.includes('frontend')) return 'Design';
  if (a.includes('legal')) return 'Legal';
  return 'Product';
}
const department = detectDepartment(fmAgents);

// ─── Section extractor ────────────────────────────────────────────────────────
// Returns text of a ## Section up to the next ## (splits cleanly on headings)
function extractSection(md, heading) {
  const sections = md.split(/\n(?=##\s)/);
  const re = new RegExp(`^##\\s+(?:${heading})`, 'i');
  const found = sections.find(s => re.test(s));
  if (!found) return '';
  return found.replace(/^##[^\n]+\n/, '').trim();
}

// ─── Parse content ────────────────────────────────────────────────────────────
const problem   = extractSection(content, 'Problema');
const solution  = extractSection(content, 'Solución|Solucion|Solution');
const postMvp   = extractSection(content, 'Post-MVP.*|Hoja de Ruta.*|Post MVP.*');

// Metrics: bullet list items under ## Métricas de éxito
const metricsSection = extractSection(content, 'Métricas.*|Metricas.*|Metrics.*|Success.*');
const successMetrics = metricsSection
  .split('\n')
  .filter(l => l.trim().match(/^-\s+\[[ x]\]/))
  .map(l => l.replace(/^-\s+\[[ x]\]\s*/, '').trim())
  .filter(Boolean);

// Future improvements: bullet list from Post-MVP section
const futureImprovements = postMvp
  .split('\n')
  .filter(l => l.trim().startsWith('-'))
  .map(l => l.replace(/^-\s+/, '').trim())
  .filter(Boolean);

// ─── Parse phases and tasks ───────────────────────────────────────────────────
// Phases are ### Fase N: Name or ### Fase N — Name
const fasesSection = extractSection(content, 'Fases.*|Phases.*');

function parsePhasesAndTasks(section) {
  const phases = [];
  // Split by ### headings
  const phaseBlocks = section.split(/\n(?=###\s)/);
  let phaseNum = 0;
  for (const block of phaseBlocks) {
    const headingMatch = block.match(/^###\s+(.+)/);
    if (!headingMatch) continue;
    phaseNum++;
    const phaseName = headingMatch[1]
      .replace(/^Fase\s+\d+[\s:—-]+/i, '')
      .replace(/^Phase\s+\d+[\s:—-]+/i, '')
      .trim();

    const tasks = [];
    const lines = block.split('\n').slice(1); // skip heading
    for (const line of lines) {
      // Match checkbox items at any indent level
      const taskMatch = line.match(/^\s*-\s+\[[ x]\]\s+(.+)/);
      if (taskMatch) {
        const description = taskMatch[1].trim();
        const isDone = line.includes('[x]') || line.includes('[X]');
        tasks.push({ description, status: isDone ? 'Done' : 'Todo' });
      }
    }

    if (phaseName) {
      phases.push({ phaseNumber: phaseNum, name: phaseName, tasks });
    }
  }
  return phases;
}

const phases = parsePhasesAndTasks(fasesSection);

// ─── DB sync ──────────────────────────────────────────────────────────────────
async function run() {
  const client = await pool.connect();
  try {
    // Upsert project
    const existing = await client.query(
      'SELECT id FROM projects WHERE name = $1 LIMIT 1',
      [projectName]
    );

    let dbId;
    if (existing.rows.length > 0) {
      dbId = existing.rows[0].id;
      await client.query(
        `UPDATE projects
         SET status=$1, problem=$2, solution=$3, success_metrics=$4,
             future_improvements=$5, department=$6, updated_at=NOW()
         WHERE id=$7`,
        [
          dbStatus,
          problem,
          solution,
          JSON.stringify(successMetrics),
          JSON.stringify(futureImprovements),
          department,
          dbId,
        ]
      );
      console.log(`[sync-project] Updated "${projectName}" (id=${dbId})`);
    } else {
      const res = await client.query(
        `INSERT INTO projects
           (name, problem, solution, success_metrics, future_improvements,
            blocks, department, sub_area, pain_points, requirements, risks,
            estimated_budget, estimated_timeline, status)
         VALUES ($1,$2,$3,$4,$5,'[]',$6,$7,'[]','[]','[]',0,'TBD',$8)
         RETURNING id`,
        [
          projectName,
          problem,
          solution,
          JSON.stringify(successMetrics),
          JSON.stringify(futureImprovements),
          department,
          department,
          dbStatus,
        ]
      );
      dbId = res.rows[0].id;
      console.log(`[sync-project] Inserted "${projectName}" → id=${dbId}`);
    }

    // Sync phases + tasks (delete existing, re-insert)
    if (phases.length > 0) {
      // CASCADE deletes tasks too
      await client.query('DELETE FROM phases WHERE project_id = $1', [dbId]);

      for (const phase of phases) {
        const phaseRes = await client.query(
          `INSERT INTO phases (project_id, phase_number, name, objective)
           VALUES ($1, $2, $3, '') RETURNING id`,
          [dbId, phase.phaseNumber, phase.name]
        );
        const phaseId = phaseRes.rows[0].id;

        for (const task of phase.tasks) {
          await client.query(
            `INSERT INTO tasks (phase_id, description, status, priority, effort, agent)
             VALUES ($1, $2, $3, 'Medium', 'M', '')`,
            [phaseId, task.description, task.status]
          );
        }
      }
      console.log(`[sync-project] Synced ${phases.length} phases with tasks`);
    }

    // Sync frontmatter id to real DB id
    const fmId = getField('id');
    if (fmId !== String(dbId)) {
      const updatedContent = content.replace(
        /^(---\n[\s\S]*?)^id:\s*.+/m,
        `$1id: ${dbId}`
      );
      writeFileSync(filePath, updatedContent, 'utf-8');
      console.log(`[sync-project] Updated frontmatter id: ${fmId} → ${dbId}`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => {
  console.error('[sync-project] Error:', e.message);
  process.exit(0); // non-blocking — never fail the hook
});
