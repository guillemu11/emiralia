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

## Estado actual del PM Agent
!`node tools/db/wat-memory.js agent pm-agent`

## Ultimo WAT Audit
!`node tools/db/wat-memory.js check wat-auditor-agent last_audit_at`

## What This Skill Does

Ejecuta una auditoria del contexto que utiliza el PM Agent para tomar decisiones. Analiza 6 dimensiones:

| Dimension | Que audita |
|-----------|-----------|
| **completeness** | Memory keys pobladas, secciones requeridas en agent .md, BUSINESS_PLAN presente |
| **consistency** | Agent .md ↔ DB agents, skills ↔ SKILL.md, CLAUDE.md ↔ seed |
| **freshness** | Edad de memoria, cache estatico, actividad reciente |
| **usage** | Skills tracked, WAT Memory consultada, context-builder usado |
| **crossProject** | Conflictos entre proyectos activos, departamentos sobrecargados |
| **alignment** | Proyectos fuera de scope UAE, B2C drift, BUSINESS_PLAN desactualizado |

## Modes

- `/pm-context-audit` o `/pm-context-audit full` — Auditoria completa (6 dimensiones)
- `/pm-context-audit completeness` — Solo completitud
- `/pm-context-audit consistency` — Solo consistencia
- `/pm-context-audit freshness` — Solo frescura
- `/pm-context-audit usage` — Solo uso
- `/pm-context-audit crossProject` — Solo cross-proyecto
- `/pm-context-audit alignment` — Solo alineacion

## Instructions

### Paso 1: Ejecutar auditoria

Ejecuta el auditor con la dimension solicitada:

```bash
node tools/pm-agent/context-auditor.js full
```

O con dimension especifica:

```bash
node tools/pm-agent/context-auditor.js completeness
```

### Paso 2: Analizar resultados

Del JSON resultante, extraer:

1. **Score global** (0-100) y grade (A-F)
2. **Issues criticos** (severity: critical) — requieren accion inmediata
3. **Warnings** — problemas que causan friccion
4. **Suggestions** — oportunidades de mejora

Formula de scoring (misma que WAT Audit):
- Base: 100 pts
- Critical: -10 pts
- Warning: -3 pts
- Suggestion: -1 pt

### Paso 3: Formatear resumen

Presenta al usuario un resumen conciso:

```
## PM Agent Context Audit — {fecha}
**Score: {score}/100 ({grade})**
{n} critical | {n} warnings | {n} suggestions

### Top Issues
1. [CRITICAL] {descripcion} → {accion}
2. [WARNING] {descripcion} → {accion}
...

### Score por Dimension
| Dimension | Score | Grade |
|-----------|-------|-------|
| completeness | {n}/100 | {X} |
| ... | ... | ... |
```

### Paso 4: Persistir en memoria

```bash
node tools/db/memory.js set pm-agent last_context_audit_at '"{timestamp}"' shared
node tools/db/memory.js set pm-agent last_context_audit_score '{score}' shared
node tools/db/memory.js set pm-agent context_audit_findings '{total_findings}' shared
```

### Paso 5: Registrar actividad

```bash
node tools/workspace-skills/skill-tracker.js record pm-agent pm-context-audit ejecucion completed {durationMs} "{dimension}" user
```
