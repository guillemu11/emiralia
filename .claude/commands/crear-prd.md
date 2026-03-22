---
name: crear-prd
description: >
  Usar cuando se necesite crear un PRD (Product Requirements Document) para una
  nueva funcionalidad o mejora de Emiralia. Genera un documento de 8 secciones
  con contexto PropTech, KPIs y plan de release.
agent: PM Agent
context: fork
model: opus
disable-model-invocation: true
argument-hint: "[nombre del feature o mejora]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
  - tools/db/save_project.js
inputs:
  - FEATURE: Nombre o descripción del feature a documentar
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/ejecucion/crear-prd/SKILL.md`.
