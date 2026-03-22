---
name: analisis-ab
description: >
  Usar cuando se necesite analizar resultados de tests A/B en Emiralia.
  Calcula significancia estadística, tamaño de muestra necesario y
  recomienda ship/extend/stop.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[datos del test en JSON o descripción]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - TEST_DATA: Datos del test (variantes, conversiones, muestras)
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/marketing/analisis-ab/SKILL.md`.
