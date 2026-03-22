---
name: analisis-competidores
description: >
  Usar cuando se necesite analizar la competencia de Emiralia en el mercado
  PropTech de EAU. Genera una matriz competitiva detallada con fortalezas,
  debilidades y oportunidades de diferenciación en el segmento hispanohablante.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[competidor: propertyfinder|bayut|houza|agencias|todos]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - COMPETITOR: Competidor específico o 'todos' para análisis completo
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/producto/analisis-competidores/SKILL.md`.
