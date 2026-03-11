# Plan: Weekly Planning Hub

## Contexto

La funcionalidad Weekly actual es un CRUD vacío: crea sesiones con `steps_data: {}` y `final_projects: []`, el generador tiene lógica hardcodeada, y el Pipeline es un placeholder. El objetivo es transformarlo en el **centro de planificación semanal** de Emiralia, donde confluyen las ideas capturadas durante la semana (Telegram + Dashboard), el brainstorming con agentes, y un reporte inteligente real.

---

## Fase 1: Foundation — Schema + PM Agent compartido

### 1.1 Migración DB (`tools/db/migration_weekly_hub.sql`)

Nueva tabla `inbox_items`:
```sql
CREATE TABLE inbox_items (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL CHECK (source IN ('telegram', 'dashboard', 'agent')),
    source_user TEXT,
    department TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'reviewing', 'approved', 'assigned', 'discarded')),
    conversation JSONB DEFAULT '[]',
    structured_data JSONB,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    weekly_session_id INTEGER REFERENCES weekly_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Nueva tabla `weekly_brainstorms`:
```sql
CREATE TABLE weekly_brainstorms (
    id SERIAL PRIMARY KEY,
    weekly_session_id INTEGER NOT NULL REFERENCES weekly_sessions(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    contribution_type TEXT CHECK (contribution_type IN ('proposal', 'improvement', 'concern', 'insight')),
    content TEXT NOT NULL,
    context JSONB,
    user_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Columnas nuevas en `weekly_sessions`:
```sql
ALTER TABLE weekly_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE weekly_sessions ADD COLUMN IF NOT EXISTS report JSONB;
ALTER TABLE weekly_sessions ADD COLUMN IF NOT EXISTS inbox_snapshot JSONB;
ALTER TABLE weekly_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

### 1.2 Extraer PM Agent Core (`tools/pm-agent/core.js`)

Extraer de `tools/telegram/bot.js`:
- `PM_SYSTEM_PROMPT` (lineas ~40-131)
- `chatWithPMAgent(messages, options)` — llama a Anthropic API, soporta streaming
- `extractJSON(text)` — parsea JSON de bloques markdown

Refactorizar `tools/telegram/bot.js` para importar de `core.js` en lugar de definir su propia copia.

### 1.3 Telegram Bot: escribir en inbox

Cuando el bot completa un `/idea` con `/ok`, además de guardar en `projects`, insertar un `inbox_item` con source='telegram' para que aparezca en el dashboard.

**Archivos:**
- `tools/db/migration_weekly_hub.sql` (nuevo)
- `tools/pm-agent/core.js` (nuevo)
- `tools/telegram/bot.js` (refactor imports + escribir inbox_items)
- `tools/db/schema.sql` (actualizar con nuevas tablas)

---

## Fase 2: Inbox + Chat en Dashboard

### 2.1 API Endpoints en `apps/dashboard/server.js`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/inbox` | Listar items (query: department, status, since) |
| `GET` | `/api/inbox/:id` | Detalle con conversación |
| `POST` | `/api/inbox` | Crear item (formulario rápido) |
| `PATCH` | `/api/inbox/:id` | Cambiar status/department/vincular proyecto |
| `DELETE` | `/api/inbox/:id` | Eliminar |
| `POST` | `/api/chat/pm-agent` | Chat SSE con PM Agent |

### 2.2 Chat endpoint (`/api/chat/pm-agent`)

- Recibe: `{ inbox_item_id, message, action: 'message'|'ok'|'cancel' }`
- Carga/crea `inbox_item`, construye messages array del historial
- Llama `chatWithPMAgent()` con streaming SSE
- Persiste conversación en `inbox_items.conversation`
- Si action='ok', extrae JSON y guarda en `structured_data`

### 2.3 Componentes Frontend

**`PMAgentChat.jsx`** — Chat embebido tipo Telegram
- Burbujas de conversación (usuario: coral, agente: slate-100)
- Input `rounded-full` con botón de envío coral
- Streaming de respuesta con indicador de "pensando"
- Al detectar JSON estructurado: mostrar card de propuesta con botón "Aprobar y crear proyecto"

**`InboxPanel.jsx`** — Lista de ideas con filtros
- Filtro por status (draft, reviewing, approved, assigned)
- Quick-add: formulario rápido (título + departamento)
- Click en item abre `PMAgentChat` en panel lateral
- Botón "Nueva idea con PM Agent" abre chat vacío

**`Inbox.jsx`** — Página standalone (ruta `/inbox`)
- Vista global de todas las ideas, cross-department
- Combina `InboxPanel` + `PMAgentChat`

**Ruta nueva en `main.jsx` + nav item en `Layout.jsx`:**
- `/inbox` con icono de bandeja de entrada

**Archivos:**
- `apps/dashboard/server.js` (endpoints inbox + chat)
- `apps/dashboard/src/pages/Inbox.jsx` (nuevo)
- `apps/dashboard/src/components/PMAgentChat.jsx` (nuevo)
- `apps/dashboard/src/components/InboxPanel.jsx` (nuevo)
- `apps/dashboard/src/main.jsx` (nueva ruta)
- `apps/dashboard/src/components/Layout.jsx` (nuevo nav item)

---

## Fase 3: Weekly Session con Inbox + Brainstorm

### 3.1 API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/weekly-sessions/:id/import-inbox` | Importar inbox items pendientes del depto |
| `POST` | `/api/weekly-sessions/:id/brainstorm` | Disparar brainstorming de agentes |
| `POST` | `/api/weekly-sessions/:id/brainstorm/:bid/respond` | Respuesta del usuario a contribución |
| `PATCH` | `/api/weekly-sessions/:id` | Actualizar sesión (status, etc.) |

### 3.2 Import Inbox

Al crear una weekly o manualmente:
- Busca `inbox_items WHERE department = X AND status IN ('approved','reviewing') AND created_at > last_weekly.created_at`
- Guarda snapshot en `weekly_sessions.inbox_snapshot`
- Actualiza `inbox_items.weekly_session_id`

### 3.3 Agent Brainstorming

Al disparar brainstorm para una sesión:
1. Busca agentes del departamento
2. Para cada agente, carga sus EOD reports (7 días) + inbox items de la sesión
3. Llama a Claude con prompt personalizado por agente:
   ```
   Eres {name}, {role} en Emiralia.
   Basándote en tu trabajo reciente y las ideas en agenda,
   propón UNA mejora o proyecto concreto. Sé específico.
   ```
4. Guarda en `weekly_brainstorms`
5. El usuario puede responder inline a cada contribución
6. "Aceptar y crear tarea/proyecto" convierte la contribución en acción

### 3.4 Refactor WeeklyBoard.jsx

Tabs principales: `Inbox | Weeklies | Pipeline`

Al ver una sesión específica, sub-tabs:
- **Resumen**: Header con semana, fecha, status
- **Inbox de la semana**: Items importados del inbox
- **Brainstorm**: Contribuciones de agentes + respuestas usuario
- **Reporte**: Smart report (Fase 4)

**Componente `BrainstormPanel.jsx`:**
- Botón "Iniciar Brainstorm" (loading: "Agentes pensando...")
- Card por agente: avatar, nombre, rol, su propuesta
- Input para responder por contribución
- Botón "Aceptar como tarea" o "Aceptar como proyecto"

**Archivos:**
- `apps/dashboard/server.js` (endpoints brainstorm + import)
- `apps/dashboard/src/pages/WeeklyBoard.jsx` (refactor completo)
- `apps/dashboard/src/components/BrainstormPanel.jsx` (nuevo)

---

## Fase 4: Smart Weekly Report

### 4.1 Endpoint `/api/weekly-sessions/:id/report`

Genera reporte automático desde datos reales:
- **Tareas**: completadas vs planificadas (de EOD reports)
- **Blockers**: lista con status de resolución
- **Mood/Sentimiento**: distribución y tendencia
- **KPIs por departamento**: Data → propiedades scrapeadas; Content → artículos; etc.
- **Comparativa**: deltas vs semana anterior

Estructura del report JSONB:
```json
{
    "period": { "week": 10, "start": "2026-03-02", "end": "2026-03-06" },
    "tasks": { "completed": 12, "planned": 15, "rate": 0.8 },
    "blockers": [{ "description": "...", "agent": "...", "resolved": false }],
    "mood": { "positive": 3, "neutral": 1, "negative": 0, "trend": "stable" },
    "kpis": { "properties_scraped": 450 },
    "vs_last_week": { "tasks_delta": +3, "mood_trend": "improving" }
}
```

### 4.2 Componente `WeeklyReport.jsx`

- Grid de métricas (cards con iconos, valores, deltas con flechas verde/roja)
- Lista de blockers con indicadores de severidad
- Mood display con emojis y barra de distribución
- Sección KPIs adaptada por departamento

**Archivos:**
- `apps/dashboard/server.js` (endpoint report)
- `apps/dashboard/src/components/WeeklyReport.jsx` (nuevo)

---

## Fase 5: Pipeline Real

### 5.1 Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/pipeline` | Proyectos filtrados por department + status |
| `PATCH` | `/api/projects/:id/status` | Mover proyecto entre estados |

### 5.2 Componente `PipelineBoard.jsx`

Kanban con columnas: `Planning | In Progress | Completed | Paused`
- Cards con: nombre, presupuesto, timeline, barra progreso de tareas
- Click para cambiar status (drag-and-drop opcional, inicialmente botones)
- Conectado a tabla `projects` existente

**Archivos:**
- `apps/dashboard/server.js` (endpoints pipeline)
- `apps/dashboard/src/components/PipelineBoard.jsx` (nuevo)

---

## Flujo end-to-end

```
Durante la semana:
  Telegram /idea → bot.js → core.js → projects + inbox_items
  Dashboard chat → PMAgentChat → /api/chat/pm-agent → core.js → inbox_items

Lunes (Weekly):
  Crear sesión → auto-import inbox → ver agenda
  Brainstorm → agentes proponen → usuario acepta/descarta
  Report → métricas reales de EODs
  Pipeline → proyectos aprobados en kanban
```

---

## Verificación

1. **Inbox**: Crear idea desde dashboard chat, verificar que aparece en inbox con conversación
2. **Telegram sync**: Enviar /idea por Telegram, verificar que aparece en inbox del dashboard
3. **Weekly import**: Crear weekly, verificar que importa ideas pendientes del departamento
4. **Brainstorm**: Disparar brainstorm, verificar que cada agente genera contribución basada en EODs
5. **Report**: Generar reporte con EODs existentes, verificar métricas reales
6. **Pipeline**: Aprobar proyecto desde inbox, verificar que aparece en kanban
7. **E2E**: Idea en Telegram → inbox → weekly → brainstorm → proyecto aprobado → pipeline
