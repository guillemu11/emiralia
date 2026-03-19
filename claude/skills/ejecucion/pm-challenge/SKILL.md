---
name: pm-challenge
description: Use when someone shares a new idea, project, feature request or proposal and wants it reviewed, challenged and broken down into an actionable plan.
disable-model-invocation: true
argument-hint: [describe tu idea]
---

# Skill: PM Challenge

## Que hace este skill?

Activa el protocolo del PM Agent para revisar, cuestionar y convertir una idea en un plan ejecutable. Sigue el protocolo definido en `.claude/agents/product/pm-agent.md`.

Todo el ciclo de vida se persiste en la misma base de datos que usa el Dashboard y Telegram, mediante `tools/pm-agent/inbox-cli.js`.

## Proceso completo

### Fase 0 — Iniciar sesion en inbox

Al recibir la idea del usuario, INMEDIATAMENTE crear un inbox item:

```bash
node tools/pm-agent/inbox-cli.js create "Titulo corto de la idea"
```

Guardar el `id` devuelto (campo `id` del JSON). Lo necesitaras en cada paso siguiente.

### Fase 1 — Escucha y Cuestiona (chat)

Lee `.claude/agents/product/pm-agent.md` y sigue el protocolo completo:

1. **Escucha** — Resume la idea en 2 lineas.
2. **Cuestiona** — Aplica analisis de Riesgos, Presupuesto y Pain Points (max 5 rondas).
3. **Propon** — Define el enfoque estrategico con Riesgos y Costes.

Despues de CADA intercambio (tu respuesta al usuario), persistir ambos mensajes:

```bash
node tools/pm-agent/inbox-cli.js append <ID> user "mensaje del usuario"
node tools/pm-agent/inbox-cli.js append <ID> assistant "tu respuesta"
```

### Fase 2 — Crear borrador (chat -> borrador)

Cuando la idea esta suficientemente refinada (tu lo decides o el usuario pide "crear borrador"), genera un resumen estructurado con:

- **Idea**: Que se quiere hacer (1-2 lineas)
- **Contexto**: Por que es importante
- **Decisiones clave**: Puntos acordados (bullets)
- **Alcance**: Que incluye y que no

Persistir el borrador via stdin:

```bash
cat <<'BORRADOR_EOF' | node tools/pm-agent/inbox-cli.js to-borrador <ID>
**Idea**: ...
**Contexto**: ...
**Decisiones clave**:
- ...
**Alcance**: ...
BORRADOR_EOF
```

Informar al usuario: "Borrador creado (inbox #ID). Visible en el Dashboard. Escribe /ok para generar el plan maestro."

### Fase 3 — Generar proyecto (borrador -> proyecto)

Cuando el usuario confirma con `/ok`:

1. Genera el JSON completo del proyecto siguiendo el formato definido en `.claude/agents/product/pm-agent.md` (seccion del JSON de referencia).
2. Persistir:

```bash
cat <<'PROJ_EOF' | node tools/pm-agent/inbox-cli.js to-proyecto <ID>
{
  "project_name": "...",
  "department": "...",
  "sub_area": "...",
  "problem": "...",
  "solution": "...",
  "pain_points": [...],
  "requirements": [...],
  "risks": [...],
  "estimated_budget": 0,
  "estimated_timeline": "...",
  "future_improvements": [...],
  "success_metrics": [...],
  "blocks": [...],
  "phases": [
    {
      "phase_number": 1,
      "phase_name": "...",
      "objective": "...",
      "functionalities": [
        {
          "name": "...",
          "tasks": [
            { "description": "...", "agent": "...", "effort": "S|M|L", "dependencies": [] }
          ]
        }
      ]
    }
  ]
}
PROJ_EOF
```

3. Informar al usuario con el `project_id` devuelto: "Proyecto #X creado y visible en el Dashboard."

## Comandos durante la sesion

| Comando | Accion |
|---------|--------|
| `/ok` | Avanza al siguiente paso del lifecycle (borrador o proyecto) |
| `/task <projectId> <descripcion>` | Inyecta tarea puntual (seguir protocolo de pm-agent.md) |

## Output final (tras /ok)

Formato estructurado para el Emiralia Dashboard (PostgreSQL):
- Nombre, Departamento y Sub-area
- **Insights**: Pain Points, Requerimientos, Riesgos
- **Economics**: Presupuesto y Timeline
- **Roadmap**: 3 Mejoras Futuras (Post-MVP)
- **Execution**: Fases, Tareas (con Tipo y Prioridad)

## Notas

- No omitas el cuestionamiento aunque la idea parezca obvia
- Si el usuario pide acortar el proceso, puedes reducir a 2 preguntas minimo
- El breakdown debe ser lo suficientemente detallado para que cualquier agente pueda ejecutar sin dudas
- Todos los items creados desde Claude Code llevan `source: 'claude-code'` y son visibles en el Dashboard
- Para ver items anteriores: `node tools/pm-agent/inbox-cli.js list`
