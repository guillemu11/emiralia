---
status: completed
owner: gmunoz02
start-date: 2026-03-13
completed-date: 2026-03-14
eta: 2026-03-14
blockers: []
dependencies: []
---

# Plan: Proyecto #28 — Research Agent + WAT Auditor Intelligence Layer + Skills 2.0

## Context

El stack de Emiralia no tiene visibilidad de cambios externos (Anthropic docs, Claude Code updates, comunidad). Esto puede dejarlo desactualizado respecto a mejores prácticas y nuevas capacidades. Este proyecto crea un **Research Agent** que monitorea fuentes externas semanalmente y alimenta al **WAT Auditor** con inteligencia externa para sus auditorías.

Además, se aprovecha para adoptar **Skills 2.0** de Claude Code: `context: fork`, inyección dinámica con `!backticks`, `allowed-tools`, y `model` — tanto en los skills nuevos como en la migración de los existentes más críticos.

---

## Arquitectura

```
tools/research-agent/
  fetch-anthropic-changelog.js   ← Anthropic changelog (axios)
  fetch-github-releases.js       ← Claude Code releases (GitHub API)
  fetch-community.js             ← Reddit r/ClaudeAI (JSON API público)
  relevance-filter.js            ← Scoring por keywords + clasificación impacto
  orchestrator.js                ← Orquestador principal: fetch → filter → persist
```

**Decisiones clave:**
- Fetchers individuales + 1 orquestador (patrón existente de `workflow-nightly.js`)
- Reutilizar `save_research.js` para persistencia en `pm_reports`
- Reutilizar `memory.js` para checkpoints (dedup entre runs)
- WAT Auditor consume inteligencia via `wat-memory.js` (shared keys del Research Agent)
- Novedades externas solo generan **Suggestions** (-1 pt), nunca Critical

### Skills 2.0 — Features a adoptar

| Feature | Dónde se aplica | Beneficio |
|---------|----------------|-----------|
| `context: fork` | `/research-monitor`, `/wat-audit` | Ejecución aislada, no contamina contexto principal |
| `!backticks` | `/research-monitor`, `/wat-audit`, `/consultas-sql` | Inyecta estado de DB/memoria antes de que Claude vea el prompt |
| `allowed-tools` | `/research-monitor`, `/wat-audit`, `/consultas-sql`, `/traducir` | Restringe tools por seguridad (ej: consultas-sql no puede Edit) |
| `model` | `/research-monitor` → haiku, `/wat-audit` → sonnet, skills estratégicos → opus | Optimiza costo sin sacrificar calidad donde importa |
| Frontmatter estándar | Todos los skills nuevos + migración de 6 existentes | Claude Code interpreta restricciones nativamente |

---

## Archivos a crear (8)

| # | Archivo | Propósito |
|---|---------|-----------|
| 1 | `.claude/agents/ops/research-agent.md` | Definición del agente (misión, tools, memory keys) |
| 2 | `.claude/skills/ops/research-monitor/SKILL.md` | Skill `/research-monitor` **con Skills 2.0** |
| 3 | `tools/research-agent/fetch-anthropic-changelog.js` | Fetcher Anthropic changelog |
| 4 | `tools/research-agent/fetch-github-releases.js` | Fetcher GitHub releases |
| 5 | `tools/research-agent/fetch-community.js` | Fetcher Reddit r/ClaudeAI |
| 6 | `tools/research-agent/relevance-filter.js` | Filtro de relevancia por keywords |
| 7 | `tools/research-agent/orchestrator.js` | Orquestador principal |
| 8 | `tools/workspace-skills/workflow-weekly.js` | Scheduler semanal |

## Archivos a modificar (4 + 6 migración Skills 2.0)

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `tools/db/seed_agents.js` | Añadir research-agent al array de agentes |
| 2 | `.claude/skills/ops/wat-audit/SKILL.md` | Paso 1b + check 2e + **migrar a Skills 2.0** (fork, !backticks, allowed-tools) |
| 3 | `.claude/agents/ops/wat-auditor-agent.md` | Referenciar Research Agent como fuente de input |
| 4 | `.claude/CLAUDE.md` | Añadir Research Agent + documentar convenciones Skills 2.0 |
| 5 | `.claude/skills/data/propertyfinder-scraper/SKILL.md` | **Skills 2.0**: `context: fork` + `allowed-tools` |
| 6 | `.claude/skills/data/consultas-sql/SKILL.md` | **Skills 2.0**: `!backticks` schema + `allowed-tools` (sin Edit) + `model: haiku` |
| 7 | `.claude/skills/content/traducir/SKILL.md` | **Skills 2.0**: `allowed-tools` (solo Read, Edit, Bash) |
| 8 | `.claude/skills/design/ui-ux-pro-max/SKILL.md` | **Skills 2.0**: `context: fork` (pesado) |
| 9 | `.claude/skills/ejecucion/crear-prd/SKILL.md` | **Skills 2.0**: `context: fork` + `model: opus` |
| 10 | `.claude/skills/ops/activity-tracking/SKILL.md` | **Skills 2.0**: `model: haiku` (task ligera) |

---

## Plan de ejecución (21 tareas, 4 fases)

### Fase 1: Crear Research Agent (tareas 1-8)

**T1. Registrar Research Agent en DB** `[S]`
- Añadir entry en `tools/db/seed_agents.js`:
  ```js
  { id: 'research-agent', name: 'Research Agent', role: 'Monitorea fuentes externas...',
    department: 'ops', avatar: '🔬', status: 'active', skills: ['research-monitor'],
    tools: ['memory', 'wat-memory'] }
  ```
- Ejecutar `node tools/db/seed_agents.js`

**T2. Crear archivo de agente** `[S]`
- Crear `.claude/agents/ops/research-agent.md` con: misión, personalidad, skills, tools, memory keys, fuentes monitoreadas, reglas operativas

**T3. Fetcher Anthropic Changelog** `[M]` (paralelo con T4, T5)
- `tools/research-agent/fetch-anthropic-changelog.js`
- Usa `axios` para fetch de `https://docs.anthropic.com/en/docs/about-claude/models` y changelog
- Parsea HTML buscando patrones de fecha + título
- Acepta `lastProcessedDate` para dedup
- Retorna `[{title, date, summary, source, url}]`

**T4. Fetcher GitHub Releases** `[M]` (paralelo con T3, T5)
- `tools/research-agent/fetch-github-releases.js`
- GitHub API: `https://api.github.com/repos/anthropics/claude-code/releases`
- Sin auth necesaria (repo público), opcional `GITHUB_TOKEN` para rate limits
- Acepta `lastProcessedTag` para dedup
- Retorna `[{title, date, summary, source, url, tag}]`

**T5. Fetcher Comunidad** `[L]` (paralelo con T3, T4)
- `tools/research-agent/fetch-community.js`
- Reddit JSON API: `https://www.reddit.com/r/ClaudeAI/hot.json` (sin auth)
- Filtro mínimo: score >= 5
- Acepta `lastPostId` para dedup
- Fuente secundaria: fallo no bloquea el ciclo

**T6. Filtro de Relevancia** `[M]` (depende de T3-T5)
- `tools/research-agent/relevance-filter.js`
- Keywords con pesos: `claude code: 10`, `mcp: 9`, `anthropic: 8`, `tool use: 8`, `agents: 6`, etc.
- Boost por fuente: GitHub/Anthropic +5
- Clasificación: high (>=15), medium (>=8), low (<8)
- Umbral mínimo: score >= 3 para incluir
- Retorna entries enriquecidos con `relevance_score`, `impact`, `matched_keywords`

**T7. Output Estructurado** `[M]` (integrado en T8)
- Formato JSON del informe: `{generated_at, sources_checked, sources_status, total_raw, total_filtered, novelties[], summary{high, medium, low}}`
- Generador de Markdown para persistencia en `pm_reports`

**T8. Orquestador + Persistencia** `[M]` (depende de T3-T7)
- `tools/research-agent/orchestrator.js`
- Importa fetchers + filter + `memory.js` + `save_research.js`
- Flujo: leer checkpoints → fetch all → filter → build report → persist → update memory
- Ejecutable CLI: `node tools/research-agent/orchestrator.js`
- Manejo graceful de errores por fuente (partial results)

### Fase 2: Integración WAT Auditor (tareas 9-13)

**T9. Revisar flujo WAT Auditor** `[S]`
- Punto de inyección: entre Paso 1 (inventario) y Paso 2 (checks) del SKILL.md
- Nueva sección: "Paso 1b: Cargar Inteligencia Externa"

**T10. Implementar lector en WAT Auditor** `[M]`
- Modificar `.claude/skills/ops/wat-audit/SKILL.md`
- Añadir Paso 1b: consultar `wat-memory.js check research-agent latest_research_report`
- Si no hay datos: anotar Suggestion y continuar sin contexto externo

**T11. Actualizar prompt WAT Auditor** `[M]`
- Añadir check "2e. External Intelligence Cross-Reference" al SKILL.md
- Para cada novedad high/medium: evaluar impacto en WAT
- Reglas: solo Suggestions (-1), excepto breaking changes → Warning (-3)
- Añadir sección "Inteligencia Externa" al template del informe (Paso 4)

**T12. Crear scheduler semanal** `[M]`
- `tools/workspace-skills/workflow-weekly.js`
- Invoca `runResearchCycle()` y registra en `workflow_runs`
- Nota: WAT Audit se invoca manualmente post-research via `/wat-audit`

**T13. Verificación end-to-end** `[S]`
1. `node tools/research-agent/orchestrator.js` → sin errores
2. Verificar `pm_reports` tiene nuevo entry
3. `node tools/db/memory.js list research-agent` → keys populated
4. `node tools/db/wat-memory.js check research-agent latest_research_report` → datos visibles
5. Ejecutar `/wat-audit` → sección "Inteligencia Externa" aparece

### Fase 3: Validación y Calidad (tareas 14-17)

**T14. Primer run manual** `[S]`
- Ejecutar orchestrator, evaluar ratio señal/ruido (target: >70% relevante)

**T15. Ajustar filtro de relevancia** `[S]`
- Tunear keywords, pesos y umbrales según resultados del primer run

**T16. Revisar reporte WAT Auditor** `[S]`
- Confirmar que sección externa aporta valor sin romper el flujo existente

**T17. Documentar Research Agent** `[S]`
- Actualizar CLAUDE.md: añadir agente a tabla "Operaciones" y skill a tabla "Operacionales (ops/)"

### Fase 4: Migración Skills 2.0 (tareas 18-21)

**T18. Nuevo skill `/research-monitor` con frontmatter Skills 2.0** `[M]`
- Frontmatter completo:
  ```yaml
  ---
  name: research-monitor
  description: >
    Ejecuta ciclo de monitoreo de fuentes externas (Anthropic, GitHub, Reddit).
    Genera intelligence report clasificado por impacto para el WAT Auditor.
  agent: Research Agent
  context: fork
  model: haiku
  allowed-tools:
    - Bash
    - Read
    - Grep
    - Glob
  ---
  ```
- Inyección dinámica de contexto:
  ```markdown
  ## Estado actual del Research Agent
  !`node tools/db/memory.js list research-agent`
  ## Último informe
  !`node tools/db/wat-memory.js check research-agent last_monitor_at`
  ```

**T19. Migrar `/wat-audit` a Skills 2.0** `[M]`
- Añadir al frontmatter existente:
  ```yaml
  context: fork
  model: sonnet
  allowed-tools:
    - Bash
    - Read
    - Grep
    - Glob
    - Write
  ```
- Añadir inyección dinámica:
  ```markdown
  ## Estado actual de agentes
  !`node tools/db/wat-memory.js status`
  ## Último research report
  !`node tools/db/wat-memory.js check research-agent latest_research_report`
  ```

**T20. Migrar 4 skills existentes a Skills 2.0** `[M]` (paralelo con T18-T19)
- `/propertyfinder-scraper`: añadir `context: fork` + `allowed-tools: [Bash, Read, Grep]`
- `/consultas-sql`: añadir `model: haiku` + `allowed-tools: [Bash, Read, Grep]` (sin Edit/Write) + inyección:
  ```markdown
  ## Schema actual
  !`node tools/db/query_properties.js schema`
  ## Estado del agente
  !`node tools/db/memory.js list data-agent`
  ```
- `/traducir`: añadir `allowed-tools: [Read, Edit, Bash, Grep]`
- `/ui-ux-pro-max`: añadir `context: fork` (skill pesado en contexto)

**T21. Migrar 2 skills estratégicos a Skills 2.0** `[S]` (paralelo con T20)
- `/crear-prd`: añadir `context: fork` + `model: opus`
- `/activity-tracking`: añadir `model: haiku`

---

## Orden de ejecución (paralelismo)

```
T1 + T2 (paralelo) ──────────────────┐
T3 + T4 + T5 (paralelo entre sí) ────┤
T6 (depende de T3-T5) ───────────────┤
T7 + T8 (depende de T6) ─────────────┤
                                      ├─→ T12 (scheduler)
T9 (puede empezar paralelo a T3-T8) ─┤
T10 (depende de T8 + T9) ────────────┤
T11 (depende de T10) ────────────────┤
T13 (depende de T8 + T11 + T12) ─────┤
T14 (depende de T13) ────────────────┤
T15 (depende de T14) ────────────────┤
T16 (depende de T11 + T14) ──────────┤
T17 (depende de todo Fases 1-3) ─────┤
                                      │
T18 (paralelo a Fase 1, skill nuevo) ┤
T19 (depende de T10-T11) ────────────┤  ← Fase 4: Skills 2.0
T20 + T21 (paralelo, independientes) ┘
```

---

## Verificación

1. **Unit**: Cada fetcher retorna array válido (incluso vacío si fuente falla)
2. **Integration**: `node tools/research-agent/orchestrator.js` completa sin errores
3. **DB**: `pm_reports` tiene nuevo registro, `agent_memory` tiene keys del research-agent
4. **WAT Memory**: `node tools/db/wat-memory.js check research-agent latest_research_report` retorna datos
5. **WAT Audit**: `/wat-audit` muestra sección "Inteligencia Externa" cuando hay datos
6. **Calidad**: Ratio señal/ruido del primer run > 70%
7. **Skills 2.0**: Verificar que skills migrados tienen frontmatter YAML válido con `context`, `model`, `allowed-tools`
8. **Skills 2.0 - Fork**: `/research-monitor` y `/wat-audit` se ejecutan en contexto aislado (fork)
9. **Skills 2.0 - Inyección**: `/consultas-sql` inyecta schema real antes de la ejecución

---

## Dependencias externas

- `axios` (ya instalado en package.json)
- GitHub API pública (sin auth para repos públicos)
- Reddit JSON API pública (sin auth)
- PostgreSQL local (docker-compose, puerto 5433)

---

## Progreso de ejecucion

**Estado: COMPLETADO** (2026-03-09)

### Tareas completadas (21/21)

| Tarea | Estado | Notas |
|-------|--------|-------|
| T1. Registrar Research Agent en DB | DONE | Anadido a `seed_agents.js`, 7 agentes en DB |
| T2. Crear archivo de agente | DONE | `.claude/agents/ops/research-agent.md` |
| T3. Fetcher Anthropic Changelog | DONE | `tools/research-agent/fetch-anthropic-changelog.js` |
| T4. Fetcher GitHub Releases | DONE | `tools/research-agent/fetch-github-releases.js` |
| T5. Fetcher Comunidad | DONE | `tools/research-agent/fetch-community.js` |
| T6. Filtro de Relevancia | DONE | `tools/research-agent/relevance-filter.js` |
| T7-T8. Orquestador + Persistencia | DONE | `tools/research-agent/orchestrator.js` |
| T9. Revisar flujo WAT Auditor | DONE | Punto de inyeccion identificado |
| T10. Implementar lector en WAT Auditor | DONE | Paso 1b anadido al SKILL.md |
| T11. Actualizar prompt WAT Auditor | DONE | Check 2e + seccion Inteligencia Externa |
| T12. Scheduler semanal | DONE | `tools/workspace-skills/workflow-weekly.js` |
| T13. Verificacion end-to-end | DONE | Orchestrator OK, 30/33 entries, memoria OK |
| T14-T16. Validacion y calidad | DONE | Ratio senal/ruido: 90% (30/33) |
| T17. Documentar en CLAUDE.md | DONE | Research Agent + skill + Skills 2.0 conventions |
| T18. Skill /research-monitor | DONE | Skills 2.0: fork, haiku, allowed-tools, !backticks |
| T19. Migrar /wat-audit | DONE | Skills 2.0: fork, sonnet, allowed-tools, !backticks |
| T20. Migrar 4 skills | DONE | propertyfinder, consultas-sql, traducir, ui-ux-pro-max |
| T21. Migrar 2 skills estrategicos | DONE | crear-prd (opus, fork), activity-tracking (haiku) |

### Primer run (verificacion T13-T14)
```
Raw entries: 33 (Anthropic=2, GitHub=10, Reddit=21)
Filtered: 30 (high=15, medium=5, low=10)
Ratio senal/ruido: 90.9% (target >70%)
Sources: all OK
Report ID: 6 en pm_reports
Memoria: 9 keys pobladas
WAT Memory: latest_research_report visible cross-agente
```

### Ultima parada
**Proyecto completado.** Todas las 21 tareas de las 4 fases estan terminadas y verificadas.
