---
name: analisis-sentimiento
description: >
  Usar cuando se necesite analizar el sentimiento y extraer insights de
  feedback de usuarios, reviews de competidores o comentarios en comunidades
  de inversores hispanohablantes.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[fuente de feedback o texto a analizar]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - FEEDBACK_SOURCE: Fuente de feedback o texto directo a analizar
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/data/analisis-sentimiento/SKILL.md`.
