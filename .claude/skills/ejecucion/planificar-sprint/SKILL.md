---
name: planificar-sprint
description: >
  Usar para planificar el sprint semanal del equipo de agentes IA de Emiralia.
  Lee el backlog, prioriza tareas, asigna agentes y genera un plan de sprint
  con capacidad estimada.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[proyecto_id o 'backlog general']"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
  - tools/db/query_properties.js
inputs:
  - PROJECT_ID: ID del proyecto o 'backlog general'
  - SPRINT_WEEK: Semana del sprint (default: actual)
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Planificar Sprint

## ¿Qué hace este skill?

Genera un **plan de sprint semanal** para el equipo de agentes IA de Emiralia. Lee las tareas pendientes del backlog, las prioriza, asigna a los agentes disponibles y produce un plan ejecutable.

## Cuándo usarlo

- Cada lunes al iniciar la semana de trabajo.
- Después de priorizar features con `/priorizar-features`.
- Como parte del workflow `/sprint-planning`.

---

## Modelo de capacidad de Emiralia

| Agente | Capacidad/Sprint | Especialidad | Coste relativo |
|--------|-----------------|-------------|----------------|
| Dev Agent | 5 tareas (40h) | Features, bugs, infra | Alto |
| Content Agent | 8 tareas (40h) | Blog, fichas, copies | Bajo |
| Data Agent | 3 tareas (20h) | Scraping, limpieza | Bajo |
| Frontend Agent | 5 tareas (40h) | UI, landing pages | Medio |
| Marketing Agent | 4 tareas (30h) | Campañas, copies | Medio |

**Esfuerzo estimado**: S = 2h | M = 8h | L = 24h

---

## Proceso paso a paso

### Paso 1: Leer estado actual
```bash
node tools/db/wat-memory.js status
node tools/db/query_properties.js "SELECT t.id, t.description, t.agent, t.effort, t.priority, t.status FROM tasks t JOIN phases p ON t.phase_id = p.id WHERE t.status = 'Todo' ORDER BY CASE t.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 WHEN 'Low' THEN 4 END LIMIT 30"
```

### Paso 2: Seleccionar tareas por prioridad y capacidad
### Paso 3: Verificar dependencias entre tareas
### Paso 4: Asignar agente responsable
### Paso 5: Generar plan de sprint

---

## Plantilla de output

```markdown
# Sprint [N] — Semana del [fecha]

## Objetivo del Sprint
[1-2 líneas describiendo el foco principal de la semana]

## Tareas Comprometidas

| # | Tarea | Agente | Esfuerzo | Prioridad | Deps |
|---|-------|--------|----------|-----------|------|
| 1 | [tarea] | [agente] | [S/M/L] | [Crit/High/Med/Low] | [IDs] |

## Capacidad por Agente

| Agente | Tareas asignadas | Horas estimadas | % Ocupación |
|--------|-----------------|-----------------|-------------|
| Dev Agent | [N] | [h] | [%] |
| Content Agent | [N] | [h] | [%] |
| Data Agent | [N] | [h] | [%] |

## Riesgos del Sprint
| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| [riesgo] | [impacto] | [acción] |

## Definition of Done
- [ ] Todas las tareas comprometidas en status 'Done'
- [ ] Sin bugs bloqueantes abiertos
- [ ] EOD reports generados para cada agente activo
```

---

## Persistencia

```bash
node tools/db/save_research.js --title "Sprint [N] — [fecha]" --summary "Plan de sprint semanal"
node tools/db/memory.js set pm-agent last_sprint_planned '"Sprint [N]"' shared
node tools/db/memory.js set pm-agent sprint_task_count '"[N]"' shared
```

---

## Notas

- No sobrecargar agentes: dejar 20% de capacidad libre para imprevistos.
- Las tareas Critical van primero, sin excepción.
- Si el backlog está vacío, sugerir ejecutar `/crear-prd` o `/pm-challenge`.
- Complementar con `/priorizar-features` para el ranking previo.
