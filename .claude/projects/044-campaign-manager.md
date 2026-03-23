---
id: 45
status: Completed
created: 2026-03-23
phase_current: 7
phase_completed: [1, 2, 3, 4, 5, 6, 7]
agents:
  - dev-agent
  - frontend-agent
  - marketing-agent
  - content-agent
  - social-media-agent
  - paid-media-agent
---

# Campaign Manager — Hub de Orquestación Multi-Agente

## Problema

Emiralia tiene agentes de producción de contenido (content, social-media, SEO) y un Creative Studio en desarrollo (Proyecto 043), pero no existe ninguna capa de orquestación que coordine TODOS los tipos de contenido bajo una campaña unificada con objetivo, canales, presupuesto y timeline. Cada agente trabaja de forma aislada, sin que haya una visión de "campaña" que agrupe blog + social + paid + email en un único pipeline con aprobación humana y calendario unificado.

## Solución

Construir un Campaign Manager nativo en el dashboard de Emiralia que:

1. Permita crear **campañas** con objetivo, audiencia, canales, presupuesto y fechas
2. Derive automáticamente **piezas de contenido** por canal, asignadas al agente correcto
3. Orqueste el **pipeline de producción** por canal (blog → SEO, social → Creative Studio, paid → paid-media-agent)
4. Gestione el **flujo de aprobación humana** (pending → producing → pending_review → approved → published)
5. Muestre un **calendario editorial unificado** de todas las piezas de todas las campañas
6. Integre con Creative Studio (Proyecto 043) de forma aditiva — funciona sin él, se enriquece cuando está disponible

### Arquitectura de dos capas

```
Campaign Manager (/campaign-manager)          ← ORQUESTACIÓN
  → Crea campañas y piezas de contenido
  → Asigna agentes por canal
  → Gestiona aprobaciones y calendario

Creative Studio (/creative-studio) [P043]     ← PRODUCCIÓN
  → Genera imágenes, vídeos, TTS, LipSync
  → Pipeline KIE AI por tipo de asset
```

### Pipelines por canal

```
Blog:
  content-agent /generar-blog-post → artifact
  → seo-agent /optimizar-blog-post → pending_review → publish website

Instagram / TikTok (imagen):
  social-media-agent /brief-social-image → creative_assets brief
  → Creative Studio genera → pending_review → social post

TikTok / Reels (avatar video):
  social-media-agent /brief-avatar-video → TTS + LipSync KIE AI
  → pending_review → social post

Meta Ads / Google Ads / TikTok Ads:
  paid-media-agent /brief-meta-ad|google-ad|tiktok-ad
  → ad_brief en DB → human sube a plataforma (Fase 1)

Email:
  content-agent /brief-email-campaign → artifact email_template
  → pending_review → send
```

## Métricas de Éxito

- Crear campaña multi-canal en < 2 minutos desde el wizard
- Pipeline blog end-to-end funcional (content → SEO → approved → publish)
- Pipeline social imagen funcional (brief → Creative Studio → approved → calendar)
- paid-media-agent produciendo briefs estructurados para Meta/Google/TikTok Ads
- Calendario editorial unificado mostrando todas las piezas de todas las campañas activas
- `/crear-campana` de marketing-agent crea campaign + items vía API
- 0 tablas duplicadas respecto a proyectos/artifacts/creative_studio existentes

## Arquitectura WAT

### Nuevo agente: paid-media-agent

```
Rol: Paid advertising — Meta Ads, Google Ads, TikTok Ads
Fase 1: Produce briefs estructurados para ejecución manual
Fase 2: Integra con APIs de plataformas (Meta Marketing API, Google Ads API, TikTok Ads API)

Skills:
  /brief-meta-ad        — objetivo, audience targeting, copy, creative specs, budget, bid strategy
  /brief-google-ad      — campaign type, keywords, ad copy (15H×4D), audience signals, landing page
  /brief-tiktok-ad      — objetivo, audience, script In-Feed Ad, caption, CTA, budget
  /reporte-paid-media   — spend vs budget, performance summary, recomendaciones

Memory keys (shared):
  active_campaigns, monthly_budget_total, monthly_budget_spent,
  last_ad_performance, last_task_completed, last_task_at
```

### Skills nuevas en agentes existentes

| Agente | Skill | Output |
|--------|-------|--------|
| `content-agent` | `/generar-blog-post` | artifact blog_draft → handoff a seo-agent → actualiza campaign_items |
| `content-agent` | `/brief-email-campaign` | artifact email_template |
| `social-media-agent` | `/brief-social-image` | creative_assets brief (fallback artifact) → link campaign_items |
| `social-media-agent` | `/brief-paid-avatar-video` | ≤15s, CTA directo, specs plataforma |
| `marketing-agent` | `/crear-campana` | campaigns + campaign_items via API + update memory |
| `marketing-agent` | `/revisar-campana` | resumen estado + recomendaciones + memory |

### Nuevas Tablas DB

#### `campaigns`
```sql
CREATE TABLE campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(500) NOT NULL,
  description     TEXT,
  goal            TEXT,
  target_audience TEXT,
  channels        JSONB DEFAULT '[]',
  budget_total    NUMERIC(12,2),
  budget_spent    NUMERIC(12,2) DEFAULT 0,
  currency        VARCHAR(10) DEFAULT 'USD',
  start_date      DATE,
  end_date        DATE,
  status          VARCHAR(30) DEFAULT 'planning'
    CHECK (status IN ('planning','briefing','producing','reviewing','active','paused','completed')),
  created_by      VARCHAR(100) DEFAULT 'human',
  agent_id        VARCHAR(50) REFERENCES agents(id),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### `campaign_items`
```sql
CREATE TABLE campaign_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  channel           VARCHAR(50) NOT NULL,
  content_type      VARCHAR(50) NOT NULL,
  title             VARCHAR(500),
  assigned_agent    VARCHAR(50) REFERENCES agents(id),
  status            VARCHAR(30) DEFAULT 'pending'
    CHECK (status IN ('pending','briefing','producing','pending_review','approved','scheduled','published','rejected')),
  artifact_id       UUID REFERENCES artifacts(id) ON DELETE SET NULL,
  creative_asset_id UUID,                    -- FK activado post-043 via migration
  scheduled_at      TIMESTAMPTZ,
  published_at      TIMESTAMPTZ,
  ad_platform       VARCHAR(30),
  ad_budget         NUMERIC(10,2),
  ad_spend_actual   NUMERIC(10,2),
  ad_brief          JSONB DEFAULT '{}',
  notes             TEXT,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### Workflow: campaign-execution.md

```
Trigger: marketing-agent /crear-campana OR humano desde UI

Paso 1 — Campaign Brief (marketing-agent)
  Crea campaigns record + campaign_items por canal → status: planning → briefing
  Checkpoint: humano confirma estructura en UI

Paso 2 — Producción paralela por canal
  blog:       content-agent /generar-blog-post → seo-agent → pending_review
  instagram:  social-media-agent /brief-social-image → Creative Studio → pending_review
  tiktok:     social-media-agent /brief-avatar-video → TTS+LipSync → pending_review
  meta_ads:   paid-media-agent /brief-meta-ad → ad_brief en DB → pending_review
  email:      content-agent /brief-email-campaign → pending_review

Paso 3 — Human Review Loop
  Humano aprueba/rechaza cada item en Campaign Manager UI
  Rechazado → agente re-produce

Paso 4 — Scheduling
  Orgánico: marketing-agent /planificar-semana-editorial → editorial_calendar slots
  Paid: human sube brief a plataforma manualmente (Fase 1)

Paso 5 — Campaña activa → campaigns.status = 'active'

Paso 6 — Cierre
  paid-media-agent /reporte-paid-media
  marketing-agent /revisar-campana
  campaigns.status = 'completed'
```

### CHANNEL_DEFAULTS (auto-asignación en wizard)

```javascript
blog       → blog_post        → content-agent
instagram  → social_image     → social-media-agent
tiktok     → avatar_video     → social-media-agent
linkedin   → social_image     → content-agent
meta_ads   → paid_ad_image    → paid-media-agent
google_ads → paid_ad_image    → paid-media-agent
tiktok_ads → paid_ad_video    → paid-media-agent
email      → email_campaign   → content-agent
```

## Fases y Tareas

### Fase 1 — DB + API Shell ✅ DONE (2026-03-23)

**Agentes:** dev-agent | **Prioridad:** High

| Task | Descripción | Agente | T | Estado |
|------|-------------|--------|---|--------|
| 1.1 | `tools/db/migration_campaign_manager.sql`: tablas campaigns + campaign_items + indexes + triggers updated_at | dev-agent | S | ✅ |
| 1.2 | `apps/dashboard/routes/campaigns.js`: todos los endpoints CRUD (campaigns + items) + submit-review + approve + reject + stats | dev-agent | M | ✅ |
| 1.3 | Importar router en `server.js`: `app.use('/api/campaigns', campaignsRouter)` | dev-agent | XS | ✅ |
| 1.4 | `submit-review` crea `inbox_items` entry para assigned_agent (patrón server.js:2789) | dev-agent | S | ✅ |

**Archivos creados/modificados:**
- `tools/db/migration_campaign_manager.sql` — tablas + indexes + triggers
- `apps/dashboard/routes/campaigns.js` — 13 endpoints (GET/POST/PATCH/DELETE campaigns + items + submit-review/approve/reject)
- `apps/dashboard/server.js` — import + `app.use('/api/campaigns', createCampaignsRouter(pool))`

**Notas de implementación:**
- `run-migration.js` tiene un bug hardcodeado que comprueba `generated_images` como verificación — sale con exit 1 pero el SQL sí se ejecuta correctamente. Confirmado consultando tablas directamente.
- Trigger `update_updated_at_column()` usa `CREATE OR REPLACE` — compatible con creative_studio migration.

**✅ Verificación realizada:**
```
GET /api/campaigns       → []
GET /api/campaigns/stats → {"campaigns":{"total":0,"by_status":{}},"items":{"total":0,"by_status":{}},"budget":{"total_allocated":0,"total_spent":0}}
```

**Test para el usuario (opcional — ya verificado por dev-agent):**
```bash
curl -s http://localhost:3001/api/campaigns
curl -s http://localhost:3001/api/campaigns/stats
# Crear una campaign de prueba:
curl -s -X POST http://localhost:3001/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Campaña","channels":["blog","instagram"],"status":"planning"}' | jq .
```

---

### Fase 2 — UI Shell + Lista de Campañas (2 días)

**Agentes:** frontend-agent | **Prioridad:** High

| Task | Descripción | Agente | T |
|------|-------------|--------|---|
| 2.1 | `campaignConstants.js`: CAMPAIGN_STATUS_COLORS, CHANNEL_OPTIONS con iconos, CONTENT_TYPE_BY_CHANNEL, CHANNEL_DEFAULTS | frontend-agent | S |
| 2.2 | `CampaignManager.jsx`: header, tabs Campañas/Calendario, estado loading/empty | frontend-agent | M |
| 2.3 | `CampaignList.jsx`: tabla Title/Status/Channels/Items/Budget/Dates/Actions. Filter: status + search | frontend-agent | M |
| 2.4 | Ruta `/campaign-manager` en `main.jsx`. Nav item en `Layout.jsx` (grupo Operaciones) | frontend-agent | XS |

**Verificación:** Nav visible. Página carga. Empty state correcto.

---

### Fase 3 — Campaign Wizard (2 días)

**Agentes:** frontend-agent | **Prioridad:** High

| Task | Descripción | Agente | T |
|------|-------------|--------|---|
| 3.1 | `CampaignWizard.jsx`: 3 pasos (detalles / canales con budget / piezas derivadas con agente editable) | frontend-agent | M |
| 3.2 | Submit: POST /campaigns → bulk POST /campaigns/:id/items → redirect a Campaign Detail | frontend-agent | S |
| 3.3 | Channel → content_type auto-populate usando CHANNEL_DEFAULTS | frontend-agent | S |

**Verificación:** Crear campaña 3 canales → aparece en lista → items en DB.

---

### Fase 4 — Campaign Detail + Pipeline de Items (3 días)

**Agentes:** dev-agent, frontend-agent | **Prioridad:** High

| Task | Descripción | Agente | T |
|------|-------------|--------|---|
| 4.1 | `CampaignDetail.jsx`: header con title/status/dates/channels/budget gauge | frontend-agent | M |
| 4.2 | `CampaignItemRow.jsx`: canal icon, content type badge, agente badge, status badge, links, botones Submit/Approve/Reject | frontend-agent | M |
| 4.3 | `CampaignItemModal.jsx`: form add/edit item (channel, content_type, assigned_agent, notes, scheduled_at) | frontend-agent | M |
| 4.4 | `CampaignKPIBar.jsx`: 5 pills — Total / Pending / Producing / Pending Review / Published | frontend-agent | S |
| 4.5 | Status transitions: Submit → PATCH + inbox notif. Approve → PATCH. Reject → PATCH + reason | frontend-agent | S |
| 4.6 | Endpoint `/api/campaigns/items/:itemId/submit-review`: status update + inbox_items entry | dev-agent | S |

**Verificación:** Abrir campaña → lista items → cambiar status → inbox entry creado.

---

### Fase 5 — Paid Media Agent + Briefs (2 días)

**Agentes:** dev-agent, frontend-agent | **Prioridad:** High

| Task | Descripción | Agente | T |
|------|-------------|--------|---|
| 5.1 | `.claude/agents/marketing/paid-media-agent.md` con definición completa | dev-agent | S |
| 5.2 | Registrar paid-media-agent en tabla `agents` de DB | dev-agent | XS |
| 5.3 | `PaidAdBriefPanel.jsx`: selector plataforma, objetivo, presupuesto, audience, formato. Visible en CampaignItemModal cuando canal es paid | frontend-agent | M |
| 5.4 | PATCH items soporta ad_brief JSONB + ad_budget. Stats incluye budget burn | dev-agent | S |

**Verificación:** Item Meta Ads → brief panel visible → brief guardado en JSONB.

---

### Fase 6 — Skills de Agentes (2 días)

**Agentes:** content-agent, social-media-agent, marketing-agent, paid-media-agent, dev-agent | **Prioridad:** High

| Task | Descripción | Agente | T |
|------|-------------|--------|---|
| 6.1 | Skill `/generar-blog-post` en content-agent.md | content-agent | M |
| 6.2 | Skill `/brief-email-campaign` en content-agent.md | content-agent | S |
| 6.3 | Skill `/brief-social-image` en social-media-agent.md | social-media-agent | S |
| 6.4 | Skill `/brief-paid-avatar-video` en social-media-agent.md | social-media-agent | S |
| 6.5 | Skill `/crear-campana` en marketing-agent.md | marketing-agent | M |
| 6.6 | Skill `/revisar-campana` en marketing-agent.md | marketing-agent | S |
| 6.7 | Skills /brief-meta-ad, /brief-google-ad, /brief-tiktok-ad, /reporte-paid-media en paid-media-agent.md | paid-media-agent | M |
| 6.8 | Actualizar AGENTS.md + SKILLS.md + WORKFLOWS.md | dev-agent | S |

---

### Fase 7 — Workflow + Integración Creative Studio (1 día)

**Agentes:** dev-agent, frontend-agent | **Prioridad:** Medium

| Task | Descripción | Agente | T |
|------|-------------|--------|---|
| 7.1 | `.claude/workflows/campaign-execution.md` SOP completo | dev-agent | S |
| 7.2 | Actualizar WORKFLOWS.md con nuevo workflow | dev-agent | S |
| 7.3 | En campaigns router: cuando creative_asset_id linkeado y creative_assets.status='approved' → auto-sync campaign_items.status='approved' (graceful si tabla no existe) | dev-agent | S |
| 7.4 | CampaignItemRow: thumbnail preview si creative_asset_id linkeado (graceful 404 hasta que 043 esté vivo) | frontend-agent | S |

**Verificación end-to-end:**
1. Crear campaña "Semana del Inversor Q1" → Blog + Instagram + Meta Ads
2. Wizard genera 3 campaign_items con agentes correctos
3. Abrir detalle → 3 items en 'pending'
4. Submit review en blog item → content-agent recibe en inbox
5. Item Meta Ads → brief panel visible → brief guardado
6. Approve item → KPI bar actualiza
7. `/api/campaigns/stats` retorna datos

## Archivos a Crear

```
tools/db/migration_campaign_manager.sql
apps/dashboard/routes/campaigns.js
apps/dashboard/src/pages/CampaignManager.jsx
apps/dashboard/src/components/campaign/campaignConstants.js
apps/dashboard/src/components/campaign/CampaignList.jsx
apps/dashboard/src/components/campaign/CampaignWizard.jsx
apps/dashboard/src/components/campaign/CampaignDetail.jsx
apps/dashboard/src/components/campaign/CampaignKPIBar.jsx
apps/dashboard/src/components/campaign/CampaignItemRow.jsx
apps/dashboard/src/components/campaign/CampaignItemModal.jsx
apps/dashboard/src/components/campaign/PaidAdBriefPanel.jsx
apps/dashboard/src/components/campaign/CampaignCalendarView.jsx
.claude/agents/marketing/paid-media-agent.md
.claude/workflows/campaign-execution.md
```

## Archivos a Modificar

```
apps/dashboard/server.js                        — importar campaigns router
apps/dashboard/src/main.jsx                     — añadir ruta /campaign-manager
apps/dashboard/src/components/Layout.jsx        — añadir nav item
.claude/agents/marketing/marketing-agent.md     — añadir /crear-campana, /revisar-campana
.claude/agents/marketing/social-media-agent.md  — añadir /brief-social-image, /brief-paid-avatar-video
.claude/agents/content/content-agent.md         — añadir /generar-blog-post, /brief-email-campaign
.claude/AGENTS.md                               — añadir paid-media-agent
.claude/SKILLS.md                               — añadir 10 skills nuevas
.claude/WORKFLOWS.md                            — añadir campaign-execution
```

## Integración con Creative Studio (Proyecto 043)

**Stage A (antes de 043):** campaign_items de tipo social_image/avatar_video crean artifacts con metadata content_type. creative_asset_id = null. Campaign Manager funciona completamente.

**Stage B (post-043):** `ALTER TABLE campaign_items ADD CONSTRAINT fk_creative_asset FOREIGN KEY (creative_asset_id) REFERENCES creative_assets(id) ON DELETE SET NULL;` — FK activado via migration.

**Stage C (full integration):** Server-side sync: cuando creative_assets.status = 'approved', auto-update campaign_items.status = 'approved'.

## Post-MVP / Hoja de Ruta

- **Paid Media API Phase 2:** Integración directa con Meta Marketing API, Google Ads API, TikTok Marketing API via `tools/paid-media/`
- **Campaign Performance Dashboard:** KPIs post-lanzamiento por canal (CTR, CPM, conversiones, ROI)
- **A/B Testing:** Múltiples variantes de creative por canal bajo la misma campaña
- **Campaign Templates:** Plantillas predefinidas por objetivo (Developer Acquisition, Property Launch, Investor Week)
- **Budget Optimization:** paid-media-agent recomienda redistribución de presupuesto basada en performance
