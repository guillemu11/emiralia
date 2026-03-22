---
name: pre-mortem
description: >
  Usar antes de lanzar un proyecto o feature importante. Realiza un análisis
  pre-mortem de riesgos usando la clasificación Tigers/Paper Tigers/Elephants,
  con taxonomía de riesgos específica de Emiralia y EAU.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[proyecto o feature a analizar]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - PROJECT: Proyecto o feature a analizar
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/ejecucion/pre-mortem/SKILL.md`.
