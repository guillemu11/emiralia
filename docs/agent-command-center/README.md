# Agent Command Center 🎯

> Sistema unificado de operación multi-agente para Emiralia

**Estado:** ✅ MVP Completado (2026-03-19)
**Versión:** 1.0.0
**Última actualización:** 2026-03-20

---

## 📖 Qué es

Agent Command Center es la infraestructura que permite operar con **cualquier agente de Emiralia** desde:

1. **🤖 Telegram Bot** — Operación móvil 24/7
2. **🌐 Dashboard Web** — Interfaz de escritorio con chat visual

**Agentes disponibles (9):**

- `pm-agent` — Product Management (PRDs, features, priorización)
- `data-agent` — Scraping & Analytics
- `content-agent` — Generación de contenido (listings, blog)
- `translation-agent` — Traducción ES-EN para UAE
- `frontend-agent` — UI/UX y desarrollo frontend
- `dev-agent` — Implementación y code review
- `marketing-agent` — Campañas y estrategia GTM
- `research-agent` — Inteligencia de mercado
- `wat-auditor-agent` — Auditoría del sistema WAT

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT COMMAND CENTER                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📱 TELEGRAM BOT              🌐 DASHBOARD WEB               │
│  ├─ agent-router.js           ├─ AgentChat.jsx              │
│  ├─ skill-executor.js         ├─ ToolExecutionLog.jsx       │
│  ├─ crud-handler.js           └─ ConversationHistory.jsx    │
│  ├─ context-builder.js                                       │
│  └─ session-manager.js             ↓                         │
│           ↓                         ↓                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         SHARED CORE INFRASTRUCTURE                     │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  🔧 Tool Execution Engine                              │  │
│  │  tools/core/tool-executor.js                           │  │
│  │  - Ejecuta tools de forma segura                       │  │
│  │  - Validación de permisos por agente                   │  │
│  │  - Timeout y error handling                            │  │
│  │                                                          │  │
│  │  🧠 Context Injection                                   │  │
│  │  tools/core/context-builder.js                         │  │
│  │  - Carga definición del agente (.claude/agents/)       │  │
│  │  - Inyecta memoria (agent_memory shared)               │  │
│  │  - Añade eventos recientes (raw_events)                │  │
│  │                                                          │  │
│  │  💾 Conversation Manager                                │  │
│  │  tools/core/conversation-manager.js                    │  │
│  │  - Persistencia unificada en DB                        │  │
│  │  - Tabla: agent_conversations                          │  │
│  │                                                          │  │
│  │  📝 Event Logger                                        │  │
│  │  tools/core/event-logger.js                            │  │
│  │  - Log en raw_events                                   │  │
│  │  - Event types: tool_execution, agent_message, etc.    │  │
│  └───────────────────────────────────────────────────────┘  │
│           ↓                                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              DATABASE (PostgreSQL)                     │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  - agent_conversations (conversaciones multi-canal)    │  │
│  │  - telegram_users (usuarios autorizados)               │  │
│  │  - agents (existing)                                   │  │
│  │  - agent_memory (existing)                             │  │
│  │  - raw_events (existing)                               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Setup Base de Datos

```bash
# Arrancar PostgreSQL (Docker)
docker-compose up -d

# Ejecutar migrations
node tools/db/run-migrations.js

# Verificar tablas
psql -h localhost -p 5433 -U emiralia -d emiralia_db -c "\dt"
```

### 2. Configurar Variables de Entorno

Añadir a `.env`:

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_IDS=123456789,987654321  # Tu user_id de Telegram

# Dashboard (opcional en dev)
DASHBOARD_API_KEY=your_secret_key

# Anthropic API
ANTHROPIC_API_KEY=your_api_key
```

### 3. Iniciar Telegram Bot

```bash
node tools/telegram/bot.js
```

Envía `/start` al bot en Telegram para comenzar.

### 4. Iniciar Dashboard

```bash
cd apps/dashboard
npm run dev
```

Abre [http://localhost:3001](http://localhost:3001)

---

## 📱 Usar desde Telegram

Ver documentación completa: [telegram-commands.md](./telegram-commands.md)

**Comandos básicos:**

```bash
/start          # Iniciar bot
/agents         # Ver lista de agentes
/agent <id>     # Cambiar agente activo
/whoami         # Ver agente actual
/help           # Ver ayuda completa
```

**Ejemplo de flujo:**

```
Usuario: /agents
Bot: [Muestra lista de 9 agentes con botones]

Usuario: [Selecciona "📊 data-agent"]
Bot: Ahora hablas con Data Agent. Skills: /propertyfinder-scraper, /consultas-sql, ...

Usuario: /skill propertyfinder-scraper city=Dubai
Bot: [Ejecuta skill y muestra resultados streaming]
```

---

## 🌐 Usar desde Dashboard

Ver documentación completa: [dashboard-guide.md](./dashboard-guide.md)

1. Abre [http://localhost:3001](http://localhost:3001)
2. Navega a "Agents"
3. Selecciona un agente (ej: `pm-agent`)
4. Abre la tab "Chat"
5. Escribe tu mensaje y presiona Enter

El chat soporta:
- ✅ Streaming en tiempo real (SSE)
- ✅ Persistencia de conversaciones
- ✅ Historial completo
- ✅ Auto-scroll
- ✅ Keyboard shortcuts (Enter = send, Shift+Enter = newline)

---

## 🛠️ Features Implementadas

| Feature | Status | Descripción |
|---------|--------|-------------|
| Tool Execution Engine | ✅ | Ejecuta 18+ tools de forma segura |
| Context Injection | ✅ | Carga automática de agente + memoria + eventos |
| Database Schema | ✅ | Tablas `agent_conversations` y `telegram_users` |
| Agent Router (Telegram) | ✅ | Cambiar entre 9 agentes |
| Skill Executor (Telegram) | ✅ | Ejecutar 35+ skills con argumentos |
| CRUD Handler (Telegram) | ✅ | Crear/leer/actualizar/borrar recursos |
| Dashboard Chat UI | ✅ | Componente React con SSE streaming |
| Dashboard Backend API | ✅ | Endpoints `/api/agents/:id/chat` |
| Conversation Persistence | ✅ | Persistencia en PostgreSQL |
| Event Logging | ✅ | Log unificado en `raw_events` |
| Security & Auth | ✅ | Whitelist, rate limiting, input sanitization |

---

## 🔒 Seguridad

### Telegram

- **Whitelist de admins:** Solo usuarios en `TELEGRAM_ADMIN_IDS` son auto-autorizados
- **Rate limiting:** 10 mensajes/minuto por usuario
- **Input sanitization:** Limpieza de caracteres peligrosos
- **Command whitelist:** Solo comandos seguros en dynamic context injection

### Dashboard

- **API Key auth:** Endpoints protegidos con `DASHBOARD_API_KEY` (en producción)
- **CORS:** Configurado para dominios permitidos
- **SQL injection:** Queries parametrizadas con `pg`

**Comandos de administración (Telegram):**

```bash
/authorize <user_id>     # Autorizar usuario
/revoke <user_id>        # Revocar acceso
/list_users              # Ver usuarios autorizados
```

---

## 📊 Database Schema

### `agent_conversations`

```sql
CREATE TABLE agent_conversations (
  id SERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  user_id TEXT NOT NULL,  -- telegram user_id o dashboard user email
  channel TEXT NOT NULL CHECK (channel IN ('telegram', 'dashboard')),
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, agent_id, channel)
);
```

### `telegram_users`

```sql
CREATE TABLE telegram_users (
  user_id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  language_code TEXT DEFAULT 'es',
  active_agent_id TEXT REFERENCES agents(id),
  is_authorized BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('viewer', 'operator', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_interaction_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🧪 Testing

### Testing Manual (Telegram)

1. Envía `/start` al bot
2. Prueba `/agents` → Verifica lista de 9 agentes
3. Selecciona un agente → Verifica confirmación
4. Envía `/whoami` → Verifica agente activo
5. Ejecuta un skill → `/skill consultas-sql city=Dubai`
6. Reinicia el bot → Verifica persistencia con `/whoami`

### Testing Manual (Dashboard)

1. Abre [http://localhost:3001/agents/pm-agent](http://localhost:3001/agents/pm-agent)
2. Abre tab "Chat"
3. Envía mensaje: "¿Qué proyectos activos tenemos?"
4. Verifica streaming en tiempo real
5. Recarga página → Verifica que el historial se carga

### Testing Automatizado

```bash
# Test context builder
node tools/core/test-context-builder.js

# Test DB queries
node tools/db/test-queries.js

# Test agent router
node tools/telegram/agent-router.js
```

---

## 📈 Métricas

| Métrica | Valor |
|---------|-------|
| Agentes operables | 9/9 ✅ |
| Skills ejecutables | 35+ ✅ |
| Tools disponibles | 18+ ✅ |
| Comandos Telegram | 25+ ✅ |
| Endpoints API | 2+ ✅ |
| Líneas de código (nuevo) | ~10,000 |
| Tiempo de respuesta (p90) | <5s |
| Uptime (Railway) | 24/7 |

---

## 🚧 Limitaciones Conocidas

1. **Skills interactivos:** Skills que requieren input interactivo no funcionan en Telegram (documentado)
2. **Tool execution log visual:** Pendiente implementación en Dashboard (Feature 7.5)
3. **Context window:** Conversaciones muy largas (>100 mensajes) se auto-trimman
4. **File attachments:** No soportado en v1.0
5. **Voice input:** No soportado en v1.0

---

## 🔮 Roadmap (Post-MVP)

### Fase 2: Async Skills
- Skills largos (>30s) se ejecutan en background
- Notificación al usuario cuando terminan

### Fase 3: Multi-User Collaboration
- Conversaciones compartidas entre múltiples usuarios
- Team chat con agente

### Fase 4: Analytics Dashboard
- Métricas de uso por agente
- Skills más usados
- Gráficos de actividad

### Fase 5: Voice Commands
- Transcripción de audio con Whisper
- Soporte para todos los agentes

### Fase 6: Scheduled Tasks
- Programar skills desde Telegram: `/schedule propertyfinder-scraper daily at 09:00`

### Fase 7: Agent-to-Agent Communication
- PM Agent puede invocar Data Agent directamente
- Coordinación automática entre agentes

---

## 📚 Documentación Adicional

- [Comandos de Telegram](./telegram-commands.md) — Referencia completa de comandos
- [Dashboard Guide](./dashboard-guide.md) — Cómo usar la interfaz web
- [Quick Start Guide](./quick-start.md) — Guía de 5 minutos
- [Proyecto completo](../../.claude/projects/agent-command-center.md) — Documento ejecutable para Claude

---

## 🤝 Contribuir

Este es un proyecto interno de Emiralia. Para contribuir:

1. Lee el [Business Plan](../../.claude/BUSINESS_PLAN.md)
2. Revisa el [Framework WAT](../../.claude/CLAUDE.md)
3. Consulta las convenciones en [RULES.md](../../.claude/RULES.md)

---

## 📞 Soporte

**Issues:** Reportar en el repositorio interno

**Contacto:** Equipo de desarrollo de Emiralia

---

**🎉 ¡El sistema está operativo! Empieza con `/start` en Telegram o abre el Dashboard.**
