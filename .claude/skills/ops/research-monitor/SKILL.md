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

## What This Skill Does

Ejecuta un ciclo completo de monitoreo de fuentes externas relevantes para el ecosistema Claude/MCP. Recopila novedades de Anthropic docs, Claude Code releases y la comunidad Reddit, las filtra por relevancia, y genera un informe persistido en la base de datos.

Usa `/research-monitor` cuando quieras:
- Verificar si hay novedades en el ecosistema Claude que impacten a Emiralia
- Alimentar al WAT Auditor con inteligencia externa antes de una auditoria
- Ejecutar manualmente el ciclo semanal de monitoreo

## Estado actual del Research Agent
!`node tools/db/memory.js list research-agent`

## Ultimo informe
!`node tools/db/wat-memory.js check research-agent last_monitor_at`

## Instructions

### Paso 1: Verificar estado previo

Revisar los checkpoints del Research Agent para entender que ya se ha procesado:
```bash
node tools/db/memory.js list research-agent
```

### Paso 2: Ejecutar ciclo de monitoreo

Invocar el orquestador principal:
```bash
node tools/research-agent/orchestrator.js
```

El orquestador automaticamente:
1. Lee checkpoints de memoria (dedup)
2. Fetch de 3 fuentes en paralelo (Anthropic, GitHub, Reddit)
3. Filtra por relevancia (keywords + scoring)
4. Genera informe Markdown
5. Persiste en `pm_reports`
6. Actualiza memoria del agente

### Paso 3: Revisar resultados

Verificar el output del orquestador:
- Cuantas entries raw se obtuvieron
- Cuantas pasaron el filtro de relevancia
- Distribucion por impacto (high/medium/low)
- Estado de cada fuente (ok/error)

### Paso 4: Reportar al usuario

Mostrar un resumen de 3-5 lineas con:
- Numero de novedades detectadas por impacto
- Novedades high mas relevantes (si hay)
- Estado de las fuentes
- Sugerencia de ejecutar `/wat-audit` si hay novedades high

### Paso 5: Registrar skill invocation

```bash
node tools/workspace-skills/skill-tracker.js record research-agent research-monitor ops completed [durationMs] "" user
```
