---
name: pm-context-audit
description: >
  Audita el contexto del PM Agent en 6 dimensiones: completitud, consistencia, frescura,
  uso, cross-proyecto y alineacion con BUSINESS_PLAN. Genera informe con score + acciones.
  Usa /pm-context-audit cuando quieras verificar la salud del contexto que usa el PM Agent.
agent: PM Agent
context: fork
model: sonnet
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
argument-hint: "[full|completeness|consistency|freshness|usage|crossProject|alignment]"
---

Read and execute the full instructions in `.claude/skills/ejecucion/pm-context-audit/SKILL.md`.
