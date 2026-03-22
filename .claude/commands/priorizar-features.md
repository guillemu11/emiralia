---
name: priorizar-features
description: >
  Usar cuando se necesite priorizar el backlog de features de Emiralia.
  Aplica frameworks RICE, MoSCoW e Impact/Esfuerzo adaptados a la
  capacidad del equipo de agentes IA.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[lista de features separadas por coma]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - FEATURES: Lista de features a priorizar
  - FRAMEWORK: Framework a usar (rice, moscow, impact-effort, todos)
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/ejecucion/priorizar-features/SKILL.md`.
