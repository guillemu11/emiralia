---
name: estrategia-gtm
description: >
  Usar cuando se necesite planificar el Go-to-Market de Emiralia para un mercado
  objetivo. Genera un plan GTM completo con canales, mensajes, roadmap y presupuesto
  para alcanzar inversores hispanohablantes en EAU.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[mercado: espana|latam|expats|todos]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - TARGET_MARKET: Mercado objetivo (espana, latam, expats, todos)
  - BUDGET: Presupuesto disponible para 6 meses (opcional)
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/gtm/estrategia-gtm/SKILL.md`.
