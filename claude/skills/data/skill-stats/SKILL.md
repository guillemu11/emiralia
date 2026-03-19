---
name: skill-stats
description: Use when someone asks about skill usage statistics, which skills are being used, skill adoption rate, or wants to see analytics about how agents are using skills.
argument-hint: [skill name, agent name, time period, or question about skill usage]
---

# /skill-stats — Estadisticas de Uso de Skills

Consulta las estadisticas de uso de skills del sistema Emiralia.

## Workflow

1. Leer `$ARGUMENTS` para entender que quiere el usuario.

2. Llamar los endpoints relevantes (GET, read-only):
   - `http://localhost:3001/api/skills/stats?days=30` — Resumen general
   - `http://localhost:3001/api/skills/top?limit=10&days=30` — Top skills
   - `http://localhost:3001/api/skills/by-agent?days=30` — Por agente
   - `http://localhost:3001/api/skills/by-domain?days=30` — Por dominio
   - `http://localhost:3001/api/skills/timeline?days=30` — Tendencia diaria
   - `http://localhost:3001/api/skills/recent?limit=20` — Invocaciones recientes
   - `http://localhost:3001/api/skills/registry` — Catalogo de skills disponibles

3. Formatear la respuesta como tabla markdown en espanol.

4. Registrar esta invocacion:
   ```bash
   node tools/workspace-skills/skill-tracker.js record <currentAgentId> skill-stats data completed <durationMs> "$ARGUMENTS" user
   ```

## Reglas

- **Solo lectura.** No escribir datos, no modificar nada.
- **Responder en espanol.**
- Si el usuario pregunta por un skill especifico, filtrar los datos relevantes.
- Si pregunta por un periodo, ajustar el parametro `?days=`.
- Incluir siempre el success rate y la duracion promedio cuando sea relevante.

## Ejemplos de uso

- `/skill-stats` → Resumen general de los ultimos 30 dias
- `/skill-stats planificar-sprint` → Stats del skill planificar-sprint
- `/skill-stats pm-agent` → Skills usados por pm-agent
- `/skill-stats ultimos 7 dias` → Resumen de la ultima semana
