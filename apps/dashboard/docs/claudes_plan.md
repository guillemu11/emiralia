# Claude’s Plan
## Plan: Fases 4 y 5 del Workspace

### Contexto
Las fases 1-3 estan completas: el backend tiene todos los endpoints (GET + POST + PATCH), las 8 paginas React hacen fetch real a la API, y la infra DB funciona. Lo que falta es:

- **Fase 4**: Las paginas UI no tienen formularios/modales para crear o editar datos (solo lectura).
- **Fase 5**: No existen las skills `weekly-brainstorm` ni `eod-report` como `SKILL.md` invocables.

---

### Fase 4: Acciones de Escritura en UI

#### 4.1 WeeklyBoard — Boton "Nueva Weekly"
**Archivo**: `apps/dashboard/src/pages/WeeklyBoard.jsx`
- Agregar boton "Nueva Weekly" en la vista de lista (junto al empty state)
- Modal/formulario inline con campos:
  - `week_number` (auto: ISO week actual)
  - `session_date` (default: hoy)
- **Al submit**: `POST /api/weekly-sessions` con `{ department: deptId, week_number, session_date, steps_data: {}, final_projects: [] }`
- **Tras exito**: refrescar lista de weeklies y mostrar la nueva

#### 4.2 DailyStandup — Boton "Crear EOD Report"
**Archivo**: `apps/dashboard/src/pages/DailyStandup.jsx`
- Agregar boton "Nuevo EOD Report" en la vista de reports
- Modal con campos:
  - `agent_id` (select de agentes del departamento — fetch `/api/agents?department=X`)
  - `mood` (select: productive, focused, creative, blocked, neutral)
  - `completed_tasks` (textarea, una tarea por linea)
  - `blockers` (textarea, uno por linea)
  - `insights` (textarea, uno por linea)
- **Al submit**: `POST /api/eod-reports` con datos formateados
- **Tras exito**: refrescar lista de reports

#### 4.3 CollaborationHub — "Nuevo Raise" + Cambiar Status
**Archivo**: `apps/dashboard/src/pages/CollaborationHub.jsx`
- **Nuevo Raise**: Boton "Nuevo Raise" en el header
  - Modal con: `from_dept` (select), `to_dept` (select), `title`, `reason`, `priority` (select: high/medium/normal/low)
  - **Submit**: `POST /api/escalations`
  - Refrescar lista
- **Cambiar Status**: En cada tarjeta de raise, dropdown para cambiar status (`pending` → `in-progress` → `resolved`)
  - `PATCH /api/escalations/:id` con `{ status }`
  - Actualizar estado local sin reload completo

#### 4.4 AgentDetail — Editar Status
**Archivo**: `apps/dashboard/src/pages/AgentDetail.jsx`
- En el badge de status actual, agregar click handler o dropdown
- Opciones: `active`, `idle`, `offline`
- `PATCH /api/agents/:id` con `{ status }`
- Actualizar estado local

---

### Fase 5: Skills Operativas Reales

#### 5.1 Skill: `weekly-brainstorm`
**Archivo nuevo**: `.claude/skills/weekly-brainstorm/SKILL.md`
- Skill invocable por PM Agent (o manualmente con `/weekly-brainstorm data`) que:
  - Recibe departamento como argumento
  - Consulta agentes del departamento via `tools/db/pool.js`
  - Facilita un brainstorm estructurado en pasos (context, ideas, prioritization, decisions)
  - Persiste la sesion via `POST /api/weekly-sessions` (o directamente en DB)
  - Registra en `audit_log`

#### 5.2 Skill: `eod-report`
**Archivo nuevo**: `.claude/skills/eod-report/SKILL.md`
- Skill que genera EOD report para un agente:
  - Recibe `agentId` como argumento
  - Consulta `raw_events` del dia via `tools/workspace-skills/activity-harvester.js`
  - Usa `tools/workspace-skills/eod-generator.js` para generar el report
  - Persiste automaticamente en DB

#### 5.3 Mejorar `eod-generator.js`
**Archivo**: `tools/workspace-skills/eod-generator.js`
- Reemplazar la logica rule-based por un resumen mas inteligente:
  - Agrupar eventos por tipo (`tool_call`, `task_complete`, `error`)
  - Generar `plan_tomorrow` basado en tareas `in-progress`
  - Calcular `mood` de forma mas granular (`productive` si >3 completed, `creative` si hay insights, etc.)
- **NO** agregar LLM call (mantener determinista como indica `CLAUDE.md`: "Tools = Scripts deterministas")

#### 5.4 Integrar harvester en skills existentes
**Archivo**: `tools/workspace-skills/activity-harvester.js`
- Exportar una funcion helper `withActivityTracking(agentId, fn)` que:
  - Registra evento `skill_start` al inicio
  - Ejecuta la funcion
  - Registra evento `skill_complete` o `skill_error` al final
- Documentar como integrarlo en skills existentes (`propertyfinder-scraper`, `pm-challenge`)

---

### Archivos a modificar/crear

| Archivo | Accion |
| :--- | :--- |
| `apps/dashboard/src/pages/WeeklyBoard.jsx` | Agregar formulario nueva weekly |
| `apps/dashboard/src/pages/DailyStandup.jsx` | Agregar formulario nuevo EOD |
| `apps/dashboard/src/pages/CollaborationHub.jsx` | Agregar form nuevo raise + status toggle |
| `apps/dashboard/src/pages/AgentDetail.jsx` | Agregar status toggle |
| `.claude/skills/weekly-brainstorm/SKILL.md` | Crear skill |
| `.claude/skills/eod-report/SKILL.md` | Crear skill |
| `tools/workspace-skills/eod-generator.js` | Mejorar logica de resumen |
| `tools/workspace-skills/activity-harvester.js` | Agregar `withActivityTracking` |

---

### Verificacion
1. Levantar backend: `node apps/dashboard/server.js`
2. Levantar frontend: `npm run dashboard:dev`
3. Ir a `/workspace/data/weekly` → crear nueva weekly → verificar que aparece en lista
4. Ir a `/workspace/data/daily` → crear EOD report → verificar en board
5. Ir a `/workspace/collaboration` → crear raise → cambiar status → verificar
6. Ir a `/workspace/agent/scraper-ralph` → cambiar status → verificar badge
7. Verificar que `audit_log` registra todas las acciones
