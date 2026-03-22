---
name: historias-usuario
description: >
  Usar cuando se necesite escribir user stories o job stories para features
  de Emiralia. Genera historias siguiendo los formatos 3 C's + INVEST y
  When/Want/So adaptados al contexto PropTech EAU.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[feature o epic]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - FEATURE: Feature o epic para el que escribir historias
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/ejecucion/historias-usuario/SKILL.md`.
