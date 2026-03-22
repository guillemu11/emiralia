---
id: 39
status: Planning
created: 2026-03-22
agents: [dev-agent, frontend-agent, content-agent, social-media-agent, marketing-agent, analytics-agent, legal-agent, seo-agent, data-agent, pm-agent, wat-auditor-agent, research-agent]
---

# 039 — Agent Workspaces: Centro de Control por Departamento

## Problema
La interfaz del Agent Chat Console es genérica y no refleja los outputs radicalmente distintos de cada agente. No existe una interfaz para revisar, aprobar y publicar artefactos de forma estructurada ni conectarlos con los canales externos (web, Instagram, TikTok, email). Cada aprobación requiere intervención manual fuera del sistema.

## Solución
Añadir una pestaña **"Workspace"** en `AgentDetail.jsx` que carga una vista personalizada por agente — su centro de control completo: artefactos, acciones contextuales (aprobar/rechazar/editar/publicar), métricas propias, y conectividad con otros agentes y canales externos.

**Arquitectura:**
- PostgreSQL `artifacts` + `artifact_publications` + `artifact_handoffs` → fuente de verdad
- Cada workspace es un componente React especializado cargado según `agent.department`
- Capa de publicación universal: botón "Enviar a..." con destinos según tipo de artefacto
- Pinecone + Gemini embeddings → capa semántica multimodal (Fase 5, post-MVP)

## Flujo universal de artefacto
```
Generación → pending_review → approved/rejected → published → analytics
```

## Canales de publicación conectados
- **Web Emiralia** — blog posts, propiedades, FAQs, páginas nuevas
- **Instagram Graph API** — posts, reels, stories
- **TikTok API** — vídeos generados con HeyGen
- **Email platform (Mailchimp/Brevo)** — newsletters, campañas, secuencias automatizadas
- **Developer Portal B2B** — dashboards de developers, lead reports
- **Cross-agent handoffs** — de cualquier agente a cualquier otro con instrucción

## Notificaciones transversales
- **Telegram:** cuando artefacto pasa a `pending_review`
- **Inbox del dashboard:** cuando un agente completa handoff a otro
- **Badge count** en tab "Workspace" de cada agente

---

## Diseño de cada Workspace

### 1. CONTENT WORKSPACE — "Content Studio"
**Agente:** Content Agent | **Dept:** content

**Layout:** Grid de cards con preview + panel lateral de stats
**Artifact types:** `blog_post` · `property_listing` · `email_template`

**Wizard de generación:**
- Tipo: Blog / Ficha propiedad / Email
- Tema libre o selección de propiedad del DB
- Tono: Informativo / Conversacional / Persuasivo / Urgente
- Idioma: ES-ES / ES-MX / ES-CO / EN
- Keywords objetivo (integra datos del SEO Agent)
- Imágenes: auto-generar con /generar-imagen o galería

**Acciones por artefacto:**
- 👁 Preview modal con rich text + metadata SEO
- ✏️ Edit inline (título, body, slug, keywords)
- ✅ Aprobar / ❌ Rechazar con motivo
- 🔤 Traducir → handoff a Translation Agent
- 🔍 Optimizar SEO → handoff a SEO Agent
- 🌐 Publicar web → POST al CMS directo
- 📧 Enviar a Email → convierte en newsletter
- 📱 Compartir snippet → Social Media Agent

**Conectividad:** Translation Agent · SEO Agent · Web CMS · Email platform · Social Media Agent

---

### 2. SOCIAL MEDIA WORKSPACE — "Social Studio"
**Agente:** Social Media Agent | **Dept:** marketing

**Layout:** Calendario semanal/mensual + panel de detalle de script
**Artifact types:** `video_script` · `social_post` · `avatar_brief` · `content_calendar`

**Características clave:**
- Calendario drag & drop (week/month toggle)
- Color coding por avatar: Fernando (azul) / Yolanda (morado)
- Badge de plataforma por slot: IG / TT / LI
- Slots vacíos clickables para crear nuevo script

**Acciones por script:**
- ✏️ Editor con contador de palabras/tiempo
- ✅ Aprobar / ❌ Rechazar
- 🎬 Enviar a HeyGen → genera vídeo con avatar IA
- 🖼 Generar cover → Content Agent
- 📱 Publicar ahora → Instagram Graph API
- 📅 Programar → date picker → schedule IG/TT

**Panel de métricas (tab dentro del workspace):**
- Views totales, engagement rate, top post del mes
- Rendimiento comparativo Fernando vs Yolanda

**Wizard de nuevo script:**
- Tema: texto libre o propiedad del DB
- Avatar: Fernando / Yolanda | Plataforma: IG / TT / Ambas
- Duración: 30s / 60s / 90s / 3min
- Hook: auto-generate 3 opciones | CTA: Ver web / Contactar / Suscribirse

**Conectividad:** HeyGen API · KIE AI · Instagram Graph API · TikTok API · Content Agent · Analytics Agent · Marketing Agent

---

### 3. MARKETING WORKSPACE — "Campaign Command"
**Agente:** Marketing Agent | **Dept:** marketing

**Layout:** 3 paneles (campañas · canal performance · documentos) + Gantt de 30/90 días
**Artifact types:** `campaign_brief` · `positioning_doc` · `gtm_strategy` · `channel_report`

**Secciones:**
1. Campañas Activas — nombre, canal, status, leads, CPL, ROI
2. Channel Performance — Organic / Paid / Social / Email / SEO con métricas
3. Documentos Estratégicos — ICP, propuesta de valor, battlecard, GTM Plan
4. Calendario de Campañas — Gantt 30/90 días arrastrable
5. Lead Funnel Snapshot — datos del Analytics Agent en tiempo real

**Conectividad:** Social Media Agent · Content Agent · Analytics Agent · Email platform · Dev Agent

---

### 4. ANALYTICS WORKSPACE — "Intelligence Hub"
**Agente:** Analytics Agent | **Dept:** analytics

**Layout:** KPI cards + Funnel interactivo + tablas de performance
**Artifact types:** `report` · `kpi_snapshot` · `funnel_analysis` · `market_benchmark` · `cohort_analysis`

**Secciones:**
1. North Star KPIs — 3 métricas grandes con trend MoM (Leads · Propiedades · Revenue B2B)
2. Funnel Interactivo — Sankey chart clickable por etapa (Visitas → Leads → Qualified → Meetings → Deals)
3. Property Performance — tabla con sparklines por propiedad
4. Developer Dashboard B2B — 1 fila por developer con leads/revenue (activo en Phase 1)
5. Market Benchmark — comparativa automática vs PropertyFinder/Bayut
6. Reports Library — historial descargable (PDF/CSV) y compartible

**Conectividad:** PM Agent · Marketing Agent · Social Media Agent · Developer Portal · Email platform

---

### 5. LEGAL WORKSPACE — "Legal Knowledge Hub"
**Agente:** Legal Agent | **Dept:** legal

**Layout:** FAQ Bank por categoría + Alertas regulatorias + Guías versionadas
**Artifact types:** `faq_entry` · `legal_guide` · `investor_brief` · `regulatory_alert`

**Secciones:**
1. FAQ Bank — categorías: RERA · Golden Visa · DLD · Hipotecas · DIFC · Impuestos · Zonas Libres · Off-Plan
   - Cada FAQ: pregunta, respuesta, fuente, fecha de validez, idioma, status (Draft/Approved/Published/Outdated)
2. Alertas Regulatorias — feed automático del Research Agent
   - Una alerta puede auto-generar borrador de FAQ actualizada
3. Guías Legales — documentos completos versionados con historial de diff
4. Consultas Recientes — historial anónimo para detectar gaps en el FAQ bank
5. Métricas — topics más consultados, FAQs más útiles, satisfaction rate

**Acciones por guía/FAQ:**
- Publicar en web → /legal del site
- PDF descargable
- Actualizar con alert regulatoria
- → Content Agent para convertir en artículo de blog
- → Translation Agent para traducir a EN

**Conectividad:** Research Agent (alertas) · Web CMS · Content Agent · Translation Agent · Email platform (newsletter de alertas)

---

### 6. DESIGN WORKSPACE — "Design Studio"
**Agente:** Frontend Agent | **Dept:** design

**Layout:** Galería de assets con preview visual + Design System Panel
**Artifact types:** `page_design` · `component` · `template` · `mockup` · `brand_audit_report`

**Secciones:**
1. Assets Grid — thumbnails con preview en iframe
   - Filter: Página / Componente / Template / Mockup
   - Status: Draft / In Review / Approved / Deployed
2. Design System Panel — referencia viva: colores, tipografía, componentes, brand rules
3. Screenshot Comparison — before/after visual de cambios (captura automática tras deploy)
4. Pending Deploy — diseños aprobados listos para handoff a Dev Agent

**Acciones por asset:**
- 👁 Preview en iframe | ✏️ Edit + screenshot loop
- ✅ Aprobar | 🚀 Deploy → handoff a Dev Agent
- 🔀 Fork para crear variante A/B
- 📐 Brand Check — auto-auditar contraste y regla 80/20

**Conectividad:** Dev Agent · Web Vercel · Content Agent (assets) · Marketing Agent (ad creatives) · Social Media Agent (templates IG)

---

### 7. DEV WORKSPACE — "Engineering Hub"
**Agente:** Dev Agent | **Dept:** dev

**Layout:** Kanban Board + System Health Monitor + Deploy Pipeline
**Artifact types:** `feature` · `bug_fix` · `migration` · `deployment`

**Secciones:**
1. Kanban Board — Todo / In Progress / Review / Done
   - Cards: título, prioridad, PR link, tests status
   - Pull automático de tasks del sprint (PM Agent)
2. System Health Monitor — status de todos los servicios, latencia p95, error rate, uptime
   - Botón de restart por servicio
3. Deploy Pipeline — historial de deploys, botón deploy, rollback a versión anterior
4. DB Migrations — historial aplicado, botón para aplicar pendiente
5. Error Log — últimas 24h agrupados por tipo

**Conectividad:** Frontend Agent (specs) · PM Agent (sprint tasks) · GitHub (PRs) · Vercel (deploy)

---

### 8. DATA WORKSPACE — "Pipeline Control"
**Agente:** Data Agent | **Dept:** data

**Layout:** Scraping Jobs en tiempo real + Dataset Table interactiva
**Artifact types:** `scrape_job` · `dataset` · `dedup_report` · `data_quality_report`

**Secciones:**
1. Scraping Jobs — fuentes: PropertyFinder · Bayut · PanicSelling
   - Estado en tiempo real: running / done / idle + progress bar
   - Run now / Schedule / Ver historial / Ver dataset
2. Data Quality Panel — gauge global + breakdown por campo (campos completos, coordenadas, imágenes)
3. Deduplication Panel — Tier 1 (exact) / Tier 2 (fuzzy) / Tier 3 (semantic)
   - Grupos detectados / Merged / Revisión manual pendiente
4. Dataset Table — tabla interactiva con filtros: Developer, Zona, Precio, Tipo, Estado
   - Acciones por fila: → Content Agent / → SEO Agent / Publicar web / Archivar
5. Pipeline Schedule — calendar de scraping programado

**Conectividad:** Content Agent (generar fichas en batch) · SEO Agent (metadata) · Web (update listings) · Analytics Agent (feed de datos)

---

### 9. SEO WORKSPACE — "SEO Control Tower"
**Agente:** SEO Agent | **Dept:** seo

**Layout:** Keyword Matrix + Site Audit + Meta Tags Manager
**Artifact types:** `keyword` · `seo_audit` · `meta_tag` · `structured_data`

**Secciones:**
1. Keyword Matrix — tabla editable con vol/dificultad/intención/posición actual y objetivo
   - Acción "Gap → Content Agent": keywords sin contenido → brief automático
2. Site Audit — reporte por página con issues: Critical / Warning / Opportunity
3. Meta Tags Manager — edición inline, cambios se aplican al site vía API
4. Structured Data — status por esquema (Property/Article/FAQ/HowTo/Organization) y por página
   - Botón para regenerar cualquier schema
5. Ranking Tracker (futuro) — posición en Google por keyword en el tiempo

**Conectividad:** Content Agent (gaps → brief) · Dev Agent (technical issues → ticket) · Data Agent (metadata propiedades) · Web (deploy metas directo)

---

### 10. PM WORKSPACE — "Product Command"
**Agente:** PM Agent | **Dept:** product

**Layout:** Sprint activo + Roadmap + PRDs
**Artifact types:** `prd` · `sprint` · `user_story` · `roadmap`

**Secciones:**
1. Sprint Activo — burndown + kanban (Todo / In Progress / Done), velocity
2. Roadmap — timeline Q1/Q2/Q3 con fases del proyecto (Phase 0/1/2)
3. Backlog — lista priorizada con impact/effort matrix visual
4. PRDs — repositorio de PRDs aprobados y en borrador
5. PM Reports — sprint summaries, EOD agregados, velocity trends

**Conectividad:** Dev Agent · Frontend Agent · Analytics Agent · Todos los agentes (WAT Memory)

---

### 11. WAT AUDITOR WORKSPACE — "System Health"
**Agente:** WAT Auditor | **Dept:** ops

**Artifact types:** `audit_report` · `inconsistency` · `improvement_proposal`

**Secciones:**
1. Score Global 0-100 — gauge con trend histórico y breakdown por categoría
2. Audit Reports — historial con score, critical issues y estado de fix
3. Active Issues — Critical / Warning / Suggestion con asignación a Dev Agent para técnicos
4. Consistency Matrix — Agents × Skills × Tools cross-reference
5. Improvement Proposals — backlog de mejoras del sistema WAT

---

### 12. RESEARCH WORKSPACE — "Intelligence Center"
**Agente:** Research Agent | **Dept:** ops

**Artifact types:** `intelligence_report` · `market_alert` · `competitor_intel`

**Secciones:**
1. Intelligence Feed — últimos reportes por impacto (HIGH/MEDIUM/LOW)
   - Filter: Claude updates / PropTech / Market / Competitors
2. Source Monitor — estado de cada fuente: Anthropic · GitHub · Reddit · PropTech news
3. Action Items — hallazgos que requieren acción de otro agente
   - → WAT Auditor (actualizaciones Claude Code) · → Legal Agent (cambios RERA/DLD)
4. Trend Analysis — temas emergentes en el tiempo

---

### 13. EMAIL MARKETING WORKSPACE (Futuro — Q2 2026)
**Agente:** Email Agent (planificado)

**Secciones planificadas:**
1. Campaign Manager — activas / programadas / completadas con open rate, CTR, conversiones
2. Template Library — editor drag-and-drop con preview desktop/mobile y variables dinámicas
3. Audience Segments — automáticos por comportamiento en site + manuales por país/interés
4. Automation Flows — Welcome sequence · Property alert · Nurture · Post-inquiry · Legal guide delivery
5. Send Schedule — calendario de envíos con hora por timezone

**Conectividad:** Content Agent · Analytics Agent · Marketing Agent · Mailchimp/Brevo API · Legal Agent

---

## Capa de Conectividad Global — "Publish Anywhere"

### Botón "Enviar a..." por tipo de artefacto
| Tipo | Destinos disponibles |
|------|---------------------|
| `blog_post` | Web CMS · Email Newsletter · Social snippet |
| `property_listing` | Web DB · Email alert · Social post |
| `faq_entry` | Web /legal · Email FAQ digest |
| `legal_guide` | Web /legal · PDF descargable · Email |
| `video_script` | HeyGen → TikTok · HeyGen → Instagram Reels |
| `social_post` | Instagram · TikTok · LinkedIn |
| `email_template` | Mailchimp · Brevo · Test email |
| `keyword` | Content Agent brief · SEO meta update |
| `campaign_brief` | Social Media · Content Agent · Email platform |

### Pipeline de publicación por artefacto (tracking visual)
```
blog_post "Guía Inversión Dubai"
  ✅ Web: publicado en /blog/guia-inversion-dubai
  ✅ Email: enviado a 234 suscriptores (Open: 42%)
  🔄 Social: pendiente aprobación post Instagram
  ─  TikTok: no aplica
```

---

## DB Schema

```sql
-- Tabla principal
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50) REFERENCES agents(id),
  type VARCHAR(50) NOT NULL, -- blog_post, property_listing, video_script, faq_entry, etc.
  status VARCHAR(20) DEFAULT 'draft', -- draft, pending_review, approved, rejected, published
  title VARCHAR(500),
  content TEXT,
  metadata JSONB DEFAULT '{}',
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de publicaciones (tracking por canal)
CREATE TABLE artifact_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID REFERENCES artifacts(id) ON DELETE CASCADE,
  destination VARCHAR(50), -- 'web', 'instagram', 'tiktok', 'email', 'developer_portal'
  destination_id VARCHAR(255), -- post_id, campaign_id en el sistema externo
  status VARCHAR(20) DEFAULT 'pending', -- pending, published, failed
  published_at TIMESTAMP,
  metrics JSONB DEFAULT '{}' -- open_rate, views, engagement, etc.
);

-- Tabla de cross-agent handoffs
CREATE TABLE artifact_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID REFERENCES artifacts(id) ON DELETE CASCADE,
  from_agent_id VARCHAR(50) REFERENCES agents(id),
  to_agent_id VARCHAR(50) REFERENCES agents(id),
  instruction TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed
  completed_at TIMESTAMP
);

CREATE INDEX ON artifacts(agent_id, status);
CREATE INDEX ON artifacts(type, status);
CREATE INDEX ON artifact_publications(artifact_id);
CREATE INDEX ON artifact_handoffs(to_agent_id, status);
```

---

## Tipos de artefacto soportados
`blog_post` · `property_listing` · `email_template` · `video_script` · `social_post` · `avatar_brief` · `content_calendar` · `campaign_brief` · `positioning_doc` · `gtm_strategy` · `channel_report` · `report` · `kpi_snapshot` · `funnel_analysis` · `market_benchmark` · `cohort_analysis` · `faq_entry` · `legal_guide` · `investor_brief` · `regulatory_alert` · `page_design` · `component` · `template` · `mockup` · `brand_audit_report` · `feature` · `bug_fix` · `migration` · `deployment` · `scrape_job` · `dataset` · `dedup_report` · `data_quality_report` · `keyword` · `seo_audit` · `meta_tag` · `structured_data` · `prd` · `sprint` · `user_story` · `roadmap` · `audit_report` · `intelligence_report`

---

## Fases y tareas

### Fase 1 — DB + API Base
- [ ] Migración SQL: tablas `artifacts`, `artifact_publications`, `artifact_handoffs`
- [ ] `GET /api/artifacts?agent_id=&type=&status=&limit=&offset=`
- [ ] `POST /api/artifacts`
- [ ] `PATCH /api/artifacts/:id/status` (con notificación Telegram en pending_review)
- [ ] `PATCH /api/artifacts/:id`
- [ ] `DELETE /api/artifacts/:id`
- [ ] `POST /api/artifacts/:id/publish` — publica a canal externo especificado
- [ ] `POST /api/artifacts/:id/handoff` — handoff a otro agente
- [ ] Crear `tools/db/save_artifact.js` — tool para agentes
- [ ] Crear `tools/db/publish_artifact.js` — tool para publicar a canales externos

### Fase 2 — Infraestructura Workspace + Componentes Base
- [ ] `ArtifactWorkspace.jsx` — base compartida (header, filtros, stats, estado vacío, skeleton)
- [ ] `ArtifactCard.jsx` — card genérica con acciones contextuales
- [ ] `PublishMenu.jsx` — menú "Enviar a..." con destinos por tipo de artefacto
- [ ] `ArtifactPreviewModal.jsx` — preview rich text / iframe / imagen
- [ ] `PublicationTracker.jsx` — pipeline visual de publicación por artefacto
- [ ] Añadir tab "Workspace" en `AgentDetail.jsx` con routing por `agent.department`

### Fase 3 — Workspaces Piloto (Content + Social)
- [ ] `ContentWorkspace.jsx` — grid + wizard de generación + acciones completas
- [ ] `SocialWorkspace.jsx` — calendario drag&drop + panel de script + métricas

### Fase 4 — Workspaces Core (Marketing + Analytics + Legal)
- [ ] `MarketingWorkspace.jsx` — campañas + channel performance + Gantt
- [ ] `AnalyticsWorkspace.jsx` — KPI cards + funnel + property performance + reports
- [ ] `LegalWorkspace.jsx` — FAQ bank + alertas regulatorias + guías versionadas

### Fase 5 — Workspaces Técnicos (Design + Dev + Data + SEO + PM)
- [ ] `DesignWorkspace.jsx` — galería + design system panel + screenshot comparison
- [ ] `DevWorkspace.jsx` — kanban + system health + deploy pipeline
- [ ] `DataWorkspace.jsx` — scraping jobs en tiempo real + dataset table
- [ ] `SeoWorkspace.jsx` — keyword matrix + site audit + meta tags manager
- [ ] `PmWorkspace.jsx` — sprint activo + roadmap + PRDs

### Fase 6 — Workspaces Ops + QA + Polish
- [ ] `WatAuditorWorkspace.jsx` — score global + audit reports + issues
- [ ] `ResearchWorkspace.jsx` — intelligence feed + source monitor + action items
- [ ] Seed de artefactos de prueba por tipo/agente
- [ ] Estados vacíos por workspace (empty states con CTA)
- [ ] Skeletons de carga + toast notifications
- [ ] Badges de count en tabs
- [ ] Revisión de consistencia visual cross-workspace

### Fase 7 — Integraciones Externas
- [ ] Integración Instagram Graph API (publish + schedule)
- [ ] Integración HeyGen API (generar vídeo desde script)
- [ ] Integración Email platform (Mailchimp o Brevo)
- [ ] Notificaciones Telegram al pasar a `pending_review`
- [ ] Deploy pipeline con Vercel API

### Fase 8 — RAG Pinecone + Gemini (post-MVP)
- [ ] Embedear artefactos con Gemini multimodal al guardar
- [ ] Guardar `pinecone_id` en `metadata`
- [ ] Búsqueda semántica dentro de cada workspace
- [ ] Soporte multimodal (imágenes, vídeos, documentos)

---

## Archivos clave
- `apps/dashboard/server.js` — endpoints /api/artifacts + /publish + /handoff
- `apps/dashboard/src/pages/AgentDetail.jsx` — añadir tab Workspace con routing por dept
- `apps/dashboard/src/components/workspace/` — 17 componentes (5 base + 12 por agente)
- `tools/db/save_artifact.js` — tool para crear/actualizar artefactos desde agentes
- `tools/db/publish_artifact.js` — tool para publicar a canales externos

---

## Post-MVP / Hoja de Ruta
- Email Marketing Workspace completo (cuando se cree el Email Agent en Q2 2026)
- Historial y versioning de artefactos con diff visual
- Métricas cruzadas: tasa de aprobación, tiempo de revisión por agente
- A/B testing visual desde Design Workspace con métricas de conversión
- Kanban alternativo para Social Workspace (en lugar de calendario)
- Dashboard financiero para Finance Agent (cuando sea creado en Q3 2026)
- Media Buyer Workspace — grid de ad creatives con CTR/CPC/ROAS
- Analytics de workspaces: qué agente genera más artefactos aprobados, tasa de rechazo
