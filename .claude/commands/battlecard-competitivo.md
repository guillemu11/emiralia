---
name: battlecard-competitivo
description: >
  Usar cuando se necesite un battlecard competitivo para situaciones de ventas
  o partnerships. Genera fichas por competidor con fortalezas, debilidades,
  objeciones y respuestas preparadas.
agent: Marketing Agent
disable-model-invocation: true
argument-hint: "[competidor: propertyfinder|bayut|houza|agencias|todos]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - COMPETITOR: Competidor específico o 'todos'
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/marketing/battlecard-competitivo/SKILL.md`.
