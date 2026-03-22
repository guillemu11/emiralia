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

Read and execute the full instructions in `.claude/skills/ejecucion/planificar-sprint/SKILL.md`.
