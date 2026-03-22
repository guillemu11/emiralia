---
name: research-monitor
description: >
  Ejecuta ciclo de monitoreo de fuentes externas (Anthropic, GitHub, Reddit).
  Genera intelligence report clasificado por impacto para el WAT Auditor.
agent: Research Agent
context: fork
model: haiku
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
---

Read and execute the full instructions in `.claude/skills/ops/research-monitor/SKILL.md`.
