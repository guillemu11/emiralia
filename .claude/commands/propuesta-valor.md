---
name: propuesta-valor
description: >
  Usar cuando se necesite definir, articular o refinar la propuesta de valor
  de Emiralia o de un feature específico. Utiliza el framework JTBD (Jobs To Be Done)
  de 6 partes adaptado al contexto de inversores hispanohablantes en EAU.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[producto, feature o segmento a evaluar]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - SUBJECT: Producto completo o feature específico a evaluar
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/producto/propuesta-valor/SKILL.md`.
