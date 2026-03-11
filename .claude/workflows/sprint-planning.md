# Workflow: Sprint Planning (Planificación de Sprint Semanal)

Este workflow estructura la planificación de sprints semanales para el equipo de agentes IA de Emiralia, desde la lectura del backlog hasta la asignación de tareas.

## Objetivos
- Seleccionar las tareas más prioritarias del backlog para el sprint.
- Asignar cada tarea al agente más adecuado según su especialidad.
- Verificar dependencias y capacidad antes de comprometer el sprint.
- Producir un plan de sprint documentado y persistido.

## Actores
- **PM Agent**: Lidera la planificación y toma decisiones de prioridad.
- **Usuario**: Valida el sprint plan y ajusta prioridades si es necesario.

## Inputs requeridos
- ID del proyecto a planificar (o `backlog general` para todas las tareas pendientes).
- Semana del sprint (default: semana actual).

## Proceso Paso a Paso

### Paso 1: Lectura del Estado Actual
**Tools**: `tools/db/wat-memory.js`, `tools/db/query_properties.js`

```bash
# Estado de todos los agentes
node tools/db/wat-memory.js status

# Tareas pendientes del backlog
node tools/db/query_properties.js "SELECT t.id, t.description, t.agent, t.effort, t.priority, t.status, p.name as phase FROM tasks t JOIN phases p ON t.phase_id = p.id WHERE t.status = 'Todo' ORDER BY CASE t.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 WHEN 'Low' THEN 4 END"
```

### Paso 2: Priorización
**Skill**: `/priorizar-features`
- Aplicar framework RICE o Impact/Esfuerzo a las tareas del backlog.
- Generar ranking priorizado.

**Checkpoint 1**: Presentar las top 10-15 tareas priorizadas al usuario. Esperar confirmación.

### Paso 3: Planificación del Sprint
**Skill**: `/planificar-sprint`
- Seleccionar tareas según capacidad estimada de cada agente.
- Capacidad por agente/sprint: ~40h equivalentes (S=2h, M=8h, L=24h).
- Verificar dependencias entre tareas.
- Asignar responsable.

### Paso 4: Documentación
- Generar el sprint plan con formato:

```
## Sprint [N] — Semana del [fecha]

### Objetivo del Sprint
[1-2 líneas describiendo el foco principal]

### Tareas Comprometidas
| # | Tarea | Agente | Esfuerzo | Prioridad | Dependencias |
|---|-------|--------|----------|-----------|--------------|

### Capacidad
| Agente | Tareas | Horas estimadas | % Ocupación |
|--------|--------|-----------------|-------------|

### Riesgos del Sprint
- [riesgo 1 y mitigación]
```

### Paso 5: Persistencia
- Guardar sprint plan en `pm_reports`.
- Actualizar estado de tareas seleccionadas a `In Progress` en la tabla `tasks`.
- Actualizar memoria:

```bash
node tools/db/memory.js set pm-agent last_sprint_planned '"Sprint N — <fecha>"' shared
node tools/db/memory.js set pm-agent sprint_task_count '"<N>"' shared
```

## Output
| Tipo | Destino | Modo |
|------|---------|------|
| document | PostgreSQL > `pm_reports` | create_new |
| table | PostgreSQL > `tasks` (status update) | update |

## Edge Cases
| Situación | Acción |
|-----------|--------|
| Backlog vacío | Notificar al usuario; sugerir ejecutar `/crear-prd` o `/pm-challenge` para generar tareas |
| Dependencia bloqueante no resuelta | Marcar tarea como bloqueada; escalar al usuario |
| Agente requerido no disponible | Reasignar a agente alternativo o mover tarea al siguiente sprint |

## Frecuencia
- **Semanal**: Cada lunes como parte de la sesión de planificación.
