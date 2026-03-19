# Tools de Emiralia

Inventario completo de scripts ejecutables del sistema WAT.

**Total: 46 tools** | Última actualización: 2026-03-13

---

## Database (`db/`) — 17 tools

Tools para interactuar con PostgreSQL (propiedades, memoria WAT, tracking).

| Tool | Propósito | Input | Output | Usado por | Tracking |
|------|-----------|-------|--------|-----------|----------|
| `memory.js` | Leer/escribir memoria persistente del agente (key-value, scope shared/private) | `set\|get\|list <agentId> <key> [value]` | JSON o texto plano | Todos los agentes | ✅ |
| `wat-memory.js` | Consultar estado compartido de otros agentes (coordinación cross-agente) | `status\|agent\|check <agentId> [key]` | JSON con memoria shared de agentes | Todos los agentes | ✅ |
| `track_skill.js` | Registrar invocación de skill/tool (agent_id, skill_name, domain, status) | `<agentId> <skillName> <domain> <status>` | Confirmación de inserción | Todos los agentes (vía `trackSkill()`) | N/A (es el tracker) |
| `query_skill_usage.js` | Consultar estadísticas de uso de skills (últimas 30d, frecuencia, adoption) | `[agentId] [skillName] [days]` | JSON con stats | Data Agent, `/skill-stats` | ✅ |
| `query_properties.js` | Query SQL read-only sobre tabla properties | SQL query string | JSON rows | Data Agent, `/consultas-sql` | ✅ |
| `detect_duplicates.js` | Detectar propiedades duplicadas cross-broker (fuzzy matching) | `[threshold]` | JSON con pares duplicados | Data Agent, `/detectar-duplicados` | ✅ |
| `save_project.js` | Guardar proyecto en tabla `projects` (status: planning\|active\|completed) | JSON project object | project_id | PM Agent, `/cerrar-proyecto` | ✅ |
| `complete_project.js` | Marcar proyecto como completado + generar resumen | `<projectId>` | JSON con project + summary | PM Agent, `/cerrar-proyecto` | ✅ |
| `save_research.js` | Guardar research findings en tabla `research` | JSON research object | research_id | Research Agent, `/research-monitor` | ✅ |
| `init_db.js` | Inicializar schema de DB (tables, indexes) | — | Confirmación | Setup manual | ❌ |
| `migrate_memory.js` | Migrar memoria antigua a nuevo schema | — | Confirmación | Mantenimiento | ❌ |
| `seed_agents.js` | Insertar agentes iniciales en tabla `agents` | — | Confirmación | Setup manual | ❌ |
| `pool.js` | Pool de conexiones PostgreSQL (singleton) | — | Pool instance | Todos los db tools | N/A (utility) |
| `check_db_count.js` | Verificar número de propiedades en DB | — | Count | Data Agent | ❌ |
| `check_db_full.js` | Query completa de propiedades con stats | — | JSON rows | Data Agent | ❌ |

---

## Workspace Skills (`workspace-skills/`) — 9 tools

Tools para tracking de actividades, EOD/weekly reports.

| Tool | Propósito | Input | Output | Usado por | Tracking |
|------|-----------|-------|--------|-----------|----------|
| `skill-tracker.js` | Exporta `trackSkill()` function para registrar invocaciones | `trackSkill(agentId, skillName, domain, status)` | Promise | Todos los tools | N/A (utility) |
| `activity-harvester.js` | Extraer actividades del log de skill_invocations (last 24h/7d) | `<timeframe>` | JSON con activities | `/eod-report`, `/weekly-brainstorm` | ✅ |
| `eod-generator.js` | Generar End-of-Day report desde activity-harvester | — | Markdown report | `/eod-report` | ✅ |
| `weekly-generator.js` | Generar Weekly report + brainstorm desde activity-harvester | — | Markdown report | `/weekly-brainstorm` | ✅ |
| `standup-consolidator.js` | Consolidar standups de agentes desde WAT Memory | — | JSON consolidado | `/planificar-sprint` | ✅ |
| `workflow-nightly.js` | Workflow nocturno: EOD auto + consolidación | — | Confirmación | Cron nightly | ✅ |
| `workflow-weekly.js` | Workflow semanal: weekly report + research monitor | — | Confirmación | Cron weekly | ✅ |
| `skill-coverage-checker.js` | Verificar qué tools NO tienen trackSkill() implementado | — | Lista de tools sin tracking | `/wat-audit` | ❌ |
| `seed-skill-invocations.js` | Seed de invocaciones de prueba (testing) | — | Confirmación | Testing | ❌ |

---

## PM Agent (`pm-agent/`) — 5 tools

Tools específicos del PM Agent para auditoría de contexto.

| Tool | Propósito | Input | Output | Usado por | Tracking |
|------|-----------|-------|--------|-----------|----------|
| `context-auditor.js` | Auditar completitud del contexto del PM Agent (BUSINESS_PLAN, skills, memoria) | — | JSON con audit results | `/pm-context-audit` | ✅ |
| `context-builder.js` | Construir contexto completo del PM Agent (consolidar fuentes) | — | JSON con contexto | PM Agent init | ❌ |
| `audit-checks.js` | Suite de checks de auditoría (business plan alignment, skill coverage) | — | JSON con checks | `/pm-context-audit` | ❌ |
| `core.js` | Core functions del PM Agent (utils compartidos) | — | Exports | PM Agent tools | N/A (utility) |
| `inbox-cli.js` | CLI para gestionar inbox del PM Agent (ideas, feedback) | `add\|list\|archive <item>` | Confirmación | PM Agent manual | ❌ |

---

## Research Agent (`research-agent/`) — 5 tools

Tools para monitoreo de fuentes externas (Anthropic, GitHub, comunidad).

| Tool | Propósito | Input | Output | Usado por | Tracking |
|------|-----------|-------|--------|-----------|----------|
| `fetch-anthropic-changelog.js` | Scrape changelog de Anthropic (claude.ai/updates) | — | JSON con updates | `/research-monitor` | ✅ |
| `fetch-github-releases.js` | Fetch releases de anthropics/claude-code (GitHub API) | — | JSON con releases | `/research-monitor` | ✅ |
| `fetch-community.js` | Scrape Reddit/X/Discord de comunidad Claude | — | JSON con posts | `/research-monitor` | ✅ |
| `orchestrator.js` | Orquestar research-monitor: fetch all + consolidate | — | JSON consolidado | `/research-monitor` | ✅ |
| `relevance-filter.js` | Filtrar research findings por relevancia (scoring) | JSON research | JSON filtered | `/research-monitor` | ❌ |

---

## Apify Integration (`tools/`) — 5 tools

Tools para scraping vía Apify (PropertyFinder, PanicSelling).

| Tool | Propósito | Input | Output | Usado por | Tracking |
|------|-----------|-------|--------|-----------|----------|
| `apify_propertyfinder.js` | Scrape propiedades de PropertyFinder.ae vía Apify Actor | `<location> <propertyType>` | JSON con properties | `/propertyfinder-scraper` | ✅ |
| `apify_panicselling.js` | Scrape price drops de panicselling.xyz vía Apify Actor | — | JSON con drops | `/panicselling-scraper` | ✅ |
| `find_last_apify_run.js` | Encontrar última run exitosa de actor en Apify | `<actorId>` | run_id | Data Agent | ❌ |
| `get_apify_run_details.js` | Obtener detalles de una run específica | `<runId>` | JSON con run details | Data Agent | ❌ |
| `fetch_dataset.js` | Descargar dataset completo de Apify run | `<datasetId>` | JSON con items | Data Agent | ❌ |

---

## Telegram Integration (`telegram/`) — 3 tools

Tools para bot de Telegram (notifications, skill ranking).

| Tool | Propósito | Input | Output | Usado por | Tracking |
|------|-----------|-------|--------|-----------|----------|
| `bot.js` | Bot de Telegram para notificaciones y comandos | — | Event loop | Background process | ❌ |
| `telegram-prompt.js` | Prompt builder para mensajes de Telegram | Template + data | Formatted message | `bot.js` | ❌ |
| `skill-ranking-prompt.js` | Generar ranking de skills más usados para Telegram | — | Formatted message | `bot.js` | ❌ |

---

## Translation (`translate/`) — 2 tools

Tools para traducción EN→ES con glosario inmobiliario.

| Tool | Propósito | Input | Output | Usado por | Tracking |
|------|-----------|-------|--------|-----------|----------|
| `translate.js` | Traducir texto EN→ES con glosario inmobiliario + variante regional | `<text> <variant>` | Translated text | `/traducir` | ✅ |
| `glossary.js` | Glosario inmobiliario EAU (EN→ES) con términos técnicos | — | JSON glossary | `translate.js` | N/A (data) |

---

## Utilities (`tools/`) — 2 tools

Tools de utilidad general (PDFs, etc).

| Tool | Propósito | Input | Output | Usado por | Tracking |
|------|-----------|-------|--------|-----------|----------|
| `generate-architecture-pdf.js` | Generar PDF de arquitectura del sistema WAT | — | PDF file | Manual | ❌ |
| `generate-business-plan-pdf.js` | Generar PDF del Business Plan | — | PDF file | Manual | ❌ |

---

## Tools sin Tracking

**17 tools** aún no implementan `trackSkill()`. Priorizar según uso real:

### Alta Prioridad (uso frecuente)
1. `init_db.js` - inicialización DB
2. `check_db_count.js` - queries frecuentes
3. `check_db_full.js` - queries frecuentes
4. `skill-coverage-checker.js` - usado por `/wat-audit`
5. `context-builder.js` - usado por PM Agent

### Media Prioridad (uso ocasional)
6. `find_last_apify_run.js` - scraping workflows
7. `get_apify_run_details.js` - scraping workflows
8. `fetch_dataset.js` - scraping workflows
9. `relevance-filter.js` - research workflows

### Baja Prioridad (utilities/setup)
10. `migrate_memory.js` - mantenimiento
11. `seed_agents.js` - setup inicial
12. `seed-skill-invocations.js` - testing
13. `audit-checks.js` - utility
14. `inbox-cli.js` - manual
15. `bot.js` - background process
16. `telegram-prompt.js` - utility
17. `skill-ranking-prompt.js` - utility

---

## Estadísticas de Uso (últimas 30d)

**Top 10 tools más usados:**

1. `memory.js` - 1,247 invocaciones (coordinación cross-agente)
2. `track_skill.js` - 982 invocaciones (tracking automático)
3. `query_properties.js` - 156 invocaciones (análisis SQL)
4. `apify_propertyfinder.js` - 89 invocaciones (scraping diario)
5. `translate.js` - 67 invocaciones (traducción contenido)
6. `activity-harvester.js` - 45 invocaciones (EOD/weekly reports)
7. `wat-memory.js` - 34 invocaciones (consultas cross-agente)
8. `query_skill_usage.js` - 28 invocaciones (skill stats)
9. `eod-generator.js` - 23 invocaciones (EOD automático)
10. `context-auditor.js` - 19 invocaciones (PM audits)

**Adoption rate:** 29/46 tools (63%) con tracking implementado

---

## Añadir trackSkill() a un Tool

**Plantilla:**

```javascript
import { trackSkill } from '../workspace-skills/skill-tracker.js';

async function myTool() {
  // IMPORTANTE: Añadir al inicio de la función
  await trackSkill(
    'agent-id',        // ej: 'data-agent'
    'tool-name',       // ej: 'query-properties'
    'domain',          // ej: 'data', 'ops', 'content'
    'completed'        // 'completed' | 'failed' | 'in_progress'
  ).catch(() => {});   // Fail silently (no bloquear tool)

  // ... lógica del tool
}
```

**Verificar cobertura:**
```bash
node tools/workspace-skills/skill-coverage-checker.js
```

---

## Crear un Tool Nuevo

1. **Ubicación:** `tools/<categoria>/<tool-name>.js`
2. **Estructura:**
   ```javascript
   import { trackSkill } from '../workspace-skills/skill-tracker.js';
   import pool from '../db/pool.js'; // si usa DB

   async function toolName(args) {
     // Track al inicio
     await trackSkill('agent-id', 'tool-name', 'domain', 'completed').catch(() => {});

     // Lógica
     // ...

     return result;
   }

   // CLI support
   if (import.meta.url === `file://${process.argv[1]}`) {
     const args = process.argv.slice(2);
     toolName(...args).then(console.log).catch(console.error);
   }

   export default toolName;
   ```
3. **Registrar en TOOLS.md** (este archivo)
4. **Test manual:** `node tools/<categoria>/<tool-name>.js [args]`
5. **Verificar tracking:** `node tools/db/query_skill_usage.js [agent-id] [tool-name]`
