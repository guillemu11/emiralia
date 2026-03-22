---
name: tamanio-mercado
description: >
  Usar cuando se necesite estimar el tamaño del mercado objetivo de Emiralia
  (TAM/SAM/SOM). Calcula el mercado total, accesible y capturable para el
  segmento de inversores hispanohablantes en el mercado inmobiliario de EAU.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[enfoque: completo|tam|sam|som|sensibilidad]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - FOCUS: Nivel de análisis (completo, tam, sam, som, sensibilidad)
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/producto/tamanio-mercado/SKILL.md`.
