---
name: segmento-entrada
description: >
  Usar cuando se necesite seleccionar el mercado de entrada (beachhead) de Emiralia.
  Evalúa España, LatAm y Expats como primer segmento objetivo usando una matriz
  de criterios ponderados.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[mercados a evaluar o 'todos']"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - MARKETS: Mercados a evaluar (espana, latam, expats, o todos)
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/gtm/segmento-entrada/SKILL.md`.
