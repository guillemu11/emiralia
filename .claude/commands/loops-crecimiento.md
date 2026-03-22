---
name: loops-crecimiento
description: >
  Usar cuando se necesite diseñar o analizar loops de crecimiento sostenible
  para Emiralia. Identifica flywheels que se auto-refuerzan: content, community,
  data y agency loops adaptados al contexto PropTech.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[loop: content|community|data|agency|todos]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - LOOP_TYPE: Tipo de loop a analizar (content, community, data, agency, todos)
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/gtm/loops-crecimiento/SKILL.md`.
