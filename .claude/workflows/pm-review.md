# Workflow: PM Review (Identificación y Desglose de Proyectos)

Este workflow describe el proceso que sigue el **PM Agent** para transformar una idea cruda en un plan de ejecución estratégico en el **Emiralia Dashboard**.

## Objetivos
- Cuestionar y refinar ideas basándose en Riesgos, Presupuesto y Valor Real.
- Gestionar el ciclo de vida de los proyectos (Creación, Edición y Ticketing).
- Centralizar la inteligencia en PostgreSQL para su visualización en el Dashboard.

## Actores
- **Usuario**: Proporciona ideas y gestiona tickets vía Telegram.
- **PM Agent**: Cerebro estratégico que analiza, desafía y inyecta datos.
- **Emiralia Dashboard**: Interfaz visual para el seguimiento de métricas, roadmaps y tareas.

## Proceso Paso a Paso

### 1. Captura y Carga
- **Nueva Idea**: Comando `/idea` -> Inicia protocolo de 5 preguntas.
- **Edición**: Comando `/list` para ver IDs -> `/edit [ID]` para cargar contexto.
- **Ticketing**: Comando `/task [ID] [Prompt]` para inyectar una tarea/bug puntual.

### 2. Fase Estratégica (Deep Dive)
- El PM Agent aplica el sistema de cuestionamiento:
  - Identificación de **Pain Points**.
  - Análisis de **Riesgos y Mitigación**.
  - Estimación de **Budget y Timeline**.

### 3. Propuesta y Feedback
- El agente genera una propuesta formal con "Insights" y "Economics".
- **Obligatorio**: Definir la "Visión de Futuro" (Roadmap Post-MVP).
- El usuario valida o pide ajustes (en modo /edit).

### 4. Aprobación y Persistencia
- El usuario envía `/ok`.
- El PM Agent genera el JSON maestro y lo guarda en **PostgreSQL** vía `tools/db/save_project.js`.
- El Dashboard se actualiza instantáneamente con el nuevo plan.

### 5. Gestión Operativa (Agile)
- El usuario inyecta tickets rápidos vía `/task` para mantener el proyecto vivo sin re-planificar.

## Manejo de Errores
- **Error de API (OpenAI/Telegram)**: El bot informará del error y permitirá reintentar el último paso.
- **Error de Notion**: Si falla la exportación, el JSON se muestra en Telegram para que el usuario pueda guardarlo manualmente.
- **Falta de claridad**: Si el PM Agent considera que la idea es demasiado vaga tras el cuestionamiento, debe sugerir una pausa o investigación previa.

## Mantenimiento
- Las métricas de éxito del proyecto en Notion deben ser revisadas periódicamente por el PM Agent (en futuros workflows de reporting).
