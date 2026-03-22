---
id: 39
status: Planning
created: 2026-03-22
agents: [dev-agent, frontend-agent]
---

# 039 — Agent Workspaces: Vistas Personalizadas por Agente

## Problema
La interfaz del Agent Chat Console es genérica y no refleja los outputs radicalmente distintos de cada agente (blogs, dashboards, assets financieros). No existe una interfaz para revisar, aprobar o publicar artefactos de forma estructurada. Cada aprobación requiere intervención manual fuera del sistema.

## Solución
Añadir una pestaña **"Workspace"** en `AgentDetail.jsx` que carga una vista personalizada según el agente, mostrando sus artefactos con acciones contextuales (aprobar/rechazar/editar/publicar). Una tabla `artifacts` compartida actúa como fuente de verdad.

**Arquitectura dual (compatible con Pinecone + Gemini en Fase 5):**
- PostgreSQL `artifacts` → CRUD + workflow de aprobación (fuente de verdad)
- Pinecone + Gemini embeddings → capa semántica multimodal (post-MVP)

## Métricas de éxito
- Tabla `artifacts` operativa con datos reales de al menos 2 agentes
- 2 workspaces piloto (Content + Finance) funcionales con aprobar/rechazar/editar
- 8 workspaces desplegados con acciones contextuales completas
- Tiempo de revisión y aprobación de artefactos reducido vs. proceso manual

## Fases y tareas

### Fase 1 — DB + API
- [ ] Crear migración SQL tabla `artifacts` (enums + índices)
- [ ] `GET /api/artifacts?agent_id=&type=&status=&limit=&offset=`
- [ ] `POST /api/artifacts`
- [ ] `PATCH /api/artifacts/:id/status`
- [ ] `PATCH /api/artifacts/:id`
- [ ] `DELETE /api/artifacts/:id`
- [ ] Crear `tools/db/save_artifact.js`

### Fase 2 — Workspaces Piloto (Content + Finance)
- [ ] Crear `apps/dashboard/src/components/workspace/ArtifactWorkspace.jsx` (base)
- [ ] Crear `apps/dashboard/src/components/workspace/ContentWorkspace.jsx`
- [ ] Crear `apps/dashboard/src/components/workspace/FinanceWorkspace.jsx`
- [ ] Añadir tab "Workspace" en `apps/dashboard/src/pages/AgentDetail.jsx`

### Fase 3 — 6 Workspaces Restantes
- [ ] `SeoWorkspace.jsx` — keywords con volumen/dificultad/intención
- [ ] `SocialWorkspace.jsx` — grid galería con overlay status
- [ ] `EmailWorkspace.jsx` — lista templates + preview HTML iframe
- [ ] `AnalyticsWorkspace.jsx` — KPI cards + sparklines
- [ ] `CroWorkspace.jsx` — A/B side-by-side + métricas conversión
- [ ] `MediaBuyerWorkspace.jsx` — grid ad creatives + CTR/CPC/ROAS

### Fase 4 — QA, Seed Data y Polish
- [ ] Seed de artefactos de prueba por tipo/agente
- [ ] Integrar Content Agent y Finance Agent con `save_artifact.js`
- [ ] Estados vacíos por workspace
- [ ] Skeletons de carga + toast notifications
- [ ] Revisión consistencia visual cross-workspace

### Fase 5 — RAG Pinecone + Gemini (post-MVP)
- [ ] Embedear artefactos con Gemini multimodal al guardar
- [ ] Guardar `pinecone_id` en `metadata`
- [ ] Búsqueda semántica en workspaces
- [ ] Soporte multimodal (imágenes, vídeos, documentos)

## Archivos clave
- `apps/dashboard/server.js` — añadir endpoints /api/artifacts
- `apps/dashboard/src/pages/AgentDetail.jsx` — añadir tab Workspace
- `apps/dashboard/src/components/workspace/` — 9 componentes nuevos
- `tools/db/save_artifact.js` — tool para agentes

## Tipos de artefacto soportados
`blog_post` · `email_template` · `social_asset` · `finance_entry` · `report` · `keyword` · `ad_creative` · `ab_test`

## Post-MVP / Hoja de Ruta
- Push automático a web/CMS cuando artefacto `blog_post` se aprueba
- Diseño visual diferenciado por workspace (Kanban para Social, tabla financiera para Finance)
- Historial y versioning de artefactos con diff visual
- Métricas cruzadas: tasa de aprobación, tiempo de revisión por agente
- Notificaciones Telegram cuando artefacto pasa a `pending_review`