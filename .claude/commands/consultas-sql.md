---
name: consultas-sql
description: >
  Usar cuando se necesite generar o ejecutar consultas SQL sobre la base de datos
  de Emiralia. Transforma preguntas en lenguaje natural a queries PostgreSQL
  optimizadas. Solo permite SELECT (read-only).
agent: Data Agent
model: haiku
allowed-tools:
  - Bash
  - Read
  - Grep
disable-model-invocation: true
argument-hint: "[descripción en lenguaje natural de lo que quieres consultar]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/query_properties.js
inputs:
  - QUERY_DESCRIPTION: Descripción en lenguaje natural de los datos que necesitas
outputs:
  type: table
  destination:
    category: database
    target: Resultados en consola / pm_reports si se quiere persistir
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/data/consultas-sql/SKILL.md`.
