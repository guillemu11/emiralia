---
name: cerrar-proyecto
description: Use when closing, completing, finishing, or marking a project as done. Generates completion summary, marks tasks as Done, logs to audit.
agent: PM Agent
argument-hint: "[project_id] [notas opcionales de cierre]"
inputs:
  - PROJECT_ID: ID numerico del proyecto
  - NOTES: Notas opcionales sobre lo conseguido
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > projects + audit_log
  write_mode: overwrite
tools:
  - tools/db/complete_project.js
  - tools/db/memory.js
  - tools/workspace-skills/skill-tracker.js
---

Read and execute the full instructions in `.claude/skills/ejecucion/cerrar-proyecto/SKILL.md`.
