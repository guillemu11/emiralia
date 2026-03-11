import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { trackSkill } from './workspace-skills/skill-tracker.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

trackSkill('pm-agent', 'generate-business-plan-pdf', 'ops', 'completed').catch(() => {});

// Read the business plan markdown
const md = readFileSync(resolve(ROOT, '.claude', 'BUSINESS_PLAN.md'), 'utf-8');

// Parse markdown sections
function parseSections(markdown) {
  const sections = [];
  const lines = markdown.split('\n');
  let current = null;

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { title: line.replace('## ', '').trim(), content: [] };
    } else if (current) {
      current.content.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

// Convert markdown table to HTML
function mdTableToHtml(lines) {
  const tableLines = lines.filter(l => l.trim().startsWith('|'));
  if (tableLines.length < 2) return '';

  const parseRow = row =>
    row.split('|').slice(1, -1).map(c => c.trim());

  const headers = parseRow(tableLines[0]);
  const dataRows = tableLines.slice(2); // skip separator

  let html = '<table><thead><tr>';
  for (const h of headers) {
    html += `<th>${formatInline(h)}</th>`;
  }
  html += '</tr></thead><tbody>';
  for (const row of dataRows) {
    const cells = parseRow(row);
    html += '<tr>';
    for (const cell of cells) {
      html += `<td>${formatInline(cell)}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

// Format inline markdown (bold, code, links)
function formatInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    // Status badges
    .replace(/EN CURSO/g, '<span class="badge badge-active">EN CURSO</span>')
    .replace(/PENDIENTE/g, '<span class="badge badge-pending">PENDIENTE</span>')
    .replace(/TBD/g, '<span class="badge badge-tbd">TBD</span>')
    .replace(/Activo/g, '<span class="badge badge-active">Activo</span>')
    .replace(/Definido/g, '<span class="badge badge-defined">Definido</span>')
    .replace(/Pendiente/g, '<span class="badge badge-pending">Pendiente</span>');
}

// Convert a section's content to HTML
function sectionToHtml(content) {
  const lines = content;
  let html = '';
  let inList = false;
  let inBlockquote = false;
  let tableBuffer = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and separators
    if (line === '---' || line === '') {
      if (inTable && tableBuffer.length > 0) {
        html += mdTableToHtml(tableBuffer);
        tableBuffer = [];
        inTable = false;
      }
      if (inList) { html += '</ul>'; inList = false; }
      if (inBlockquote) { html += '</blockquote>'; inBlockquote = false; }
      continue;
    }

    // Tables
    if (line.startsWith('|')) {
      if (inList) { html += '</ul>'; inList = false; }
      inTable = true;
      tableBuffer.push(line);
      continue;
    } else if (inTable && tableBuffer.length > 0) {
      html += mdTableToHtml(tableBuffer);
      tableBuffer = [];
      inTable = false;
    }

    // H3 subheaders
    if (line.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h3>${formatInline(line.replace('### ', ''))}</h3>`;
      continue;
    }

    // Blockquotes
    if (line.startsWith('>')) {
      if (!inBlockquote) { html += '<blockquote>'; inBlockquote = true; }
      html += `<p>${formatInline(line.replace(/^>\s*/, ''))}</p>`;
      continue;
    } else if (inBlockquote) {
      html += '</blockquote>';
      inBlockquote = false;
    }

    // List items
    if (line.startsWith('- ') || line.match(/^\d+\.\s/)) {
      if (!inList) { html += '<ul>'; inList = true; }
      const text = line.replace(/^[-\d.]+\s/, '');
      html += `<li>${formatInline(text)}</li>`;
      continue;
    } else if (inList) {
      html += '</ul>';
      inList = false;
    }

    // Regular paragraph
    if (line.length > 0) {
      html += `<p>${formatInline(line)}</p>`;
    }
  }

  if (inTable && tableBuffer.length > 0) html += mdTableToHtml(tableBuffer);
  if (inList) html += '</ul>';
  if (inBlockquote) html += '</blockquote>';

  return html;
}

const sections = parseSections(md);
const today = new Date().toLocaleDateString('es-ES', {
  year: 'numeric', month: 'long', day: 'numeric'
});

const sectionsHtml = sections.map((s, i) => `
  <section class="content-section ${i === 0 ? 'first' : ''}">
    <h2>${s.title}</h2>
    ${sectionToHtml(s.content)}
  </section>
`).join('\n');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #0F172A;
    font-size: 11px;
    line-height: 1.6;
    background: #fff;
  }

  /* ── Cover Page ── */
  .cover {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
    color: #fff;
    page-break-after: always;
    position: relative;
    overflow: hidden;
  }

  .cover::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -30%;
    width: 800px;
    height: 800px;
    background: radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, transparent 70%);
    border-radius: 50%;
  }

  .cover::after {
    content: '';
    position: absolute;
    bottom: -40%;
    left: -20%;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
    border-radius: 50%;
  }

  .cover-content {
    position: relative;
    z-index: 1;
  }

  .cover-label {
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #94A3B8;
    margin-bottom: 24px;
  }

  .cover-title {
    font-size: 56px;
    font-weight: 700;
    letter-spacing: -1px;
    margin-bottom: 8px;
    background: linear-gradient(135deg, #fff 0%, #CBD5E1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .cover-subtitle {
    font-size: 18px;
    font-weight: 400;
    color: #94A3B8;
    margin-bottom: 48px;
    max-width: 500px;
  }

  .cover-tagline {
    font-size: 14px;
    font-weight: 500;
    color: #3B82F6;
    padding: 10px 24px;
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 100px;
    display: inline-block;
    margin-bottom: 64px;
  }

  .cover-meta {
    font-size: 11px;
    color: #64748B;
  }

  .cover-divider {
    width: 48px;
    height: 2px;
    background: #2563EB;
    margin: 32px auto;
  }

  /* ── Content ── */
  .content-section {
    padding: 32px 56px;
    page-break-inside: avoid;
  }

  .content-section.first {
    padding-top: 48px;
  }

  h2 {
    font-size: 20px;
    font-weight: 700;
    color: #0F172A;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid #2563EB;
    display: inline-block;
  }

  h3 {
    font-size: 14px;
    font-weight: 600;
    color: #1E293B;
    margin: 20px 0 10px 0;
  }

  p {
    margin-bottom: 8px;
    color: #334155;
    font-size: 11px;
    line-height: 1.7;
  }

  strong {
    font-weight: 600;
    color: #0F172A;
  }

  code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    background: #F1F5F9;
    padding: 1px 5px;
    border-radius: 4px;
    color: #2563EB;
  }

  /* ── Tables ── */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 20px;
    font-size: 10.5px;
  }

  thead th {
    background: #0F172A;
    color: #fff;
    font-weight: 600;
    text-align: left;
    padding: 10px 14px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  thead th:first-child { border-radius: 8px 0 0 0; }
  thead th:last-child { border-radius: 0 8px 0 0; }

  tbody td {
    padding: 10px 14px;
    border-bottom: 1px solid #F1F5F9;
    color: #334155;
    vertical-align: top;
  }

  tbody tr:nth-child(even) td {
    background: #F8FAFC;
  }

  tbody tr:last-child td {
    border-bottom: 2px solid #E2E8F0;
  }

  tbody tr:last-child td:first-child { border-radius: 0 0 0 8px; }
  tbody tr:last-child td:last-child { border-radius: 0 0 8px 0; }

  /* ── Lists ── */
  ul {
    margin: 8px 0 16px 0;
    padding-left: 0;
    list-style: none;
  }

  li {
    padding: 5px 0 5px 20px;
    position: relative;
    color: #334155;
    font-size: 11px;
    line-height: 1.6;
  }

  li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 12px;
    width: 6px;
    height: 6px;
    background: #2563EB;
    border-radius: 50%;
  }

  /* ── Badges ── */
  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 100px;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  .badge-active {
    background: #DCFCE7;
    color: #16A34A;
  }

  .badge-pending {
    background: #FEF3C7;
    color: #D97706;
  }

  .badge-tbd {
    background: #F1F5F9;
    color: #64748B;
  }

  .badge-defined {
    background: #DBEAFE;
    color: #2563EB;
  }

  /* ── Blockquotes ── */
  blockquote {
    margin: 16px 0;
    padding: 14px 20px;
    background: #F8FAFC;
    border-left: 3px solid #2563EB;
    border-radius: 0 8px 8px 0;
  }

  blockquote p {
    color: #475569;
    font-size: 10.5px;
    margin-bottom: 4px;
  }

  /* ── Footer ── */
  .footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px 56px;
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #94A3B8;
    border-top: 1px solid #F1F5F9;
  }

  @media print {
    .cover { height: 100vh; }
    .content-section { page-break-inside: avoid; }
  }
</style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover">
    <div class="cover-content">
      <div class="cover-label">Business Plan</div>
      <div class="cover-title">Emiralia</div>
      <div class="cover-subtitle">
        El mayor portal de inversion inmobiliaria sobre plano del mundo
      </div>
      <div class="cover-tagline">AI-Native PropTech Platform</div>
      <div class="cover-divider"></div>
      <div class="cover-meta">
        Documento confidencial &middot; ${today} &middot; v1.0
      </div>
    </div>
  </div>

  <!-- Content -->
  ${sectionsHtml}

</body>
</html>`;

// Generate PDF
const outputPath = resolve(ROOT, 'emiralia-business-plan.pdf');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle' });
await page.pdf({
  path: outputPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '0', bottom: '0', left: '0', right: '0' },
  displayHeaderFooter: false,
});
await browser.close();

console.log(`PDF generado: ${outputPath}`);
