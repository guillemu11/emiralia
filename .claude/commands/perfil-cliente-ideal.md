---
name: perfil-cliente-ideal
description: >
  Usar cuando se necesite definir o refinar los perfiles de cliente ideal (ICP)
  de Emiralia. Genera arquetipos detallados de inversores hispanohablantes
  interesados en el mercado inmobiliario de EAU, con demographics, JTBD,
  triggers, canales y objeciones.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[segmento: todos|espana|latam|expats]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - SEGMENT: Segmento a perfilar (todos, espana, latam, expats)
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/producto/perfil-cliente-ideal/SKILL.md`.
