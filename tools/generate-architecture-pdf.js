import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { trackSkill } from './workspace-skills/skill-tracker.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

trackSkill('dev-agent', 'generate-architecture-pdf', 'ops', 'completed').catch(() => {});

const today = new Date().toLocaleDateString('es-ES', {
  year: 'numeric', month: 'long', day: 'numeric'
});

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

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

  .cover-content { position: relative; z-index: 1; }

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
    max-width: 560px;
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

  /* ── TOC ── */
  .toc {
    padding: 56px;
    page-break-after: always;
  }

  .toc h2 {
    font-size: 28px;
    font-weight: 700;
    color: #0F172A;
    margin-bottom: 32px;
    border: none;
    display: block;
  }

  .toc-item {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 12px 0;
    border-bottom: 1px solid #F1F5F9;
    font-size: 13px;
    color: #334155;
  }

  .toc-item .num {
    font-weight: 600;
    color: #2563EB;
    min-width: 28px;
  }

  .toc-item .title {
    flex: 1;
    font-weight: 500;
  }

  .toc-item .dots {
    flex: 1;
    border-bottom: 1px dotted #CBD5E1;
    margin: 0 12px;
    height: 1px;
  }

  /* ── Sections ── */
  .section {
    padding: 40px 56px 24px;
    page-break-inside: avoid;
  }

  .section-break {
    page-break-before: always;
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

  h4 {
    font-size: 12px;
    font-weight: 600;
    color: #334155;
    margin: 14px 0 6px 0;
  }

  p {
    margin-bottom: 8px;
    color: #334155;
    font-size: 11px;
    line-height: 1.7;
  }

  strong { font-weight: 600; color: #0F172A; }

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

  tbody tr:nth-child(even) td { background: #F8FAFC; }
  tbody tr:last-child td { border-bottom: 2px solid #E2E8F0; }
  tbody tr:last-child td:first-child { border-radius: 0 0 0 8px; }
  tbody tr:last-child td:last-child { border-radius: 0 0 8px 0; }

  /* ── Lists ── */
  ul {
    margin: 8px 0 16px 0;
    padding-left: 0;
    list-style: none;
  }

  li {
    padding: 4px 0 4px 20px;
    position: relative;
    color: #334155;
    font-size: 11px;
    line-height: 1.6;
  }

  li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 11px;
    width: 6px;
    height: 6px;
    background: #2563EB;
    border-radius: 50%;
  }

  /* ── Diagram boxes ── */
  .diagram {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 20px 24px;
    margin: 16px 0 24px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5px;
    line-height: 1.5;
    white-space: pre;
    overflow-x: hidden;
    color: #334155;
  }

  /* ── Info Cards ── */
  .card {
    background: #fff;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 20px 24px;
    margin: 12px 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .card-title {
    font-size: 13px;
    font-weight: 600;
    color: #0F172A;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .card-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }

  .card-blue { background: #DBEAFE; }
  .card-green { background: #DCFCE7; }
  .card-orange { background: #FEF3C7; }
  .card-purple { background: #F3E8FF; }
  .card-slate { background: #F1F5F9; }

  .card p { margin-bottom: 4px; }

  /* ── Decision Grid ── */
  .decision-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 16px 0;
  }

  .decision-card {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 16px 20px;
    page-break-inside: avoid;
  }

  .decision-card h4 {
    font-size: 11px;
    font-weight: 600;
    color: #2563EB;
    margin: 0 0 6px 0;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .decision-card .why {
    font-size: 10.5px;
    color: #334155;
    line-height: 1.6;
  }

  /* ── Improvement Cards ── */
  .improvement-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 16px 0;
  }

  .improvement-card {
    background: #fff;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 16px 20px;
    page-break-inside: avoid;
  }

  .improvement-card .priority {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 100px;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .priority-high { background: #FEE2E2; color: #DC2626; }
  .priority-medium { background: #FEF3C7; color: #D97706; }
  .priority-low { background: #DBEAFE; color: #2563EB; }

  .improvement-card h4 {
    font-size: 11px;
    font-weight: 600;
    color: #0F172A;
    margin: 0 0 4px 0;
  }

  .improvement-card .desc {
    font-size: 10.5px;
    color: #64748B;
    line-height: 1.5;
  }

  /* ── Badges ── */
  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 100px;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.3px;
  }

  .badge-blue { background: #DBEAFE; color: #2563EB; }
  .badge-green { background: #DCFCE7; color: #16A34A; }
  .badge-orange { background: #FEF3C7; color: #D97706; }

  /* ── Blockquote ── */
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

  /* ── Flow steps ── */
  .flow-steps {
    margin: 12px 0;
    padding-left: 24px;
    border-left: 2px solid #E2E8F0;
  }

  .flow-step {
    position: relative;
    padding: 8px 0 8px 20px;
    font-size: 10.5px;
    color: #334155;
    line-height: 1.6;
  }

  .flow-step::before {
    content: '';
    position: absolute;
    left: -7px;
    top: 14px;
    width: 12px;
    height: 12px;
    background: #2563EB;
    border-radius: 50%;
    border: 2px solid #fff;
  }

  .flow-step strong { color: #0F172A; }
  .flow-step code {
    font-size: 9px;
    background: #EFF6FF;
    color: #2563EB;
  }

  /* ── Footer ── */
  .page-footer {
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
    .section { page-break-inside: avoid; }
    .section-break { page-break-before: always; }
  }
</style>
</head>
<body>

  <!-- ════════ COVER ════════ -->
  <div class="cover">
    <div class="cover-content">
      <div class="cover-label">Documento de Arquitectura</div>
      <div class="cover-title">Emiralia</div>
      <div class="cover-subtitle">
        Mapa completo de la arquitectura, interconexiones, decisiones de diseno y roadmap de escalabilidad
      </div>
      <div class="cover-tagline">AI-Native PropTech Platform</div>
      <div class="cover-divider"></div>
      <div class="cover-meta">
        Documento confidencial &middot; ${today} &middot; v1.0
      </div>
    </div>
  </div>

  <!-- ════════ TABLE OF CONTENTS ════════ -->
  <div class="toc">
    <h2>Indice</h2>
    <div class="toc-item"><span class="num">01</span><span class="title">Diagrama General de Infraestructura</span><span class="dots"></span></div>
    <div class="toc-item"><span class="num">02</span><span class="title">Aplicaciones (Website, API, Dashboard)</span><span class="dots"></span></div>
    <div class="toc-item"><span class="num">03</span><span class="title">Tools y Scripts</span><span class="dots"></span></div>
    <div class="toc-item"><span class="num">04</span><span class="title">Base de Datos (PostgreSQL)</span><span class="dots"></span></div>
    <div class="toc-item"><span class="num">05</span><span class="title">Infraestructura Docker</span><span class="dots"></span></div>
    <div class="toc-item"><span class="num">06</span><span class="title">Framework WAT (.claude/)</span><span class="dots"></span></div>
    <div class="toc-item"><span class="num">07</span><span class="title">Interconexiones entre Documentos</span><span class="dots"></span></div>
    <div class="toc-item"><span class="num">08</span><span class="title">Cadenas de Skills y Workflows</span><span class="dots"></span></div>
    <div class="toc-item"><span class="num">09</span><span class="title">Flujos de Datos End-to-End</span><span class="dots"></span></div>
    <div class="toc-item"><span class="num">10</span><span class="title">Decisiones de Arquitectura</span><span class="dots"></span></div>
    <div class="toc-item"><span class="num">11</span><span class="title">Mejoras Futuras para Escalar</span><span class="dots"></span></div>
    <div class="toc-item"><span class="num">12</span><span class="title">Patrones Arquitectonicos</span><span class="dots"></span></div>
  </div>

  <!-- ════════ 01. DIAGRAMA GENERAL ════════ -->
  <div class="section section-break">
    <h2>01. Diagrama General de Infraestructura</h2>
    <p>Emiralia esta compuesta por <strong>3 aplicaciones</strong>, <strong>5 servicios Docker</strong>, y un ecosistema de <strong>30+ tools</strong> coordinados por el framework WAT.</p>
    <div class="diagram">                        ┌──────────────────┐
                        │   Telegram Bot   │
                        │  tools/telegram/ │
                        └────────┬─────────┘
                                 │ Ideas / Chat
                                 ▼
┌──────────────┐   REST    ┌──────────────┐   SQL    ┌──────────────────┐
│   Website    │◄─────────►│   API        │◄────────►│   PostgreSQL 16  │
│  (Publico)   │  :3001    │  Express     │  :5433   │                  │
│  Vite + TW   │           │  apps/api/   │          │  17 tablas       │
│  apps/website│           └──────────────┘          └──────┬───────────┘
└──────────────┘                                            │
                                                            │
┌──────────────┐   SQL+API ┌──────────────┐                │
│  Dashboard   │◄─────────►│  Dashboard   │◄───────────────┘
│  React 19    │   :5173   │  Server      │
│  Vite + RR7  │           │  Express 5   │  :3001
└──────────────┘           └──────┬───────┘
                                  │ imports
                                  ▼
                     ┌──────────────────────┐
                     │   tools/pm-agent/    │
                     │   tools/workspace-*  │
                     │   Anthropic SDK      │
                     └──────────────────────┘

┌──────────────┐           ┌──────────────┐
│    Redis     │           │   Adminer    │
│  Cache :6379 │           │  DB UI :8080 │
└──────────────┘           └──────────────┘</div>
  </div>

  <!-- ════════ 02. APPS ════════ -->
  <div class="section section-break">
    <h2>02. Aplicaciones</h2>

    <div class="card">
      <div class="card-title"><div class="card-icon card-blue">W</div> apps/website/ — Portal Publico</div>
      <table>
        <thead><tr><th>Aspecto</th><th>Detalle</th></tr></thead>
        <tbody>
          <tr><td><strong>Stack</strong></td><td>Vanilla JS + Tailwind CSS v3 + Vite v5 + PostCSS + Playwright</td></tr>
          <tr><td><strong>Proposito</strong></td><td>Buscador de propiedades UAE para hispanohablantes</td></tr>
          <tr><td><strong>Consume</strong></td><td>API REST de <code>apps/api/</code></td></tr>
        </tbody>
      </table>
      <h4>Paginas (HTML + JS pareados)</h4>
      <table>
        <thead><tr><th>Pagina</th><th>HTML</th><th>JS</th></tr></thead>
        <tbody>
          <tr><td>Homepage / Landing</td><td><code>index.html</code></td><td><code>src/main.js</code></td></tr>
          <tr><td>Listado propiedades v1</td><td><code>propiedades.html</code></td><td><code>src/propiedades.js</code></td></tr>
          <tr><td>Listado propiedades v2</td><td><code>propiedades-v2.html</code></td><td><code>src/propiedades-v2.js</code></td></tr>
          <tr><td>Detalle propiedad</td><td><code>propiedad.html</code></td><td><code>src/propiedad.js</code></td></tr>
          <tr><td>Listado developers</td><td><code>desarrolladores.html</code></td><td><code>src/desarrolladores.js</code></td></tr>
          <tr><td>Detalle developer</td><td><code>desarrollador.html</code></td><td><code>src/desarrollador.js</code></td></tr>
          <tr><td>Blog</td><td><code>blog.html</code></td><td><code>src/blog.js</code></td></tr>
          <tr><td>Articulo</td><td><code>articulo.html</code></td><td><code>src/articulo.js</code></td></tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="card-title"><div class="card-icon card-green">A</div> apps/api/ — Backend REST</div>
      <table>
        <thead><tr><th>Aspecto</th><th>Detalle</th></tr></thead>
        <tbody>
          <tr><td><strong>Stack</strong></td><td>Node.js (ESM) + Express 4 + PostgreSQL + Redis</td></tr>
          <tr><td><strong>Puerto</strong></td><td>3001</td></tr>
          <tr><td><strong>Rutas</strong></td><td><code>/inbox</code> (PM Agent chat), <code>/properties</code> (busqueda/filtros)</td></tr>
          <tr><td><strong>Entry</strong></td><td><code>src/index.js</code></td></tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="card-title"><div class="card-icon card-purple">D</div> apps/dashboard/ — Centro de Operaciones</div>
      <table>
        <thead><tr><th>Aspecto</th><th>Detalle</th></tr></thead>
        <tbody>
          <tr><td><strong>Stack</strong></td><td>React 19 + React Router v7 + Recharts + Vite v7 (front) / Express 5 (back)</td></tr>
          <tr><td><strong>Puerto</strong></td><td>5173 (front) + 3001 (back)</td></tr>
          <tr><td><strong>Backend</strong></td><td><code>server.js</code> (87KB monolitico) — importa <code>tools/pm-agent/</code></td></tr>
          <tr><td><strong>i18n</strong></td><td>Custom <code>LanguageContext.jsx</code> + <code>translations.js</code></td></tr>
        </tbody>
      </table>
      <h4>Componentes React</h4>
      <p><code>BrainstormPanel</code>, <code>DailyAiSummary</code>, <code>DailyCoverageAlert</code>, <code>DailyEodModal</code>, <code>DailyTrends</code>, <code>DepartmentKanban</code>, <code>InboxPanel</code>, <code>Layout</code>, <code>PMAgentChat</code>, <code>PipelineBoard</code>, <code>WeeklyReport</code></p>
      <h4>Rutas del Dashboard</h4>
      <table>
        <thead><tr><th>Ruta</th><th>Vista</th></tr></thead>
        <tbody>
          <tr><td><code>/</code></td><td>Board de proyectos + PM Chat</td></tr>
          <tr><td><code>/workspace</code></td><td>Vista de todos los agentes</td></tr>
          <tr><td><code>/workspace/:deptId</code></td><td>Departamento</td></tr>
          <tr><td><code>/workspace/:deptId/weekly</code></td><td>Planning semanal</td></tr>
          <tr><td><code>/workspace/:deptId/daily</code></td><td>Standup diario</td></tr>
          <tr><td><code>/workflows</code></td><td>Hub de workflows WAT</td></tr>
          <tr><td><code>/skills</code></td><td>Analytics de skills</td></tr>
          <tr><td><code>/inbox</code></td><td>Gestion de ideas/propuestas</td></tr>
          <tr><td><code>/pm-reports</code></td><td>Archivo de reportes PM</td></tr>
          <tr><td><code>/workspace/audit</code></td><td>Log de auditoria</td></tr>
          <tr><td><code>/workspace/intelligence</code></td><td>Hub de investigacion</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ════════ 03. TOOLS ════════ -->
  <div class="section section-break">
    <h2>03. Tools y Scripts</h2>
    <p>Mas de <strong>30 scripts Node.js</strong> organizados en 7 modulos. Todos deben incluir <code>trackSkill()</code> al inicio.</p>

    <div class="diagram">tools/
├── Scrapers & Utilidades
│   ├── apify_propertyfinder.js       → PropertyFinder.ae via Apify
│   ├── apify_panicselling.js         → Price drops panicselling.xyz
│   ├── fetch_dataset.js              → Descarga datasets Apify
│   ├── check_db_count.js             → Diagnostico: filas por tabla
│   └── generate-business-plan-pdf.js → PDF del Business Plan
│
├── db/                               → Base de datos (15 archivos)
│   ├── pool.js                       → Conexion PostgreSQL compartida
│   ├── schema.sql + seed.sql         → Esquema + datos iniciales
│   ├── memory.js                     → Memoria agente (key-value)
│   ├── wat-memory.js                 → Memoria cross-agente
│   ├── save_project.js               → Guardar proyectos PM
│   ├── detect_duplicates.js          → Duplicados cross-broker
│   └── 4 migraciones SQL
│
├── pm-agent/                         → Cerebro del PM Agent
│   ├── core.js                       → Chat AI + generacion proyectos
│   ├── context-builder.js            → Contexto rico desde DB
│   ├── context-auditor.js            → Auditoria de completitud
│   └── inbox-cli.js                  → CLI inbox
│
├── research-agent/                   → Intelligence externa
│   ├── orchestrator.js               → Orquestador principal
│   └── 3 fetchers + filtro relevancia
│
├── telegram/                         → Bot Telegram (PM Agent movil)
├── translate/                        → Traduccion inmobiliaria EN→ES
└── workspace-skills/                 → Tracking y reportes
    ├── skill-tracker.js              → trackSkill() obligatorio
    ├── eod-generator.js              → Reportes end-of-day
    └── weekly-generator.js           → Resumenes semanales</div>
  </div>

  <!-- ════════ 04. DATABASE ════════ -->
  <div class="section section-break">
    <h2>04. Base de Datos</h2>
    <p><strong>PostgreSQL 16</strong> con 17 tablas, indices GiST para geolocalizacion y campos JSONB para datos heterogeneos.</p>

    <table>
      <thead><tr><th>Tabla</th><th>Proposito</th><th>Campos clave</th></tr></thead>
      <tbody>
        <tr><td><code>properties</code></td><td>Listings inmobiliarios de UAE</td><td>pf_id (PK), location, pricing, features (JSONB), images (JSONB), GiST(lat,lng)</td></tr>
        <tr><td><code>price_drops</code></td><td>Price drops de lujo</td><td>original_price, current_price, drop_percentage</td></tr>
        <tr><td><code>projects</code></td><td>Proyectos del PM Agent</td><td>name, problem, solution, status, success_metrics (JSONB)</td></tr>
        <tr><td><code>phases</code></td><td>Fases de proyecto</td><td>project_id (FK), name, order</td></tr>
        <tr><td><code>tasks</code></td><td>Tareas por fase</td><td>phase_id (FK), agent, effort (S/M/L), status, priority</td></tr>
        <tr><td><code>agents</code></td><td>Registro de agentes</td><td>id, name, role, department, skills (JSONB), tools (JSONB)</td></tr>
        <tr><td><code>agent_memory</code></td><td>Memoria key-value por agente</td><td>agent_id, key, value, scope (shared/private)</td></tr>
        <tr><td><code>inbox_items</code></td><td>Ideas y propuestas</td><td>status: chat → borrador → proyecto → discarded</td></tr>
        <tr><td><code>pm_reports</code></td><td>Reportes estrategicos</td><td>type, content, agent_id</td></tr>
        <tr><td><code>raw_events</code></td><td>Event stream granular</td><td>event_type (tool_call, message, error, commit)</td></tr>
        <tr><td><code>eod_reports</code></td><td>Reportes diarios</td><td>agent_id, date, content</td></tr>
        <tr><td><code>audit_log</code></td><td>Auditoria del sistema</td><td>action, entity, details</td></tr>
        <tr><td><code>weekly_sessions</code></td><td>Sesiones semanales</td><td>department, week, status</td></tr>
        <tr><td><code>weekly_brainstorms</code></td><td>Brainstorms por agente</td><td>session_id, agent_id, ideas</td></tr>
        <tr><td><code>workflow_runs</code></td><td>Ejecucion de workflows</td><td>workflow, status, duration, output</td></tr>
      </tbody>
    </table>
  </div>

  <!-- ════════ 05. DOCKER ════════ -->
  <div class="section section-break">
    <h2>05. Infraestructura Docker</h2>
    <p>5 servicios orquestados via <code>docker-compose.yml</code>:</p>
    <table>
      <thead><tr><th>Servicio</th><th>Imagen</th><th>Puerto</th><th>Descripcion</th></tr></thead>
      <tbody>
        <tr><td><strong>postgres</strong></td><td>postgres:16-alpine</td><td>5433</td><td>DB primaria. Auto-carga schema.sql + seed.sql</td></tr>
        <tr><td><strong>redis</strong></td><td>redis:7-alpine</td><td>6379</td><td>Capa de cache para API</td></tr>
        <tr><td><strong>api</strong></td><td>Dockerfile local</td><td>3001</td><td>Backend REST Express</td></tr>
        <tr><td><strong>dashboard</strong></td><td>Dockerfile local</td><td>5173</td><td>Frontend React + backend Express</td></tr>
        <tr><td><strong>adminer</strong></td><td>adminer:latest</td><td>8080</td><td>UI de administracion de DB</td></tr>
      </tbody>
    </table>

    <h3>Dependencias compartidas (package.json raiz)</h3>
    <table>
      <thead><tr><th>Dependencia</th><th>Version</th><th>Uso</th></tr></thead>
      <tbody>
        <tr><td><code>@anthropic-ai/sdk</code></td><td>^0.78.0</td><td>Claude API (PM Agent, Dashboard, traduccion)</td></tr>
        <tr><td><code>pg</code></td><td>^8.13.0</td><td>PostgreSQL client</td></tr>
        <tr><td><code>playwright</code></td><td>^1.58.2</td><td>Headless browser (screenshots, PDFs)</td></tr>
        <tr><td><code>telegraf</code></td><td>^4.16.3</td><td>Telegram bot framework</td></tr>
        <tr><td><code>axios</code></td><td>^1.7.0</td><td>HTTP client</td></tr>
        <tr><td><code>openai</code></td><td>^6.25.0</td><td>OpenAI SDK (opcion secundaria)</td></tr>
        <tr><td><code>dotenv</code></td><td>^16.4.0</td><td>Variables de entorno</td></tr>
      </tbody>
    </table>
  </div>

  <!-- ════════ 06. FRAMEWORK WAT ════════ -->
  <div class="section section-break">
    <h2>06. Framework WAT</h2>
    <p>El framework <strong>WAT (Workflows · Agents · Tools)</strong> organiza toda la inteligencia del sistema en capas declarativas.</p>

    <div class="diagram">.claude/
├── CLAUDE.md                 ← Registro maestro (cargado SIEMPRE)
├── BUSINESS_PLAN.md          ← Norte estrategico
│
├── agents/ (9 agentes en 6 departamentos)
│   ├── product/    → pm-agent
│   ├── data/       → data-agent
│   ├── dev/        → dev-agent
│   ├── design/     → frontend-agent
│   ├── content/    → content-agent, translation-agent
│   ├── marketing/  → marketing-agent, research-agent
│   └── ops/        → wat-auditor-agent
│
├── skills/ (39 skills en 8 dominios)
│   ├── ops/        → 7 skills
│   ├── content/    → 1 skill
│   ├── design/     → 2 skills
│   ├── data/       → 7 skills
│   ├── ejecucion/  → 8 skills
│   ├── gtm/        → 5 skills
│   ├── marketing/  → 4 skills
│   └── producto/   → 5 skills
│
├── workflows/  → 7 SOPs cross-agente
├── hooks/      → 3 lifecycle hooks
└── rules/      → 3 reglas auto-activadas</div>

    <h3>Agentes del Sistema</h3>
    <table>
      <thead><tr><th>Agente</th><th>Departamento</th><th>Skills</th><th>Rol</th></tr></thead>
      <tbody>
        <tr><td><strong>PM Agent</strong></td><td>product/</td><td>21</td><td>Coordina todos los agentes, sprints, backlog, proyectos</td></tr>
        <tr><td><strong>Data Agent</strong></td><td>data/</td><td>3</td><td>Extrae, limpia y normaliza datos de propiedades UAE</td></tr>
        <tr><td><strong>Frontend Agent</strong></td><td>design/</td><td>3</td><td>UI/UX, creatividades, implementacion visual</td></tr>
        <tr><td><strong>Marketing Agent</strong></td><td>marketing/</td><td>6</td><td>Campanas, copies, metricas, posicionamiento</td></tr>
        <tr><td><strong>Content Agent</strong></td><td>content/</td><td>1</td><td>Fichas de propiedades, blog, SEO en espanol</td></tr>
        <tr><td><strong>Translation Agent</strong></td><td>content/</td><td>1</td><td>Arabe/ingles → espanol con precision inmobiliaria</td></tr>
        <tr><td><strong>Dev Agent</strong></td><td>dev/</td><td>1</td><td>Features, bugs, PRs en el codebase</td></tr>
        <tr><td><strong>Research Agent</strong></td><td>ops/</td><td>1</td><td>Monitorea fuentes externas, genera intelligence</td></tr>
        <tr><td><strong>WAT Auditor</strong></td><td>ops/</td><td>1</td><td>Auditoria del sistema WAT: consistencia y gaps</td></tr>
      </tbody>
    </table>
  </div>

  <!-- ════════ 07. INTERCONEXIONES ════════ -->
  <div class="section section-break">
    <h2>07. Interconexiones entre Documentos</h2>
    <p>El sistema WAT tiene <strong>6 capas</strong> de documentos que se referencian mutuamente:</p>

    <div class="diagram">╔══════════════════════════════════════════════════════════════╗
║  CAPA 0: FUNDACION (cargados SIEMPRE)                       ║
║  CLAUDE.md → registra agentes, skills, memoria, convenciones ║
║  BUSINESS_PLAN.md → norte estrategico                        ║
╠══════════════════════════════════════════════════════════════╣
║  CAPA 1: REGLAS (auto-activadas por contexto)                ║
║  business-plan-alignment → lee BUSINESS_PLAN, flag decisions ║
║  brand-guidelines → constrains toda UI, leido por frontend   ║
║  auto-dev-server → restart automatico en cambios             ║
╠══════════════════════════════════════════════════════════════╣
║  CAPA 2: AGENTES (9 .md con skills y tools asignados)       ║
╠══════════════════════════════════════════════════════════════╣
║  CAPA 3: SKILLS (39 invocables con /comando)                 ║
╠══════════════════════════════════════════════════════════════╣
║  CAPA 4: WORKFLOWS (7 SOPs que encadenan skills)             ║
╠══════════════════════════════════════════════════════════════╣
║  CAPA 5: MEMORY BUS (agent_memory, shared/private)           ║
╠══════════════════════════════════════════════════════════════╣
║  CAPA 6: HOOKS (protect-files, memory-enforcement, reinject) ║
╚══════════════════════════════════════════════════════════════╝</div>

    <h3>Grafo de Dependencias entre Agentes</h3>
    <div class="diagram">                    ┌──────────────────┐
                    │   PM Agent       │  ← Coordina todo
                    │  21 skills       │
                    │  3 workflows     │
                    └───────┬──────────┘
            ┌───────────────┼───────────────────┐
            ▼               ▼                   ▼
   ┌────────────┐  ┌──────────────┐    ┌──────────────┐
   │ Data Agent │  │Marketing     │    │Content Agent │
   │ 3 skills   │  │Agent 6 skills│    │ 1 skill      │
   └─────┬──────┘  └───────┬──────┘    └──────┬───────┘
         │     ┌────────────┘                  │
         ▼     ▼                               ▼
   ┌──────────────┐                   ┌──────────────┐
   │Frontend Agent│ ◄─────────────────│Translation   │
   │ 3 skills     │  recibe copy      │Agent 1 skill │
   └──────────────┘                   └──────────────┘

   ┌──────────────┐     ┌──────────────┐
   │Research Agent│────►│WAT Auditor   │
   │ 1 skill      │feeds│ 1 skill      │
   └──────────────┘intel└──────────────┘</div>
  </div>

  <!-- ════════ 08. CADENAS DE SKILLS ════════ -->
  <div class="section section-break">
    <h2>08. Cadenas de Skills y Workflows</h2>
    <p>Los skills se <strong>sugieren mutuamente</strong>, creando cadenas naturales de ejecucion. Los workflows las formalizan con checkpoints de usuario.</p>

    <h3>Cadena de Estrategia de Producto</h3>
    <div class="diagram">/estrategia-producto ──► /analisis-competidores ──► /battlecard-competitivo
        │                         │
        └──► /tamanio-mercado ◄───┘
                  │
                  └──► /segmento-entrada</div>

    <h3>Cadena GTM (Go-to-Market)</h3>
    <div class="diagram">/segmento-entrada ──► /estrategia-gtm ──► /loops-crecimiento
(escribe beachhead     (lee beachhead          │
 en memoria)            de memoria)    /ideas-marketing</div>

    <h3>Cadena de Ejecucion</h3>
    <div class="diagram">/crear-prd ──► /priorizar-features ──► /planificar-sprint
    │
    ├──► /pre-mortem (riesgos)
    └──► /historias-usuario (detalle)

/pm-challenge ──► (crea proyecto) ──► /cerrar-proyecto</div>

    <h3>Cadena de Inteligencia</h3>
    <div class="diagram">/research-monitor ──► escribe latest_research_report
                              │
                        /wat-audit (lee report en Paso 2e)
                              │
                        /pm-context-audit (verifica alineacion)</div>

    <h3>Workflows (7 SOPs)</h3>
    <table>
      <thead><tr><th>Workflow</th><th>Agente lider</th><th>Skills encadenados</th><th>Frecuencia</th></tr></thead>
      <tbody>
        <tr><td><strong>sprint-planning</strong></td><td>PM Agent</td><td>/priorizar-features → /planificar-sprint</td><td>Cada lunes</td></tr>
        <tr><td><strong>gtm-planning</strong></td><td>PM + Marketing</td><td>/segmento-entrada → /analisis-competidores → /ideas-posicionamiento → /estrategia-gtm</td><td>Inicial + trimestral</td></tr>
        <tr><td><strong>marketing-planning</strong></td><td>Marketing Agent</td><td>/metricas-norte → /mapa-viaje-cliente → /ideas-marketing → /ideas-posicionamiento</td><td>Mensual</td></tr>
        <tr><td><strong>data-intelligence</strong></td><td>Data Agent</td><td>/consultas-sql → /analisis-cohortes</td><td>Semanal / mensual</td></tr>
        <tr><td><strong>scrape_propertyfinder</strong></td><td>Data Agent</td><td>/propertyfinder-scraper (via Apify)</td><td>Bajo demanda</td></tr>
        <tr><td><strong>screenshot_design_loop</strong></td><td>Frontend Agent</td><td>/ui-ux-pro-max → /screenshot-loop (iterativo)</td><td>Por tarea UI</td></tr>
        <tr><td><strong>pm-review</strong></td><td>PM Agent</td><td>/pm-challenge → save_project.js</td><td>Continuo</td></tr>
      </tbody>
    </table>
  </div>

  <!-- ════════ 09. FLUJOS ════════ -->
  <div class="section section-break">
    <h2>09. Flujos de Datos End-to-End</h2>

    <h3>Flujo: Nueva Idea → Proyecto en Produccion</h3>
    <div class="flow-steps">
      <div class="flow-step"><strong>Idea ingresa</strong> via Telegram Bot, Dashboard UI o agentes → <code>inbox_items</code> (status: chat)</div>
      <div class="flow-step"><strong>PM Agent procesa</strong> con <code>/pm-challenge</code> → lee <code>pm-agent.md</code> + <code>BUSINESS_PLAN.md</code> → activa regla <code>business-plan-alignment</code></div>
      <div class="flow-step"><strong>Borrador creado</strong> → <code>inbox_items</code> (status: borrador) → usuario revisa y aprueba</div>
      <div class="flow-step"><strong>Proyecto creado</strong> → <code>projects</code> + <code>phases</code> + <code>tasks</code> en PostgreSQL</div>
      <div class="flow-step"><strong>Sprint planificado</strong> → <code>/planificar-sprint</code> asigna tasks a agentes</div>
      <div class="flow-step"><strong>Agentes ejecutan</strong> → leen memoria, ejecutan tools, escriben en memoria, <code>trackSkill()</code></div>
      <div class="flow-step"><strong>EOD generado</strong> → <code>eod-generator.js</code> → <code>eod_reports</code> → Dashboard</div>
      <div class="flow-step"><strong>Proyecto cerrado</strong> → <code>/cerrar-proyecto</code> con summary y audit log</div>
    </div>

    <h3>Flujo: Scraping → Propiedad en la Web</h3>
    <div class="flow-steps">
      <div class="flow-step"><code>/propertyfinder-scraper</code> → verifica <code>last_scrape_at</code> en WAT Memory</div>
      <div class="flow-step"><code>apify_propertyfinder.js</code> → llama Apify API → recibe dataset</div>
      <div class="flow-step">Normaliza y guarda en <code>properties</code> (upsert por <code>pf_id</code>)</div>
      <div class="flow-step"><code>/detectar-duplicados</code> → marca <code>duplicate_of</code> (nunca borra)</div>
      <div class="flow-step"><code>apps/api/</code> sirve via REST <code>/properties</code> con filtros</div>
      <div class="flow-step"><code>apps/website/</code> consume y muestra al usuario hispanohablante</div>
    </div>

    <h3>Flujo: Auditoria Semanal del Sistema</h3>
    <div class="flow-steps">
      <div class="flow-step"><code>/research-monitor</code> → monitorea Anthropic docs, GitHub releases, Reddit</div>
      <div class="flow-step">Escribe <code>latest_research_report</code> en <code>agent_memory</code> (shared)</div>
      <div class="flow-step"><code>/wat-audit</code> → lee research report via <code>!backtick</code> injection → audita TODO .claude/</div>
      <div class="flow-step">Produce reporte con score (100 - critical*10 - warning*3 - suggestion*1)</div>
      <div class="flow-step"><code>/pm-context-audit</code> → lee <code>last_audit_score</code> → valida contra BUSINESS_PLAN</div>
    </div>

    <h3>Sistema de Memoria (Memory Bus)</h3>
    <div class="diagram">┌──────────────────────────────────────────────────────────────┐
│                 MEMORY BUS (agent_memory table)               │
│                                                                │
│  Escritura: memory.js set &lt;agent&gt; &lt;key&gt; &lt;value&gt; [shared]     │
│  Lectura propia: memory.js get &lt;agent&gt; &lt;key&gt;                  │
│  Lectura cross: wat-memory.js check &lt;agent&gt; &lt;key&gt;             │
│  Vista global: wat-memory.js status                           │
│                                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │PM Agent  │ │Data Agent│ │Marketing │ │Research  │        │
│  │last_sprint│ │last_scrape│ │north_star│ │latest_   │        │
│  │icp_count │ │total_props│ │beachhead │ │research_ │        │
│  │audit_score│ │last_dedup│ │channels  │ │report    │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│         Skills leen via !backtick injection al cargarse       │
└──────────────────────────────────────────────────────────────┘</div>
  </div>

  <!-- ════════ 10. DECISIONES ════════ -->
  <div class="section section-break">
    <h2>10. Decisiones de Arquitectura</h2>
    <p>Cada decision tecnologica tiene un <strong>por que</strong> alineado con la etapa actual del proyecto: MVP rapido, iteracion constante, y preparacion para escalar.</p>

    <div class="decision-grid">
      <div class="decision-card">
        <h4>Vanilla JS en Website (no React)</h4>
        <div class="why">Rendimiento maximo en carga inicial, mejor SEO sin SSR, y simplicidad para un MVP donde las paginas son mayormente estaticas con datos dinamicos. React se reserva para el Dashboard donde la interactividad justifica el overhead.</div>
      </div>
      <div class="decision-card">
        <h4>Express Monolitico en Dashboard</h4>
        <div class="why">Velocidad de desarrollo e iteracion rapida. Un solo archivo server.js (87KB) permite pivotar rapidamente sin overhead de microservicios. Se descompondra cuando el volumen de endpoints lo justifique.</div>
      </div>
      <div class="decision-card">
        <h4>PostgreSQL + JSONB</h4>
        <div class="why">Flexibilidad schema-on-read para datos inmobiliarios heterogeneos (cada broker estructura diferente). JSONB permite queries SQL sobre campos dinamicos sin migraciones constantes. GiST para busquedas geoespaciales.</div>
      </div>
      <div class="decision-card">
        <h4>Playwright (no Puppeteer)</h4>
        <div class="why">Ya en el stack para screenshots del design loop. API mas moderna y estable que Puppeteer. Un solo browser engine para PDFs, screenshots y testing. Evita duplicar dependencias.</div>
      </div>
      <div class="decision-card">
        <h4>Agentes como Archivos .md</h4>
        <div class="why">Configuracion declarativa, auditable con git, y versionable. Cada agente es un .md que define su rol, skills, tools y memoria. El WAT Auditor puede leerlos y detectar inconsistencias automaticamente.</div>
      </div>
      <div class="decision-card">
        <h4>Memory Bus en PostgreSQL</h4>
        <div class="why">Persistencia entre sesiones, queries SQL para correlacion de estado, y coordinacion cross-agente sin servicios adicionales. La tabla agent_memory con scope shared/private es simple pero suficiente para el estado actual.</div>
      </div>
      <div class="decision-card">
        <h4>Skills 2.0 con Frontmatter</h4>
        <div class="why">Control granular de costos (haiku/sonnet/opus por skill), aislamiento de contexto (context:fork), y restriccion de tools por skill. Permite optimizar el gasto en API sin sacrificar calidad donde importa.</div>
      </div>
      <div class="decision-card">
        <h4>Apify para Scraping</h4>
        <div class="why">Infraestructura managed que evita bloqueos de IP, gestiona proxies, y escala automaticamente. El costo por run es predecible. Evita mantener infraestructura propia de scraping que es costosa y fragil.</div>
      </div>
      <div class="decision-card">
        <h4>Telegram Bot como Interfaz</h4>
        <div class="why">Acceso movil al PM Agent con friccion cero. El usuario puede enviar ideas desde cualquier lugar sin abrir el Dashboard. Telegraf es ligero y el bot actua como puente directo al inbox pipeline.</div>
      </div>
      <div class="decision-card">
        <h4>Docker Compose (no Kubernetes)</h4>
        <div class="why">Complejidad adecuada para la etapa actual. 5 servicios no justifican un orquestador. Docker Compose permite levantar todo el stack con un comando. Kubernetes llegara cuando haya multi-region o auto-scaling real.</div>
      </div>
    </div>
  </div>

  <!-- ════════ 11. MEJORAS FUTURAS ════════ -->
  <div class="section section-break">
    <h2>11. Mejoras Futuras para Escalar</h2>
    <p>Roadmap tecnico de mejoras ordenadas por <strong>prioridad e impacto</strong> para cuando Emiralia crezca en usuarios, datos y mercados.</p>

    <div class="improvement-grid">
      <div class="improvement-card">
        <div class="priority priority-high">ALTA</div>
        <h4>CI/CD Pipeline</h4>
        <div class="desc">GitHub Actions para deploy automatico, tests, linting y validacion de schema. Elimina deploys manuales y reduce errores en produccion. Prerequisito para escalar el equipo.</div>
      </div>
      <div class="improvement-card">
        <div class="priority priority-high">ALTA</div>
        <h4>Autenticacion (Auth System)</h4>
        <div class="desc">Supabase Auth o Auth0 para usuarios finales (inversores) y developers (clientes B2B). Roles, permisos, y acceso a datos segregado por developer. Prerequisito para monetizacion.</div>
      </div>
      <div class="improvement-card">
        <div class="priority priority-high">ALTA</div>
        <h4>Search Engine (Meilisearch)</h4>
        <div class="desc">Busqueda full-text de propiedades en espanol con facets, filtros instantaneos y typo-tolerance. Reemplaza queries SQL directas que no escalan con volumen. UX critica para el portal publico.</div>
      </div>
      <div class="improvement-card">
        <div class="priority priority-high">ALTA</div>
        <h4>CDN para Imagenes</h4>
        <div class="desc">Cloudflare R2 o S3 + CloudFront para servir fotos de propiedades desde edge. Reduce latencia para usuarios en Espana y LatAm. Transformaciones on-the-fly (resize, webp) para performance.</div>
      </div>
      <div class="improvement-card">
        <div class="priority priority-medium">MEDIA</div>
        <h4>Descomponer server.js Monolitico</h4>
        <div class="desc">Separar el server.js de 87KB del Dashboard en modulos: rutas API, middleware, servicios. No microservicios completos aun, pero si modularizacion para mantenibilidad y testing.</div>
      </div>
      <div class="improvement-card">
        <div class="priority priority-medium">MEDIA</div>
        <h4>API Gateway</h4>
        <div class="desc">Centralizar autenticacion, rate limiting, CORS y routing entre servicios. Punto unico de entrada para website, dashboard y futuros clientes API (developers B2B).</div>
      </div>
      <div class="improvement-card">
        <div class="priority priority-medium">MEDIA</div>
        <h4>Message Queue (Redis Streams)</h4>
        <div class="desc">Desacoplar scrapers y procesamiento asincrono. Los scrapes de PropertyFinder generan eventos que se procesan independientemente (dedup, normalizacion, notificaciones). Ya tenemos Redis.</div>
      </div>
      <div class="improvement-card">
        <div class="priority priority-medium">MEDIA</div>
        <h4>Monitoring (Sentry + Grafana)</h4>
        <div class="desc">Observabilidad de errores, performance y metricas de negocio. Alertas automaticas cuando un scraper falla, el API tiene latencia alta, o las propiedades dejan de actualizarse.</div>
      </div>
      <div class="improvement-card">
        <div class="priority priority-medium">MEDIA</div>
        <h4>Caching Avanzado (Redis)</h4>
        <div class="desc">Cache de queries frecuentes de propiedades, resultados de busqueda, y datos de developers. Invalidacion inteligente cuando llegan nuevos datos de scraping. Ya tenemos Redis desplegado.</div>
      </div>
      <div class="improvement-card">
        <div class="priority priority-medium">MEDIA</div>
        <h4>WebSockets (Notificaciones Real-time)</h4>
        <div class="desc">Notificaciones push cuando hay nuevas propiedades, price drops, o actualizaciones de proyectos. Mejora la retencion y engagement de inversores activos.</div>
      </div>
      <div class="improvement-card">
        <div class="priority priority-low">BAJA</div>
        <h4>Multi-region DB</h4>
        <div class="desc">Replicas read-only de PostgreSQL en Europa para baja latencia en Espana/LatAm. Solo cuando el volumen de usuarios justifique el costo de infraestructura multi-region.</div>
      </div>
      <div class="improvement-card">
        <div class="priority priority-low">BAJA</div>
        <h4>Mobile App (React Native)</h4>
        <div class="desc">Aplicacion nativa para inversores hispanohablantes. Push notifications de oportunidades, calculadora ROI offline, y acceso rapido a favoritos. Complementa al portal web, no lo reemplaza.</div>
      </div>
    </div>
  </div>

  <!-- ════════ 12. PATRONES ════════ -->
  <div class="section section-break">
    <h2>12. Patrones Arquitectonicos</h2>
    <p>Los 7 patrones que definen como funciona el sistema Emiralia:</p>

    <table>
      <thead><tr><th>Patron</th><th>Descripcion</th></tr></thead>
      <tbody>
        <tr><td><strong>Memory Bus</strong></td><td>Todos los agentes escriben en <code>agent_memory</code> (PostgreSQL) con scope shared. Skills leen al cargarse via <code>!backtick</code> injection. Estado visible system-wide sin hardcoding.</td></tr>
        <tr><td><strong>Research → Audit Chain</strong></td><td>Research Agent monitorea fuentes externas semanalmente → escribe <code>latest_research_report</code> → WAT Auditor lo lee antes de cada auditoria → cross-referencia en Check 2e.</td></tr>
        <tr><td><strong>Skill Cascade</strong></td><td>Skills se sugieren mutuamente (<code>/crear-prd</code> → <code>/priorizar-features</code> → <code>/planificar-sprint</code>), creando secuencias naturales sin workflows formales.</td></tr>
        <tr><td><strong>Workflow Orchestration</strong></td><td>Workflows encadenan 2-4 skills con checkpoints obligatorios de usuario entre cada paso. Escritura cross-agente en memoria compartida al finalizar.</td></tr>
        <tr><td><strong>Skills 2.0 Tiers</strong></td><td><code>haiku</code> para tracking y queries ligeras, <code>sonnet</code> para auditorias y analisis, <code>opus</code> para PRDs estrategicos. Optimiza costo/calidad por skill.</td></tr>
        <tr><td><strong>disable-model-invocation</strong></td><td>Skills con side effects solo se invocan con <code>/comando</code> explicito del usuario. Previene ejecucion accidental de operaciones costosas o irreversibles.</td></tr>
        <tr><td><strong>Shared Audit Scoring</strong></td><td><code>/wat-audit</code> y <code>/pm-context-audit</code> usan formula identica: <code>100 - critical*10 - warning*3 - suggestion*1</code>. Scores comparables y visibles system-wide.</td></tr>
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="page-footer">
    <span>Emiralia — Mapa de Arquitectura</span>
    <span>Documento confidencial &middot; ${today}</span>
  </div>

</body>
</html>`;

// Generate PDF
const outputPath = resolve(ROOT, 'emiralia-architecture-map.pdf');

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
