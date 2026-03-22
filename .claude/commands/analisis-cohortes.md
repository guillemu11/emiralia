---
name: analisis-cohortes
description: >
  Usar cuando se necesite analizar datos de propiedades por cohortes: comunidad,
  rango de precio, fecha de scraping o tipo de propiedad. Identifica tendencias
  y patrones en el inventario inmobiliario de EAU.
agent: Data Agent
disable-model-invocation: true
argument-hint: "[tipo: propiedades|comunidades|precios|temporal]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/query_properties.js
  - tools/db/save_research.js
inputs:
  - COHORT_TYPE: Tipo de análisis (propiedades, comunidades, precios, temporal)
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/data/analisis-cohortes/SKILL.md`.
