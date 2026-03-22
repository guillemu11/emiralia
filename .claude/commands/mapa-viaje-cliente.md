---
name: mapa-viaje-cliente
description: >
  Usar cuando se necesite mapear el journey completo del comprador hispanohablante
  de propiedades en EAU. Cubre las 8 etapas desde el descubrimiento hasta el cierre,
  con touchpoints, emociones, pain points y oportunidades para Emiralia.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[etapa: todas|descubrimiento|educacion|contacto|cierre]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - STAGE: Etapa específica o 'todas' para el journey completo
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/gtm/mapa-viaje-cliente/SKILL.md`.
