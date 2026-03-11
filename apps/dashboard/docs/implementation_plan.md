# Plan: Workspace en Produccion Real

> Auditado y reescrito el 4 de marzo de 2026 tras revision completa del codigo.

## Estado Actual (Post-Auditoria)

**Construido y funcional:**
- Schema SQL con 6 tablas nuevas: `agents`, `eod_reports`, `weekly_sessions`, `audit_log`, `collaboration_raises`, `raw_events`
- 8 paginas React con UI completo (mock data)
- Layout con sidebar + React Router
- 4 scripts en `tools/workspace-skills/` (harvester, eod-generator, standup-consolidator, nightly)

**Pendiente (lo que faltaba por conectar):**
- `server.js` no tiene endpoints de workspace (solo CRUD de proyectos)
- Frontend importa todo de `mockData.js`, sin fetch al backend
- `eod-generator.js` tiene logica mock, no real
- 4 pools de conexion DB separados (deberia ser 1 compartido)
- Puerto DB inconsistente (server.js usa 5433, workspace-skills usan 5432)

---

## Fase 1: Infraestructura Base

**Objetivo:** Pool compartido, datos iniciales, bugs corregidos.

| Tarea | Archivo | Estado |
|-------|---------|--------|
| Crear pool DB singleton | `tools/db/pool.js` | - |
| Refactorizar workspace-skills para usar pool compartido | `tools/workspace-skills/*.js` | - |
| Script seed de agentes | `tools/db/seed_agents.js` | - |
| Verificar Docker + schema aplicado | `docker-compose.yml` + `tools/db/schema.sql` | - |

---

## Fase 2: API Backend (extender server.js)

**Objetivo:** Endpoints reales para las 8 paginas del workspace.

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/agents` | GET | Lista todos los agentes con stats |
| `/api/agents/:id` | GET | Detalle con skills/tools/EOD history |
| `/api/departments` | GET | Lista departamentos con health y stats |
| `/api/departments/:id` | GET | Agentes del depto + metricas |
| `/api/weekly-sessions` | GET | Historial de weeklies (filtro: dept) |
| `/api/weekly-sessions` | POST | Crear nueva weekly |
| `/api/weekly-sessions/:id` | GET | Detalle con ideas/decisions |
| `/api/eod-reports` | GET | Reports por depto y fecha |
| `/api/eod-reports/agent/:id` | GET | Historico de un agente |
| `/api/eod-reports` | POST | Crear/upsert report |
| `/api/escalations` | GET | Todos los raises (filtrable) |
| `/api/escalations` | POST | Crear raise |
| `/api/escalations/:id` | PATCH | Cambiar status |
| `/api/audit-events` | GET | Log filtrado por dept/type |
| `/api/intelligence/summary` | GET | Metricas agregadas |

**Patron:** Cada mutacion inserta automaticamente en `audit_log`.

---

## Fase 3: Migrar Frontend de Mock a API

**Objetivo:** Las 8 paginas hacen fetch() real.

| Pagina | Archivo | Endpoint(s) |
|--------|---------|-------------|
| WorkspaceOverview | `src/pages/WorkspaceOverview.jsx` | GET /api/agents, /api/departments |
| DepartmentDetail | `src/pages/DepartmentDetail.jsx` | GET /api/departments/:id |
| AgentDetail | `src/pages/AgentDetail.jsx` | GET /api/agents/:id |
| WeeklyBoard | `src/pages/WeeklyBoard.jsx` | GET /api/weekly-sessions?dept=X |
| DailyStandup | `src/pages/DailyStandup.jsx` | GET /api/eod-reports?dept=X&date=Y |
| CollaborationHub | `src/pages/CollaborationHub.jsx` | GET /api/escalations |
| AuditLog | `src/pages/AuditLog.jsx` | GET /api/audit-events |
| IntelligenceHub | `src/pages/IntelligenceHub.jsx` | GET /api/intelligence/summary |

Al completar: eliminar `src/data/mockData.js`.

---

## Fase 4: Acciones de Escritura en UI

| Pagina | Accion | Endpoint |
|--------|--------|----------|
| WeeklyBoard | Nueva weekly + agregar ideas | POST /api/weekly-sessions |
| DailyStandup | Crear EOD report | POST /api/eod-reports |
| CollaborationHub | Nuevo raise + cambiar status | POST + PATCH /api/escalations |
| AgentDetail | Editar status agente | PATCH /api/agents/:id |

---

## Fase 5: Skills Operativas Reales

| Skill | Archivo | Descripcion |
|-------|---------|-------------|
| weekly-brainstorm | `.claude/skills/weekly-brainstorm/SKILL.md` | PM Agent facilita weekly interactiva |
| eod-report | `.claude/skills/eod-report/SKILL.md` | Genera EOD report basado en actividad |
| Mejorar eod-generator | `tools/workspace-skills/eod-generator.js` | Reemplazar mock por logica real |
| Integrar harvester | `tools/workspace-skills/activity-harvester.js` | Hook en skills existentes |

---

## Verificacion End-to-End

1. `docker compose up -d`
2. `node tools/db/init_db.js`
3. `node tools/db/seed_agents.js`
4. `npm run dashboard:server` (API en :3001)
5. `npm run dashboard:dev` (Frontend en :5173)
6. /workspace muestra departamentos con datos reales
7. Click en depto Data muestra agentes de DB
8. Crear weekly session desde UI
9. `node tools/workspace-skills/workflow-nightly.js` genera EOD reports
10. /workspace/data/daily muestra datos generados

---

## Decisiones Arquitecturales

- **NO Redis.** PostgreSQL es suficiente a esta escala. Polling o LISTEN/NOTIFY si se necesita "real-time".
- **NO workers en containers separados.** Scripts Node.js invocados via cron o Claude Code.
- **NO API nuevo.** Se extiende el `server.js` existente que ya tiene CRUD de proyectos.
- **Primero lo basico, despues inteligencia.** No optimizar costes ni forecasting hasta que el ciclo weekly->daily->audit funcione end-to-end.
