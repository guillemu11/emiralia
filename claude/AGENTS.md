# Agentes de Emiralia

Este documento lista todos los agentes del sistema WAT, activos y planificados.

---

## 🏛️ Internos (dentro de la plataforma)

Agentes que operan exclusivamente dentro del ecosistema Emiralia.

| Agente | Rol | Status | Skills Principales | File |
|--------|-----|--------|-------------------|------|
| **[[content-agent\|Content Agent]]** | Fichas de propiedades, blog, descripciones SEO en español | ✅ Activo | — | [content-agent.md](agents/content/content-agent.md) |
| **[[translation-agent\|Translation Agent]]** | Árabe/inglés → español con precisión inmobiliaria | ✅ Activo | [[traducir]] | [translation-agent.md](agents/content/translation-agent.md) |
| **[[frontend-agent\|Frontend Agent]]** | UI/UX, creatividades, banners, mockups | ✅ Activo | [[ui-ux-pro-max]], [[screenshot-loop]] | [frontend-agent.md](agents/design/frontend-agent.md) |
| **[[dev-agent\|Dev Agent]]** | Features, bugs, PRs en el codebase | ✅ Activo | [[dev-server]] | [dev-agent.md](agents/dev/dev-agent.md) |
| **[[data-agent\|Data Agent]]** | Extrae, limpia y normaliza datos de propiedades EAU | ✅ Activo | [[propertyfinder-scraper]], [[consultas-sql]], [[analisis-cohortes]], [[detectar-duplicados]], [[skill-stats]], [[panicselling-scraper]] | [data-agent.md](agents/data/data-agent.md) |

---

## 🔄 Mixtos (dentro y fuera)

Agentes que operan tanto en Emiralia como en sistemas externos.

| Agente | Rol | Status | Skills Principales | File |
|--------|-----|--------|-------------------|------|
| **[[pm-agent\|PM Agent]]** | Sprints, backlog, coordinación entre agentes | ✅ Activo | [[estrategia-producto]], [[propuesta-valor]], [[perfil-cliente-ideal]], [[analisis-competidores]], [[tamanio-mercado]], [[estrategia-gtm]], [[segmento-entrada]], [[loops-crecimiento]], [[mapa-viaje-cliente]], [[crear-prd]], [[priorizar-features]], [[historias-usuario]], [[pre-mortem]], [[planificar-sprint]], [[pm-challenge]], [[cerrar-proyecto]], [[pm-context-audit]], [[analisis-ab]], [[analisis-sentimiento]] | [pm-agent.md](agents/product/pm-agent.md) |
| **[[marketing-agent\|Marketing Agent]]** | Campañas, copies, canales, métricas | ✅ Activo | [[ideas-posicionamiento]], [[metricas-norte]], [[ideas-marketing]], [[battlecard-competitivo]] | [marketing-agent.md](agents/marketing/marketing-agent.md) |

---

## 🔧 Operaciones (meta-sistema)

Agentes que gestionan el sistema WAT mismo.

| Agente | Rol | Status | Skills Principales | File |
|--------|-----|--------|-------------------|------|
| **[[wat-auditor-agent\|WAT Auditor Agent]]** | Auditoría del sistema WAT: consistencia, completitud, gaps y mejoras | ✅ Activo | [[wat-audit]] | [wat-auditor-agent.md](agents/ops/wat-auditor-agent.md) |
| **[[research-agent\|Research Agent]]** | Monitorea fuentes externas (Anthropic, GitHub, comunidad) y genera intelligence reports | ✅ Activo | [[research-monitor]] | [research-agent.md](agents/ops/research-agent.md) |

---

## 📋 Planificados (Roadmap)

Agentes definidos conceptualmente pero sin implementación (.md, skills, tools). Se activarán según necesidad.

| Agente | Rol | Prioridad | Timeline Estimado | Bloqueadores |
|--------|-----|-----------|-------------------|--------------|
| **SEO Agent** | Keywords, metadatos, arquitectura de enlaces | Media | Q2 2026 | Espera a validación B2B con developers |
| **Sales Agent** | Pipeline compradores hispanohablantes, leads | Alta | Q1 2026 | Necesita CRM + integración Telegram/WhatsApp |
| **Customer Success Agent** | Onboarding, consultas, feedback | Media | Q2 2026 | Espera a primeros 10 clientes B2B |
| **Media Buyer Agent** | Inversión publicitaria Meta/Google/TikTok | Baja | Q3 2026 | Espera a PMF + presupuesto marketing |
| **Financial Agent** | Presupuestos, CAC, rentabilidad | Baja | Q3 2026 | Espera a revenue recurrente |
| **Partnerships Agent** | Promotoras, agencias y brokers en EAU | Media | Q2 2026 | Espera a validación B2B |
| **Legal & Compliance Agent** | Contratos, normativa EAU, compradores extranjeros | Baja | Q3 2026 | Espera a expansión internacional |

---

## Matriz de Coordinación

Coordinación cross-agente mediante **WAT Memory** ([[postgresql]]).

| Agente A | Agente B | Workflow Común | Memoria Compartida | Frecuencia |
|----------|----------|----------------|-------------------|------------|
| [[data-agent]] | [[content-agent]] | Scrape → Traducción → Publicación | `last_scrape_run`, `properties_pending_translation` | Diaria |
| [[pm-agent]] | [[dev-agent]] | [[sprint-planning\|Sprint Planning]] → Implementación | `sprint_active`, `tasks_in_progress` | Semanal |
| [[research-agent]] | [[wat-auditor-agent]] | Monitor externo → Auditoría interna | `anthropic_updates`, `wat_audit_pending` | Semanal |
| [[marketing-agent]] | [[pm-agent]] | [[gtm-planning\|GTM Planning]] → Priorización Features | `campaigns_active`, `target_segments` | Mensual |
| [[frontend-agent]] | [[dev-agent]] | Diseño → Implementación | `designs_pending_review`, `ui_components_library` | Continua |
| [[translation-agent]] | [[content-agent]] | Traducción → Publicación | `translations_queue`, `glossary_updates` | Diaria |
| [[data-agent]] | [[pm-agent]] | Analytics → Decisiones Producto | `property_stats`, `user_behavior`, `market_trends` | Semanal |

---

## 🚀 Cómo Operar con Agentes

Los 9 agentes activos de Emiralia son accesibles desde **dos canales**:

### 📱 Telegram Bot

**Inicio rápido:**
```bash
# 1. Arrancar el bot
node tools/telegram/bot.js

# 2. En Telegram, enviar:
/start
```

**Comandos principales:**
- `/agents` — Ver lista de 9 agentes disponibles
- `/agent <id>` — Cambiar agente activo (ej: `/agent data-agent`)
- `/whoami` — Ver agente actual
- `/skill <name> [args]` — Ejecutar skill (ej: `/skill consultas-sql city=Dubai`)
- `/list projects` — Listar recursos (projects, tasks, memory, properties, etc.)
- `/create project name="..."` — Crear recursos
- `/help` — Ver ayuda completa

**Documentación completa:** [docs/agent-command-center/telegram-commands.md](../docs/agent-command-center/telegram-commands.md)

### 🌐 Dashboard Web

**Inicio rápido:**
```bash
# 1. Arrancar dashboard
cd apps/dashboard
npm run dev

# 2. Abrir navegador
http://localhost:3001
```

**Features:**
- ✅ Chat 1:1 con cualquier agente
- ✅ Streaming en tiempo real (SSE)
- ✅ Persistencia de conversaciones
- ✅ Historial completo
- ✅ Activity log (eventos del agente)

**Documentación completa:** [docs/agent-command-center/dashboard-guide.md](../docs/agent-command-center/dashboard-guide.md)

### 🔗 Recursos Adicionales

- [Quick Start Guide](../docs/agent-command-center/quick-start.md) — Guía de 5 minutos
- [README General](../docs/agent-command-center/README.md) — Arquitectura y overview
- [Proyecto Completo](.claude/projects/agent-command-center.md) — Documento ejecutable para Claude

**Infraestructura compartida:**
- **Tool Execution Engine** — 18+ tools disponibles
- **Context Injection** — Carga automática de agente + memoria + eventos
- **Conversation Persistence** — PostgreSQL (`agent_conversations`)
- **Event Logging** — Tracking unificado (`raw_events`)

---

## Registro de Nuevos Agentes

Al crear un agente nuevo:

1. **Crear archivo `.md` en `.claude/agents/<categoria>/<agente-id>.md`**
2. **Incluir tools de memoria:**
   ```markdown
   ## Tools disponibles
   - [[memory.js]] — Leer y escribir memoria persistente del agente
   - [[wat-memory.js]] — Consultar estado compartido de otros agentes
   ```
3. **Definir claves de memoria recomendadas**
4. **Registrar en DB:**
   ```bash
   node -e "
   import pool from './tools/db/pool.js';
   await pool.query(\`INSERT INTO agents (id, name, role, department)
     VALUES ('agent-id','Nombre','Rol','dept')
     ON CONFLICT (id) DO NOTHING\`);
   await pool.end();
   " --input-type=module
   ```
5. **Actualizar esta tabla en AGENTS.md**
6. **Añadir a matriz de coordinación si colabora con otros agentes**
