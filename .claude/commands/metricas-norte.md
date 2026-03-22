---
name: metricas-norte
description: >
  Usar cuando se necesite definir o revisar la North Star Metric de Emiralia
  y sus métricas de input. Evalúa candidatos a NSM y diseña el árbol de
  métricas que guía las decisiones de producto y crecimiento.
agent: Marketing Agent
disable-model-invocation: true
argument-hint: "[candidatos a NSM o 'evaluar todos']"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - CANDIDATES: Candidatos a NSM o 'evaluar todos'
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/marketing/metricas-norte/SKILL.md`.
