# 🔄 El Ciclo de Oro: Flujo Operativo de Emiralia OS

Para sacar el máximo rendimiento a esta aplicación, debes seguir este ciclo semanal y diario. El backend ya está preparado para soportar todo esto.

## 📅 Lunes: Planificación Estratégica (Weekly)
**Objetivo**: Definir qué proyectos se lanzarán esta semana.

1.  **Entra en `Weekly Board`** de un departamento (ej. Data).
2.  **Lanza la Skill**: Como tú eres el CEO, puedes pedirle a Petra (PM Agent) que ejecute `/weekly-brainstorm`.
    - *Qué hace el backend*: Analiza los reportes EOD de la semana pasada, identifica qué quedó pendiente y propone nuevos proyectos en la tabla `weekly_sessions`.
3.  **Aprobación**: Los proyectos aprobados aparecen en el Dashboard principal.

## ☀️ Diario: Ejecución y Standup (Daily)
**Objetivo**: Ver qué están haciendo los agentes en tiempo real.

1.  **Entra en `Daily Standup`**.
2.  **Tablero Kanban**: Verás qué tareas están "En Progreso" basándose en los últimos eventos que los agentes han guardado.
3.  **Skill de Seguimiento**: Los agentes (como Ralph) usan `/activity-tracking` cada vez que terminan una búsqueda o encuentran un dato.
    - *Qué hace el backend*: Guarda cada acción en `raw_events` y actualiza la tabla de auditoría.

## 🌙 Fin del Día: Generación de Reportes (EOD)
**Objetivo**: Consolidar el trabajo y medir el éxito.

1.  **Automatización**: Al final de la jornada, se dispara la skill `/eod-report`.
    - *Qué hace el backend*: Lee todos los `raw_events` del día para ese agente, calcula su productividad y genera un reporte estructurado en `eod_reports`.
2.  **Revisión en UI**: Tú entras en `Daily Standup` -> `Reportes EOD` para ver el resumen, el "humor" del agente y si hubo bloqueos.

## 🚨 En cualquier momento: Colaboración
1.  Si un agente de Data se bloquea porque necesita algo de Dev, se crea un **Raise** en el `Collaboration Hub`.
2.  Los PMs revisan el centro de alertas para resolver conflictos rápidamente.

---

### 🚀 Cómo hacerlo funcionar HOY
1.  **Simulación de Proyectos**: Ejecuta `node simulate_project.js` para crear un proyecto real con fases y tareas en la base de datos.
2.  **Simulación de Actividad**: Usa `node tools/workspace-skills/activity-harvester.js --test` para simular que un agente está trabajando.
3.  **Genera el Reporte**: Ejecuta `node tools/workspace-skills/eod-generator.js --test scraper-ralph` para ver cómo se crea el reporte automático.
4.  **Mira la UI**: Actualiza tu navegador y verás los datos reales reflejados.
