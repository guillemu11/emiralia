---
name: wat-audit
description: Audita el sistema WAT completo (CLAUDE.md, agentes, skills, workflows, tools). Detecta inconsistencias, gaps y propone mejoras. Genera informe con score + propuestas.
agent: WAT Auditor Agent
context: fork
model: sonnet
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - Write
---

Read and execute the full instructions in `.claude/skills/ops/wat-audit/SKILL.md`.
