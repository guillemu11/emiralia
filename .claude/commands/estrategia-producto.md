---
name: estrategia-producto
description: >
  Usar cuando se necesite definir o revisar la estrategia de producto de Emiralia:
  visión, segmentos objetivo, propuesta de valor, métricas clave y defensibilidad.
  Genera un Product Strategy Canvas completo de 9 secciones adaptado al mercado
  inmobiliario de EAU para el segmento hispanohablante.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[area: vision|segmentos|metricas|defensibilidad|completo]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - FOCUS: Área de estrategia a trabajar (opcional, default: completo)
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/producto/estrategia-producto/SKILL.md`.
