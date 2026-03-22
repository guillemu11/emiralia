# Rules del Sistema WAT

Reglas de sistema, convenciones y estándares que aplican a todos los agentes.

**Total: 4 core rules** | **4 secciones de convenciones** | Última actualización: 2026-03-22

---

## Core Rules

Rules que se activan automáticamente en contextos específicos.

| Rule | Cuándo se Activa | Acción Requerida | Prioridad | File |
|------|------------------|------------------|-----------|------|
| **Auto Dev Server** | Al crear/modificar página en `apps/website/` | Levantar `npm run dev` automáticamente sin esperar petición del usuario | Alta | [auto-dev-server.md](rules/auto-dev-server.md) |
| **Brand Guidelines** | Al diseñar UI, landing pages, dashboards, marketing, banners | Aplicar sistema de diseño: 80/20 light/dark, color system de 12 tokens, componentes documentados | Crítica | [brand-guidelines.md](rules/brand-guidelines.md) |
| **Business Plan Alignment** | Al proponer features, priorizar trabajo, evaluar partnerships, modificar datos | Consultar [BUSINESS_PLAN.md](BUSINESS_PLAN.md) sección "Estado Actual vs Vision" y validar alineación | Alta | [business-plan-alignment.md](rules/business-plan-alignment.md) |
| **Agent Workflow** | Siempre — comportamiento base de todos los agentes | Self-Improvement Loop, Verification Before Done, Autonomous Bug Fixing, Demand Elegance | Alta | [agent-workflow.md](rules/agent-workflow.md) |

---

## Convenciones de Skills 2.0

Los skills de Emiralia usan las capacidades avanzadas de Claude Code Skills.

### Frontmatter Features

| Feature | Frontmatter | Efecto |
|---------|-------------|--------|
| **Context isolation** | `context: fork` | Ejecuta el skill en contexto aislado (no contamina la conversación principal) |
| **Model selection** | `model: haiku\|sonnet\|opus` | Selecciona el modelo óptimo por costo/calidad |
| **Tool restriction** | `allowed-tools: [Bash, Read, ...]` | Restringe qué tools puede usar el skill |
| **Dynamic injection** | `!` seguido de backtick en el body | Inyecta output dinámico de comandos antes de la ejecución |

### Asignación de Modelo

**Guías de selección:**

- **`haiku`** → Tasks ligeras: tracking, queries SQL, monitoreo
  - Costo: ~$0.001/invocación
  - Tiempo: <5s
  - Ejemplos: `/dev-server`, `/consultas-sql`, `/eod-report`

- **`sonnet`** → Tasks analíticas: auditorías, análisis, scraping
  - Costo: ~$0.01/invocación
  - Tiempo: 10-30s
  - Ejemplos: `/wat-audit`, `/analisis-cohortes`, `/priorizar-features`

- **`opus`** → Tasks estratégicas: PRDs, decisiones de producto
  - Costo: ~$0.10/invocación
  - Tiempo: 30-60s
  - Ejemplos: `/crear-prd`, `/estrategia-producto`, `/ui-ux-pro-max`

---

## Convenciones de Código

### Estructura de Archivos

```
.claude/
  CLAUDE.md           # README ejecutivo (<100 líneas)
  AGENTS.md           # Inventario de agentes
  SKILLS.md           # Catálogo de skills
  TOOLS.md            # Documentación de tools
  WORKFLOWS.md        # SOPs cross-agente
  RULES.md            # Este archivo
  BUSINESS_PLAN.md    # Norte estratégico
  agents/             # Definiciones de agentes por categoría
  skills/             # Skills por dominio
  workflows/          # SOPs detallados
  rules/              # Rules de sistema

tools/
  db/                 # Database tools
  workspace-skills/   # Activity tracking, EOD/weekly
  pm-agent/           # PM Agent tools
  research-agent/     # Research Agent tools
  telegram/           # Telegram bot
  translate/          # Translation tools
  [otros]/            # Tools por categoría
```

### Naming Conventions

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| **Agente ID** | kebab-case | `data-agent`, `pm-agent` |
| **Skill name** | kebab-case | `crear-prd`, `wat-audit` |
| **Tool filename** | kebab-case (snake_case legacy OK) | `memory.js`, `query_properties.js` |
| **Workflow filename** | kebab-case | `sprint-planning.md` |
| **Memory key** | snake_case | `last_scrape_run`, `sprint_active` |
| **Database table** | snake_case | `skill_invocations`, `agents` |

### Imports y Exports

**Tools deben exportar:**
```javascript
export default async function toolName(args) {
  // ...
}
```

**Y soportar CLI:**
```javascript
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  toolName(...args).then(console.log).catch(console.error);
}
```

---

## Convenciones de Memoria (WAT Memory)

### Scope

| Scope | Cuándo Usar | Quién Lee |
|-------|-------------|-----------|
| **`shared`** | Info que otros agentes necesitan para coordinarse | Todos los agentes (vía `wat-memory.js`) |
| **`private`** | Estado interno del agente | Solo el agente propietario |

### Naming de Keys

**Formato:** `{entity}_{action}_{modifier}`

**Ejemplos válidos:**
- `last_scrape_run` - última ejecución de scraping
- `sprint_active` - sprint actualmente activo
- `properties_pending_translation` - propiedades en cola de traducción
- `prd_approved` - PRD aprobado para implementación

**Anti-patterns:**
- ❌ `lastScrapeRun` (camelCase, usar snake_case)
- ❌ `run` (demasiado genérico)
- ❌ `temp_data` (no usar "temp", definir qué es)

### Reglas de Coordinación

1. **Leer antes de actuar** - Al inicio de cada tarea, consultar:
   - Memoria propia: `node tools/db/memory.js list <agentId>`
   - Estado de otros agentes: `node tools/db/wat-memory.js status`

2. **Escribir al terminar** - Al completar tarea, persistir estado con scope `shared`:
   ```bash
   node tools/db/memory.js set <agentId> <key> '<value_json>' shared
   ```

3. **Scope `shared` para coordinación** - Todo lo que otros agentes necesiten saber debe ser `shared`

4. **Actualizar documentación** - Al añadir keys nuevas, documentar en el `.md` del agente

### Plantilla para Agentes Nuevos

```markdown
## Tools disponibles
- `tools/db/memory.js` — Leer y escribir memoria persistente del agente
- `tools/db/wat-memory.js` — Consultar el estado compartido de otros agentes

## Claves de memoria recomendadas
| Key | Scope | Descripción |
|-----|-------|-------------|
| `last_task_completed` | shared | Última tarea completada |
| `last_task_at` | shared | Timestamp de la última acción |
```

---

## Convenciones de Tracking

**Regla obligatoria:** Toda tool nueva en `tools/` debe incluir una llamada `trackSkill()` al inicio de su ejecución.

### Implementación

```javascript
import { trackSkill } from '../workspace-skills/skill-tracker.js';

async function myTool() {
  // CRÍTICO: Añadir al inicio
  await trackSkill(
    'agent-id',        // ej: 'data-agent'
    'tool-name',       // ej: 'query-properties'
    'domain',          // ej: 'data', 'ops', 'content'
    'completed'        // 'completed' | 'failed' | 'in_progress'
  ).catch(() => {});   // Fail silently (no bloquear tool si tracking falla)

  // ... lógica del tool
}
```

### Verificación de Cobertura

```bash
node tools/workspace-skills/skill-coverage-checker.js
```

Output: lista de tools sin `trackSkill()` implementado.

**Target:** 100% cobertura en tools de producción.

### Excepciones

Tools que NO necesitan tracking:
- `pool.js` (utility: DB pool)
- `glossary.js` (data: glosario estático)
- `core.js` (utility: funciones compartidas)
- `*-prompt.js` (utilities: builders de prompts)

---

## Reglas de Contexto

Aplican a todos los agentes y conversaciones.

### 1. Español Primero
Todo output de cara al usuario en español de calidad, sensible culturalmente para España y Latinoamérica.

**Ejemplos:**
- ✅ "invertir en propiedades" (neutral)
- ❌ "rentar propiedades" (mexicanismo)
- ✅ "alquilar propiedades" (España) o "arrendar" (Colombia)

### 2. Precisión Inmobiliaria
Precio, m², ubicación, developer y estatus de entrega se verifican antes de publicar. **Un error en precio es crítico.**

**Checklist antes de publicar:**
- [ ] Precio en formato correcto (AED o USD)
- [ ] m² verificado (no confundir sqft con m²)
- [ ] Ubicación completa (comunidad + subcomunidad)
- [ ] Developer correcto (verificar en DB)
- [ ] Estatus de entrega (off-plan, ready, under-construction)

### 3. Privacidad
Datos de leads y compradores con máxima confidencialidad. **Nunca se loguean datos personales.**

**Prohibido loguear:**
- ❌ Emails
- ❌ Teléfonos
- ❌ Nombres completos
- ❌ Pasaportes/IDs

**Permitido loguear (anonimizado):**
- ✅ lead_id (UUID)
- ✅ segment (ej: "españa-inversor")
- ✅ funnel_stage (ej: "awareness")

### 4. EAU-First
Consejos legales, fiscales o de inversión reflejan normativa de Emiratos, no del país del comprador.

**Ejemplos:**
- ✅ "En EAU no hay impuesto sobre ganancias de capital"
- ❌ "En España pagarás 19% sobre plusvalías" (irrelevante para EAU)
- ✅ "Visado de residencia disponible con propiedades >$200k"

### 5. Escalabilidad por Diseño
Cada tool y workflow diseñado para miles de propiedades y leads desde el inicio.

**Anti-patterns:**
- ❌ `for` loop sobre propiedades (N+1 queries)
- ❌ Leer archivo completo en memoria
- ❌ Procesar 1 propiedad a la vez

**Patterns correctos:**
- ✅ Batch inserts (1000 propiedades por query)
- ✅ Streaming (procesar en chunks)
- ✅ Pagination (limit + offset)

### 6. Tracking Obligatorio
Ver sección "Convenciones de Tracking" arriba.

---

## Validación de Rules

### Pre-commit Checks

1. **Brand Guidelines** - si modifica HTML en `apps/website/`:
   ```bash
   grep -c "bg-slate-[89]00\|bg-black" apps/website/*.html
   # Si >2 → REJECT (exceso de fondos oscuros)
   ```

2. **Tracking Coverage**:
   ```bash
   node tools/workspace-skills/skill-coverage-checker.js
   # Si hay tools nuevos sin tracking → WARNING
   ```

3. **Business Plan Alignment** - si modifica `BUSINESS_PLAN.md`:
   ```bash
   # Manual review: ¿el cambio está alineado con la visión?
   ```

### Runtime Checks

- **Auto Dev Server** - trigger automático al modificar `apps/website/*.html`
- **Memory Scope** - validar que keys compartidas tienen scope `shared`
- **Privacy** - scan logs para detectar PII (emails, teléfonos)

---

## Crear una Rule Nueva

1. **Crear archivo:** `.claude/rules/<rule-name>.md`
2. **Estructura:**
   ```markdown
   # Rule: [Nombre]

   Aplica a: [contextos específicos]
   Prioridad: ALTA | MEDIA | BAJA

   ---

   ## Cuando se activa

   [Condiciones específicas que activan la rule]

   ---

   ## Accion requerida

   [Qué debe hacer el agente cuando se activa]

   ---

   ## Patrones de desalineacion a detectar

   | Patron | Descripcion | Respuesta esperada |
   |--------|-------------|-------------------|
   | ... | ... | ... |

   ---

   ## Formato de flag

   [Cómo el agente debe comunicar que detectó desalineación]

   ---

   ## Excepciones

   [Casos en que la rule NO aplica]
   ```
3. **Registrar en RULES.md** (este archivo)
4. **Añadir a pre-commit checks** si es validable automáticamente
5. **Documentar en agentes afectados**

---

## Mantenimiento

- **Mensual:** Review de rules activas (¿siguen siendo relevantes?)
- **Trimestral:** Audit de business plan alignment (con `/wat-audit`)
- **Anual:** Revisión completa de convenciones (adaptarse a cambios en Claude Code)
