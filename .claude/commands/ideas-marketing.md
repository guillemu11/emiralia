---
name: ideas-marketing
description: >
  Usar cuando se necesiten ideas creativas de marketing para alcanzar inversores
  hispanohablantes. Genera 5+ ideas cost-effective con canal, mensaje, coste
  estimado y métrica de éxito.
agent: Marketing Agent
disable-model-invocation: true
argument-hint: "[presupuesto mensual o canal específico]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - BUDGET: Presupuesto mensual disponible (opcional)
  - CHANNEL: Canal específico o 'todos'
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/marketing/ideas-marketing/SKILL.md`.
