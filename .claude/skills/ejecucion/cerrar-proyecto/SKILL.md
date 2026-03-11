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

# /cerrar-proyecto — Cierre automatizado de proyectos

Cierra un proyecto completado: genera resumen estructurado, marca todas las tasks como Done, actualiza estado a Completed, y registra en audit_log.

## Workflow

### Step 1: Parsear argumentos

Extraer `project_id` y `notes` opcionales de `$ARGUMENTS`.

- Si no se proporciona ID: preguntar al usuario
- Si se proporcionan notas despues del ID, usarlas como contexto de cierre

### Step 2: Ejecutar cierre

```bash
node tools/db/complete_project.js $PROJECT_ID --notes="$NOTES"
```

Esto ejecuta en una sola transaccion atomica:
1. Valida que el proyecto existe y no esta ya completado
2. Marca todas las tasks como Done
3. Genera resumen estructurado con: problema, solucion, fases, tasks, agentes involucrados, fechas
4. Actualiza `projects.description` con el resumen en Markdown
5. Actualiza `projects.status` a `Completed`
6. Inserta entry en `audit_log` con tipo `project_completion`
7. Actualiza memoria compartida del agente (`last_project_closed`)
8. Registra skill invocation via skill-tracker

### Step 3: Mostrar resultado

Presentar al usuario:
- Confirmacion de cierre con ID del proyecto
- Resumen generado (fases, tasks, agentes)
- ID del audit log

### Formato de salida

```
Proyecto #[ID] completado

## Resultado Final

### Problema resuelto
[Del campo project.problem]

### Solucion implementada
[Del campo project.solution]

### Metricas de cierre
- Fases: X
- Tasks: Y (Z ya completadas, W cerradas al completar)
- Agentes involucrados: agent1, agent2
- Creado: YYYY-MM-DD
- Completado: YYYY-MM-DD

### Fases
Phase 1: Nombre — N tasks
Phase 2: Nombre — N tasks

### Notas de cierre
[Si el usuario las proporciono]
```

## Edge cases

- **Proyecto no existe**: Informar al usuario con el error
- **Ya completado**: Informar fecha de completion, no duplicar
- **Tasks pendientes**: El tool las marca Done automaticamente — informar cuantas se cerraron
- **Sin fases/tasks**: Permitir cierre, el resumen reflejara 0 tasks

## Notas

- El resumen se persiste en `projects.description` para que sea visible en el Dashboard
- El audit_log entry permite trazar quien cerro y cuando
- La memoria compartida `last_project_closed` permite que otros agentes sepan que proyecto se acaba de cerrar
