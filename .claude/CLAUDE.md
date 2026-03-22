# Emiralia — CLAUDE.md

**Emiralia** es el primer buscador inteligente de propiedades en Emiratos Árabes Unidos para el mercado hispanohablante. Opera mediante **agentes de IA especializados** que replican los departamentos de una empresa real, coordinados a través del framework WAT (Workflows · Agents · Tools).

---

## Framework WAT

| Capa | Dónde | Qué hace | Inventario |
|------|-------|----------|------------|
| **Workflows** | `.claude/workflows/` | SOPs: objetivo, inputs, agentes, outputs, edge cases | [WORKFLOWS.md](WORKFLOWS.md) |
| **Agents** | `.claude/agents/` | Roles especializados con skills y tools asignados | [AGENTS.md](AGENTS.md) |
| **Tools** | `tools/` | Scripts deterministas: APIs, DB, transformaciones | [TOOLS.md](TOOLS.md) |
| **Skills** | `.claude/skills/` | Capacidades invocables por agente o por `/comando` | [SKILLS.md](SKILLS.md) |

**Regla core:** Antes de construir algo nuevo, revisa `tools/` y `.claude/skills/`. Si algo falla: corrige el tool, verifica, actualiza el workflow.

---

## Sistema de Memoria (WAT Memory)

Todo agente de Emiralia tiene acceso a memoria persistente en PostgreSQL. Es obligatorio usarla.

### Tools de memoria (incluir en todo agente nuevo)
| Tool | Qué hace |
|------|----------|
| `tools/db/memory.js` | Leer/escribir memoria propia del agente (key-value, scope private o shared) |
| `tools/db/wat-memory.js` | Consultar el estado compartido de otros agentes (coordinación cross-agente) |

### Comandos esenciales
```bash
# Escribir memoria (upsert)
node tools/db/memory.js set <agentId> <key> <value_json> [shared|private]

# Leer memoria propia
node tools/db/memory.js get <agentId> <key>
node tools/db/memory.js list <agentId>

# Leer estado de otros agentes (WAT Memory)
node tools/db/wat-memory.js status              # todos los agentes
node tools/db/wat-memory.js agent <agentId>     # un agente específico
node tools/db/wat-memory.js check <agentId> <key>  # consulta puntual
```

### Reglas de memoria para agentes
1. **Leer antes de actuar.** Al inicio de cada tarea, consultar memoria propia y estado relevante de otros agentes.
2. **Escribir al terminar.** Al completar una tarea, persistir el estado con scope `shared` para que otros agentes puedan coordinarse.
3. **Scope `shared`** para todo lo que otros agentes necesiten saber. Scope `private` para estado interno.
4. **Al crear un agente nuevo**, registrarlo en la tabla `agents` y añadir las dos tools de memoria + sus claves recomendadas en el `.md`.

---

## Outputs

| Tipo | Descripción |
|------|-------------|
| `document` | Fichas, informes, análisis |
| `table` | Propiedades, leads, métricas |
| `asset` | Creatividades, PDFs, exports |

**Destinos:** `database` · `document_store` · `spreadsheet` · `storage` · `platform` · `local`

**Modos de escritura:** `create_new` · `overwrite` · `update` · `append`
> Si el destino ya tiene datos y el workflow no especifica modo → **detente y pregunta**.

---

## Estructura del proyecto

```
.claude/
  CLAUDE.md          ← este fichero (README ejecutivo)
  AGENTS.md          ← inventario de 9 agentes activos + 7 planificados
  SKILLS.md          ← catálogo de 35+ skills invocables
  TOOLS.md           ← documentación de 46 tools
  WORKFLOWS.md       ← 7 workflows activos + 4 planificados
  RULES.md           ← rules de sistema + convenciones
  BUSINESS_PLAN.md   ← norte estratégico (visión, modelo B2B, roadmap)
  agents/            ← definiciones de agentes por categoría
  skills/            ← skills por dominio (ops, content, design, producto, gtm, ejecucion, marketing, data)
  workflows/         ← SOPs detallados
  rules/             ← rules de sistema (auto-dev-server, brand-guidelines, business-plan-alignment, agent-workflow)
tools/               ← scripts ejecutables (Node.js)
.env                 ← API keys (NUNCA en otro sitio)
docker-compose.yml   ← PostgreSQL + Adminer
```

---

## Quick Reference

| ¿Qué necesitas? | Archivo | Descripción |
|----------------|---------|-------------|
| **Ver agentes disponibles** | [AGENTS.md](AGENTS.md) | 10 agentes activos (content, translation, frontend, dev, data, pm, marketing, research, wat-auditor, legal) + 6 planificados |
| **Invocar un skill** | [SKILLS.md](SKILLS.md) | 35+ skills organizados por dominio (usa `/comando` en Claude Code) |
| **Usar un tool** | [TOOLS.md](TOOLS.md) | 46 tools documentados (scraping, DB, memoria, tracking, traducción, PM, research) |
| **Ejecutar un workflow** | [WORKFLOWS.md](WORKFLOWS.md) | 7 SOPs activos (data intelligence, GTM planning, sprint planning, scraping, PM review, design loop) |
| **Consultar rules** | [RULES.md](RULES.md) | 3 core rules (auto-dev-server, brand-guidelines, business-plan-alignment) + convenciones (skills 2.0, memoria, tracking, código) |
| **Entender la visión** | [BUSINESS_PLAN.md](BUSINESS_PLAN.md) | Norte estratégico: modelo B2B, roadmap, estado actual vs visión |
| **Ver cambios del sistema** | [CHANGELOG.md](CHANGELOG.md) | Historial de cambios estructurales (reorganización modular 2026-03-13) |

---

## Protocolo de Entrada

**Toda conversación nueva pasa por el PM Agent.** Antes de responder o ejecutar cualquier tarea, evaluar:

| Tipo de petición | Acción |
|-----------------|--------|
| **Tarea simple** (un agente, < 1 día) | Delegar directamente al agente/skill más adecuado |
| **Workflow existente** | Lanzar el SOP correspondiente (ver [WORKFLOWS.md](WORKFLOWS.md)) |
| **Proyecto nuevo** (multi-agente, multi-fase) | Flujo de aprobación → `/proyecto-nuevo` → guardar en DB y dashboard |
| **Bug / mejora puntual en proyecto existente** | `/task [ID]` → asignar ticket al agente idóneo |

### Flujo de Proyectos

```
1. Usuario describe idea/necesidad
2. PM evalúa → propuesta (problema, solución, coste, riesgo)
3. Usuario aprueba con /ok
4. PM ejecuta /proyecto-nuevo → crea MD en .claude/projects/ + guarda en DB
5. Proyecto visible en dashboard (status: Planning)
6. Al aprobar para ejecución → /proyecto-aprobar [ID] → status: In Progress
7. Al terminar → status: Completed (via dashboard o update_project_status.js)
```

### Template estándar `.claude/projects/[ID]-[slug].md`

```md
---
id: [ID]
status: Planning | In Progress | Completed | Paused
created: [fecha]
agents: [lista de agentes involucrados]
---
# [Nombre del Proyecto]

## Problema
## Solución
## Métricas de éxito
## Fases y tareas
## Post-MVP / Hoja de Ruta
```

### Agentes disponibles para asignación

Ver tabla completa en [AGENTS.md](AGENTS.md). Resumen de coste relativo:
- **Bajo coste**: Data Agent, Content Agent, SEO Agent
- **Coste medio**: Design Agent, Marketing Agent
- **Alto coste**: Dev Agent, Sales Agent (human-in-loop)
