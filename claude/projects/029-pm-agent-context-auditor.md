---
status: completed
owner: gmunoz02
start-date: 2026-03-14
completed-date: 2026-03-15
eta: 2026-03-15
blockers: []
dependencies: ["028-research-agent-wat-auditor-skills2"]
---

# Plan: Proyecto #029 — PM Agent Context Auditor

## Context

El PM Agent de Emiralia tiene herramientas para construir contexto (`context-builder.js`) pero **no audita si ese contexto es completo, consistente, fresco o realmente usado**. Esto genera decisiones estrategicas basadas en informacion incompleta o desactualizada. El Context Auditor cierra este gap auditando 6 dimensiones del contexto y produciendo un informe accionable con score, siguiendo el mismo modelo de scoring del WAT Audit.

---

## Arquitectura

```
tools/pm-agent/
  audit-checks.js       ← Registro de checks por dimension (pure functions)
  context-auditor.js    ← Orquestador: ejecuta checks, calcula score, genera reporte
  context-builder.js    ← (MODIFICAR) Añadir metadata de freshness al cache

.claude/skills/ejecucion/pm-context-audit/
  SKILL.md              ← Skill invocable /pm-context-audit (Skills 2.0)
```

### 6 Dimensiones de Auditoria

| Dimension | Que audita |
|-----------|-----------|
| **Completitud** | Memory keys pobladas, secciones requeridas en agent .md, BUSINESS_PLAN presente |
| **Consistencia** | Agent .md ↔ DB agents, skills listados ↔ SKILL.md existentes, CLAUDE.md ↔ seed |
| **Frescura** | Age de memory entries, cache estatico sin TTL, ultima auditoria WAT, actividad reciente |
| **Uso** | Skills tracked, WAT Memory consultada, context-builder invocado antes de decisiones |
| **Cross-Proyecto** | Agentes asignados a >2 proyectos activos, conflictos de departamento |
| **Alineacion** | Proyectos fuera de scope UAE, B2C drift, BUSINESS_PLAN desactualizado |

### Scoring (mismo que WAT Audit)
- Base: 100 puntos
- Critical: -10 pts | Warning: -3 pts | Suggestion: -1 pt
- Min: 0 pts

---

## Archivos a crear (3)

| # | Archivo | Proposito |
|---|---------|-----------|
| 1 | `tools/pm-agent/audit-checks.js` | Catalogo de checks por dimension |
| 2 | `tools/pm-agent/context-auditor.js` | Orquestador + CLI |
| 3 | `.claude/skills/ejecucion/pm-context-audit/SKILL.md` | Skill `/pm-context-audit` con Skills 2.0 |

## Archivos a modificar (4)

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `tools/pm-agent/context-builder.js` | Añadir `cacheCreatedAt`, `getCacheAge()`, `getContextStats()` |
| 2 | `.claude/agents/product/pm-agent.md` | Añadir skill + memory keys del auditor |
| 3 | `tools/db/seed_agents.js` | Añadir `'pm-context-audit'` al array de skills del pm-agent |
| 4 | `.claude/CLAUDE.md` | Registrar skill en tabla de Skills disponibles |

---

## Plan de ejecucion (13 tareas, 4 fases)

### Fase 1: Fundacion (T1-T3) — Paralelas

**T1. Crear catalogo de checks (`audit-checks.js`)** `[M]`
- Exporta `getCheckRegistry()` → `Map<dimension, CheckFunction[]>`
- Cada check: `async (pool, rootDir) => Finding[]`
- Finding: `{ severity, dimension, code, message, details, action }`
- Codigos: `COM_xxx`, `CON_xxx`, `FRE_xxx`, `USE_xxx`, `XPR_xxx`, `ALI_xxx`
- Reutilizar `readFileSafe()` y `readDirMarkdown()` de `context-builder.js`

**T2. Crear orquestador (`context-auditor.js`)** `[M]`
- Import: `pool.js`, `audit-checks.js`, `skill-tracker.js`
- Export: `auditPMContext(pool, { dimensions?, freshnessThresholdDays?, verbose? })`
- CLI: `node tools/pm-agent/context-auditor.js [full|completeness|consistency|...]`
- Incluye `trackSkill('pm-agent', 'pm-context-audit', 'ejecucion', 'completed')`
- Output: JSON estructurado con score, grade (A/B/C/D/F), findings por dimension

**T3. Crear SKILL.md** `[S]`
- Frontmatter: `context: fork`, `model: sonnet`, `allowed-tools: [Bash, Read, Grep, Glob]`
- Dynamic context: `!backticks` con `wat-memory.js status`
- Pasos: parsear args → ejecutar audit → formatear → persistir en memoria → mostrar resumen
- Memory: `last_context_audit_at`, `last_context_audit_score`, `context_audit_findings`

### Fase 2: Implementar Checks (T4-T9) — Paralelas (dependen de T1)

**T4. Checks de Completitud** `[M]`
- `COM_001`: Cada agente en DB tiene `last_task_completed` y `last_task_at` como shared keys
- `COM_002`: `context-builder.js` trunca a 10 proyectos / 20 memory → warning si hay mas en DB
- `COM_003`: BUSINESS_PLAN.md existe y tiene seccion "Estado Actual vs Vision"
- `COM_004`: Cada agent .md tiene secciones requeridas (mision, tools, memory keys)

**T5. Checks de Consistencia** `[M]`
- `CON_001`: Agent .md en `.claude/agents/` ↔ fila en tabla `agents`
- `CON_002`: Skills listados en agent .md ↔ SKILL.md existente en `.claude/skills/`
- `CON_003`: Skills/tools en `seed_agents.js` ↔ lo documentado en agent .md
- `CON_004`: Conteo de agentes en CLAUDE.md ↔ `seed_agents.js` ↔ DB

**T6. Checks de Frescura** `[M]`
- `FRE_001`: Shared memory entries con `updated_at` > threshold (default 7 dias)
- `FRE_002`: Cache estatico sin TTL en `context-builder.js` → suggestion
- `FRE_003`: Ultima auditoria WAT > 14 dias → warning
- `FRE_004`: Ultima actividad PM Agent > 3 dias → suggestion
- `FRE_005`: Proyectos en DB > LIMIT 10 → warning de contexto truncado

**T7. Checks de Uso** `[M]`
- `USE_001`: PM Agent tiene `skill_invocation_count` en memoria
- `USE_002`: `raw_events` con `agent_id='pm-agent'` en ultimos 7 dias
- `USE_003`: WAT Memory consultada por PM Agent en ultimos 14 dias
- `USE_004`: Skill coverage via `skill-coverage-checker.js` >= 80%

**T8. Checks Cross-Proyecto** `[M]`
- `XPR_001`: Agentes asignados a >2 proyectos activos (Planning/In Progress)
- `XPR_002`: Proyectos con mismo `department` y `sub_area` que podrian duplicar esfuerzo
- `XPR_003`: Proyectos sin agente asignado

**T9. Checks de Alineacion** `[M]`
- `ALI_001`: Proyectos activos que targeten mercados fuera de UAE → warning
- `ALI_002`: Deteccion de B2C drift (features solo para inversores sin valor para developers)
- `ALI_003`: BUSINESS_PLAN.md sin revision en >30 dias → suggestion

### Fase 3: Integracion (T10-T12) — Secuenciales

**T10. Modificar `context-builder.js`** `[S]`
- Añadir `let cacheCreatedAt = null` junto al cache existente (linea 55)
- Setear timestamp en `buildStaticContext()` al crear cache
- Exportar `getCacheAge()` → ms desde creacion o null
- Exportar `getContextStats()` → `{ staticCached, cacheAgeMs, liveQueryLimits }`
- Limpiar `cacheCreatedAt` en `clearContextCache()`
- **Sin breaking changes** a `buildProjectContext` ni `buildLightContext`

**T11. Actualizar PM Agent + seed** `[S]`
- `pm-agent.md`: Añadir `/pm-context-audit` a Skills disponibles
- `pm-agent.md`: Añadir memory keys: `last_context_audit_at`, `last_context_audit_score`
- `seed_agents.js`: Añadir `'pm-context-audit'` al array `skills` del pm-agent (linea 56)

**T12. Registrar en CLAUDE.md** `[S]`
- Añadir fila en tabla "Ejecucion" de Skills disponibles:
  - Skill: `pm-context-audit` | Comando: `/pm-context-audit` | Agente: PM Agent | Cuando: Auditar completitud, consistencia y frescura del contexto del PM Agent

### Fase 4: Verificacion (T13)

**T13. Verificacion end-to-end** `[S]`
1. `node tools/pm-agent/context-auditor.js full` → JSON sin errores
2. Probar cada dimension individual: `completeness`, `consistency`, etc.
3. Verificar scoring: 100 - (10*critical + 3*warning + 1*suggestion)
4. Verificar memoria: `node tools/db/memory.js get pm-agent last_context_audit_score`
5. Verificar tracking: invocacion registrada en `raw_events`
6. `node tools/db/seed_agents.js` → seed actualizado sin errores
7. Reporte en español

---

## Paralelismo

```
T1 + T2 + T3 (paralelo) ──────────────────┐
                                           │
T4 + T5 + T6 + T7 + T8 + T9 (paralelo) ──┤ dependen de T1
                                           │
T10 → T11 → T12 (secuencial) ─────────────┤ dependen de T1-T9
                                           │
T13 (verificacion) ────────────────────────┘ depende de todo
```

---

## Archivos criticos de referencia

| Archivo | Para que |
|---------|---------|
| `tools/pm-agent/context-builder.js` | Base del auditor, funciones reutilizables, cache a extender |
| `tools/db/wat-memory.js` | Patron CLI dual, queries cross-agente |
| `.claude/skills/ops/wat-audit/SKILL.md` | Patron de scoring, frontmatter Skills 2.0, reporte |
| `tools/db/seed_agents.js` | Registrar skill en pm-agent |
| `.claude/agents/product/pm-agent.md` | Actualizar definicion del agente |

---

## Verificacion final

- [ ] `context-auditor.js full` produce JSON valido con 6 dimensiones
- [ ] Score se calcula correctamente (formula WAT Audit)
- [ ] Reporte en español
- [ ] Memoria persistida con scope `shared`
- [ ] Skill tracker registra invocacion
- [ ] `seed_agents.js` ejecuta sin errores
- [ ] CLAUDE.md tiene skill registrado
- [ ] `/pm-context-audit` funciona en Claude Code con context fork

---

## Progreso de ejecucion

**Estado: COMPLETADO**

### Fase 1: Fundacion (T1-T3) — COMPLETADA

| Tarea | Estado | Notas |
|-------|--------|-------|
| T1. Crear audit-checks.js | DONE | 23 checks en 6 dimensiones, registry pattern con Map |
| T2. Crear context-auditor.js | DONE | Orquestador + CLI + formatters (Markdown + Console) |
| T3. Crear SKILL.md | DONE | Skills 2.0: fork, sonnet, allowed-tools, !backticks |

### Fase 2: Checks (T4-T9) — COMPLETADA (inline en T1)

Los 23 checks fueron implementados directamente en T1 dentro de `audit-checks.js`.

### Fase 3: Integracion (T10-T12) — COMPLETADA

| Tarea | Estado | Notas |
|-------|--------|-------|
| T10. Modificar context-builder.js | DONE | cacheCreatedAt, getCacheAge(), getContextStats() |
| T11. Actualizar pm-agent.md + seed | DONE | Skill + memory keys + seed array actualizado |
| T12. Registrar en CLAUDE.md | DONE | Fila en tabla Ejecucion |

### Fase 4: Verificacion (T13) — COMPLETADA

| Check | Resultado |
|-------|-----------|
| `context-auditor.js full` → JSON | OK — 6 dimensiones, 30 findings, score 6/100 |
| Dimensiones individuales | OK — `alignment` produce score 99/A |
| Scoring formula | OK — 100 - (2×10 + 23×3 + 5×1) = 6 ≥ 0 |
| seed_agents.js | OK — 7 agentes seeded sin errores |
| Skill tracking | OK — raw_events registra invocacion (IDs 57, 58) |
| Reporte en español | OK |
| Bug fixes | Corregido: CON_002 ignoraba placeholders `/nombre-skill`, ALI checks usaban columna inexistente `structured_data` → `description` |
