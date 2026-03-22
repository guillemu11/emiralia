---
name: ideas-posicionamiento
description: >
  Usar cuando se necesite definir o refinar el posicionamiento de Emiralia
  frente a competidores. Genera territorios de posicionamiento diferencial
  con análisis de fit por audiencia, mensajes y canales.
agent: Marketing Agent
disable-model-invocation: true
argument-hint: "[competidor para diferenciarse o 'general']"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - FOCUS: Competidor específico o 'general' para posicionamiento amplio
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/gtm/ideas-posicionamiento/SKILL.md`.
