---
status: in-progress
owner: gmunoz02
start-date: 2026-03-19
eta: 2026-03-26
blockers: []
dependencies: []
---

# Plan: Implementación de Obsidian para Emiralia

## Context

Emiralia es un proyecto PropTech complejo con:
- **Framework WAT** (Workflows · Agents · Tools · Skills)
- **9 agentes activos** coordinados mediante memoria PostgreSQL
- **7 workflows activos** + 4 planificados
- **35+ skills** organizados por dominio
- **46 tools** documentados

### Problema
La documentación actual está fragmentada en múltiples archivos `.md` lineales sin:
- Visualización de relaciones entre componentes
- Registro de decisiones arquitectónicas ("por qué" detrás de cada decisión)
- Status centralizado de integraciones (Railway, PostgreSQL, Apify, Telegram, Supabase)
- Guía de onboarding para nuevos contributors
- Visibilidad de dependencias entre agentes/workflows/tools

**Impacto actual:**
- Onboarding: 1 semana para un nuevo developer
- Debugging: 30 min promedio (sin runbooks)
- Impact analysis: desconocido antes de hacer cambios
- Knowledge retention: bajo (todo en memoria humana)

### Solución: Obsidian
Obsidian es un editor markdown con:
- **Bidirectional linking** - conectar agentes ↔ skills ↔ workflows ↔ tools
- **Graph view** - visualizar dependencias del sistema WAT
- **100% compatible con estructura actual** - ya tenemos todo en `.md`
- **Git-first** - sync bidireccional con el repo
- **Free** (con plugin Git en lugar de Sync oficial)

**ROI esperado:**
- Onboarding: 1 semana → 1 día
- Debugging: 30 min → 5 min
- Impact analysis: desconocido → 10 segundos
- Knowledge retention: bajo → alto

---

## Análisis de Gaps Críticos

### GAP 1: Sin Visualización de Relaciones (CRÍTICO)
**Problema:** Aunque AGENTS.md menciona que Data Agent usa ciertos tools, no hay forma visual de ver:
- Data Agent → usa qué tools → en qué workflows → qué skills invoca
- PM Agent depende de qué data compartida de otros agentes
- Un skill ¿qué agentes pueden invocarlo?

**Solución Obsidian:**
- Linked notes con `[[agent-name]]`, `[[workflow-name]]`, `[[tool-name]]`
- Graph view interactivo
- Quick preview on hover

---

### GAP 2: Sin Registro de Decisiones Arquitectónicas (ALTO)
**Problema:** No existe un registro de "por qué":
- ¿Por qué se eligió PostgreSQL + Apify + Telegram?
- ¿Por qué agentes tienen memoria compartida y privada?
- ¿Por qué haiku vs sonnet vs opus en cada skill?
- ¿Qué decisiones se rechazaron y por qué?

**Solución Obsidian:**
- Crear `.claude/adr/` (Architecture Decision Records)
- Template estándar: Context → Decision → Consequences → Alternatives Considered
- Backlinks: cada ADR enlazado a componentes afectados

---

### GAP 3: Integraciones Fragmentadas (CRÍTICO)
**Problema:** Railway, PostgreSQL, Apify, Telegram, Supabase están documentadas solo en TOOLS.md. Falta:
- Diagrama de arquitectura
- Estados (working/broken/needs-config)
- Credenciales necesarias
- Health checks

**Solución Obsidian:**
- Crear `.claude/integrations/` con archivo por integración
- Cada archivo: URL, credenciales, health check, status badge
- Enlazado a agentes/tools que lo usan

---

### GAP 4: Sin Status Board de Proyectos (CRÍTICO)
**Problema:** Estado de proyectos está disperso en:
- `.claude/projects/` (3 archivos MD)
- Comentarios en AGENTS.md ("Planificados", "Bloqueadores")
- WAT Memory en PostgreSQL

**Solución Obsidian:**
- Refactor `.claude/projects/` con metadata YAML
- Plugin Kanban o Dataview para status board visual
- Columnas: Planning | In Progress | Review | Done

---

### GAP 5: Sin Guía de Onboarding (ALTO)
**Problema:** No hay camino claro para nuevos contributors.

**Solución Obsidian:**
- Crear `.claude/onboarding/` con:
  - `day-1-setup.md`
  - `understand-wat-in-10min.md`
  - `your-first-skill.md`
  - `your-first-agent.md`
  - `debugging-guide.md`

---

### Otros Gaps (MEDIO/BAJO)
- **GAP 6:** Product Knowledge Base (sin historia de decisiones de producto)
- **GAP 7:** Troubleshooting Runbooks (sin guía de errores)
- **GAP 8:** Dependency Graph (sin visibilidad de dependencias)
- **GAP 9:** Semantic Search (sin búsqueda cross-document)
- **GAP 10:** Version History (sin timeline de evolución)

---

## Propuesta de Implementación

### Opción Recomendada: Vault en el Repo Completo
**Abrir el repositorio Emiralia completo como vault de Obsidian.**

**Ventajas:**
- Zero setup adicional (ya es un repo git)
- Claude Code + Obsidian comparten contexto
- Git plugin sync automático
- No necesita duplicar archivos

**Estructura:**
```
c:\Users\gmunoz02\Desktop\emiralia\  (vault root = repo root)
├── .obsidian/                       (config Obsidian - NO commitear)
├── .obsidian-vault/                 (templates, canvases, diagrams - SÍ commitear)
│   ├── templates/
│   │   ├── agent-template.md
│   │   ├── workflow-template.md
│   │   ├── adr-template.md
│   │   └── integration-template.md
│   ├── canvases/
│   │   ├── wat-framework-visual.canvas
│   │   └── agents-coordination.canvas
│   └── diagrams/
│       └── system-architecture.excalidraw
├── .claude/
│   ├── CLAUDE.md (actualizado con [[links]])
│   ├── AGENTS.md (con [[agent-name]])
│   ├── SKILLS.md (con [[skill-name]])
│   ├── TOOLS.md (con [[tool-name]])
│   ├── WORKFLOWS.md (con [[workflow-name]])
│   ├── adr/                         (NUEVO)
│   │   ├── 001-wat-framework.md
│   │   ├── 002-agent-architecture.md
│   │   ├── 003-memory-model.md
│   │   └── 004-skill-model-selection.md
│   ├── integrations/                (NUEVO)
│   │   ├── postgresql.md
│   │   ├── apify.md
│   │   ├── telegram.md
│   │   ├── railway.md
│   │   └── supabase.md
│   ├── onboarding/                  (NUEVO)
│   │   ├── day-1-setup.md
│   │   ├── understand-wat-in-10min.md
│   │   ├── your-first-skill.md
│   │   ├── your-first-agent.md
│   │   ├── debugging-guide.md
│   │   └── contribute.md
│   ├── troubleshooting/             (NUEVO)
│   │   ├── db-issues.md
│   │   ├── apify-issues.md
│   │   ├── memory-issues.md
│   │   └── telegram-issues.md
│   ├── product-evolution/           (NUEVO)
│   │   ├── hypothesis-log.md
│   │   ├── strategy-iterations.md
│   │   └── feature-graveyard.md
│   └── glossary.md                  (NUEVO)
├── tools/
├── apps/
└── ...
```

---

## Roadmap de Implementación

### **FASE 1: Foundation (Semana 1-2)** — Máximo impacto, mínimo esfuerzo

#### Setup Inicial
1. **Instalar Obsidian** (descargar de obsidian.md)
2. **Abrir vault** → "Open folder as vault" → seleccionar `c:\Users\gmunoz02\Desktop\emiralia\`
3. **Instalar plugins core (gratuitos):**
   - **Obsidian Git** (sync automático cada 5 min)
   - **Dataview** (queries dinámicas)
   - **Graph Analysis** (grafo interactivo)
   - **Backlinks Panel** (ver qué enlaza a este doc)

#### Tareas Core
4. **Grafo de Componentes (1 día)**
   - Refactor AGENTS.md para usar `[[agent-name]]` en lugar de texto plano
   - Refactor SKILLS.md para usar `[[skill-name]]`
   - Refactor WORKFLOWS.md para usar `[[workflow-name]]`
   - Refactor TOOLS.md para usar `[[tool-name]]`
   - Habilitar graph view → validar que muestra relaciones

5. **Integration Registry (2 días)**
   - Crear `.claude/integrations/`
   - Crear 5 archivos:
     - `postgresql.md` → URL conexión, credenciales necesarias, health check: `docker ps | grep postgres`
     - `apify.md` → Actor IDs, rate limits, coste por run, health check: test API key
     - `telegram.md` → Bot token, webhook URL, health check: `/agents` command
     - `railway.md` → Deployment config, env vars, health check: deployment status
     - `supabase.md` → API keys, schema changes, health check: connection test
   - Cada archivo con sección "Status": ✅ Connected | ⚠️ Needs Config | ❌ Broken

6. **Project Status Board (1 día)**
   - Refactor `.claude/projects/` con metadata YAML:
     ```yaml
     ---
     status: in-progress
     owner: gmunoz02
     start-date: 2026-03-13
     eta: 2026-03-20
     blockers: []
     dependencies: []
     ---
     ```
   - Crear dataview query para status board:
     ```dataview
     TABLE status, owner, eta, blockers
     FROM ".claude/projects"
     WHERE status != "completed"
     SORT eta ASC
     ```

**Entregables Fase 1:**
- ✅ Graph view funcional con relaciones visibles
- ✅ 5 archivos de integrations con status
- ✅ Status board de proyectos con dataview

---

### **FASE 2: Knowledge (Semana 2-3)** — Documentación de decisiones

7. **Architecture Decision Records (2 días)**
   - Crear template `.obsidian-vault/templates/adr-template.md`:
     ```markdown
     ---
     status: proposed | accepted | deprecated | superseded
     date: YYYY-MM-DD
     ---

     # ADR-XXX: [Title]

     ## Status
     [Proposed/Accepted/Deprecated/Superseded by ADR-YYY]

     ## Context
     [Por qué tomamos esta decisión]

     ## Decision
     [Qué decidimos]

     ## Consequences
     ### Positivos
     - ...

     ### Negativos
     - ...

     ## Alternatives Considered
     - Alternativa 1: ... (rechazada porque...)
     - Alternativa 2: ... (rechazada porque...)

     ## Related
     - [[related-component]]
     - [[related-workflow]]
     ```

   - Crear 4 ADRs históricos:
     - `001-wat-framework.md` → Por qué Workflows · Agents · Tools
     - `002-agent-architecture.md` → Por qué agentes especializados vs monolito
     - `003-memory-model.md` → Por qué PostgreSQL + shared/private scope
     - `004-skill-model-selection.md` → Por qué haiku/sonnet/opus por tipo de task

8. **Product Knowledge Base (2 días)**
   - Crear `.claude/product-evolution/hypothesis-log.md`
   - Crear `.claude/product-evolution/strategy-iterations.md` → versiones del BUSINESS_PLAN
   - Crear `.claude/product-evolution/feature-graveyard.md` → features descartadas + por qué

**Entregables Fase 2:**
- ✅ 4 ADRs documentados
- ✅ Product evolution tracking

---

### **FASE 3: Developer Experience (Semana 3-4)**

9. **Onboarding Path (3 días)**
   - Crear `.claude/onboarding/day-1-setup.md`:
     ```markdown
     # Day 1 Setup

     ## Prerequisites
     - Node.js 18+
     - Docker Desktop
     - Git

     ## Steps
     1. Clone repo: `git clone ...`
     2. Install deps: `npm install`
     3. Start DB: `docker-compose up -d`
     4. Check health: `node tools/db/health-check.js`
     5. Run first scrape: `node tools/scraping/propertyfinder-scraper.js --location dubai --limit 10`

     ## Verify
     - [ ] Database running
     - [ ] 10 properties in DB
     - [ ] Obsidian vault opened

     Next: [[understand-wat-in-10min]]
     ```

   - Crear `understand-wat-in-10min.md` → visual guide con canvas
   - Crear `your-first-skill.md` → step-by-step
   - Crear `your-first-agent.md` → step-by-step
   - Crear `debugging-guide.md` → error patterns comunes

10. **Dependency Graph (1 día)**
    - Añadir sección `## Dependencies` a cada tool/agent/skill:
      ```markdown
      ## Dependencies
      - **Tools:** [[tools/db/pool.js]], [[tools/scraping/apify-client.js]]
      - **Memory Keys:** `last_scrape_run`, `properties_count`
      - **Used By:** [[data-intelligence-workflow]], [[pm-agent]]
      - **Impact if broken:** Data pipeline stops, PM Agent can't get stats
      ```

**Entregables Fase 3:**
- ✅ Onboarding completo (5 archivos)
- ✅ Dependencies documentadas en componentes core

---

### **FASE 4: Maintenance (Semana 4+)** — Optional enhancements

11. **Troubleshooting Runbooks**
    - Crear `.claude/troubleshooting/db-issues.md`
    - Crear `.claude/troubleshooting/apify-issues.md`
    - Crear `.claude/troubleshooting/memory-issues.md`
    - Crear `.claude/troubleshooting/telegram-issues.md`

12. **Semantic Search & Glossary**
    - Crear `.claude/glossary.md` con definiciones:
      ```markdown
      # Glossary

      ## WAT Framework
      [[WAT]] = Workflows · Agents · Tools · Skills
      - [[Workflows]]: SOPs que coordinan múltiples agentes
      - [[Agents]]: Roles especializados (content, data, pm, etc.)
      - [[Tools]]: Scripts deterministas (APIs, DB, transformaciones)
      - [[Skills]]: Capacidades invocables por `/comando`

      ## WAT Memory
      [[WAT Memory]] = Sistema de memoria persistente en [[PostgreSQL]]
      - [[Scope shared]]: Memoria compartida entre agentes
      - [[Scope private]]: Memoria interna del agente
      ```

13. **Version History (opcional)**
    - Crear `.claude/history/phase-0-foundation.md`
    - Crear `.claude/history/phase-1-wat-framework.md`

**Entregables Fase 4:**
- ✅ Runbooks de troubleshooting
- ✅ Glossary completo
- ✅ (Opcional) Version history

---

## Archivos Críticos a Modificar

### Fase 1 (Foundation)
- [.claude/AGENTS.md](c:\Users\gmunoz02\Desktop\emiralia\.claude\AGENTS.md) → añadir `[[links]]`
- [.claude/SKILLS.md](c:\Users\gmunoz02\Desktop\emiralia\.claude\SKILLS.md) → añadir `[[links]]`
- [.claude/WORKFLOWS.md](c:\Users\gmunoz02\Desktop\emiralia\.claude\WORKFLOWS.md) → añadir `[[links]]`
- [.claude/TOOLS.md](c:\Users\gmunoz02\Desktop\emiralia\.claude\TOOLS.md) → añadir `[[links]]`
- Crear `.claude/integrations/` (5 archivos nuevos)
- Refactor `.claude/projects/*.md` (añadir metadata YAML)

### Fase 2 (Knowledge)
- Crear `.claude/adr/` (4 ADRs iniciales)
- Crear `.claude/product-evolution/` (3 archivos)
- Crear `.obsidian-vault/templates/` (templates ADR, agent, workflow)

### Fase 3 (Developer Experience)
- Crear `.claude/onboarding/` (5 archivos)
- Actualizar cada agent/tool/skill con sección `## Dependencies`

---

## Configuración de Plugins Recomendados

### Plugin 1: Obsidian Git (CRÍTICO)
**Instalar:** Settings → Community Plugins → Browse → "Obsidian Git"

**Configuración:**
```
Auto Pull Interval: 5 minutes
Auto Backup Interval: 5 minutes
Auto Backup After File Change: true
Commit Message: "vault backup: {{date}}"
```

**Benefit:** Sync bidireccional con repo. Claude Code edita `.md` → Obsidian auto-pull. Obsidian edita → auto-commit + push.

---

### Plugin 2: Dataview (CRÍTICO)
**Instalar:** Settings → Community Plugins → Browse → "Dataview"

**Uso - Status Board:**
```dataview
TABLE status, owner, eta, blockers
FROM ".claude/projects"
WHERE status != "completed"
SORT eta ASC
```

**Uso - Agents por Departamento:**
```dataview
TABLE rol, status, skills
FROM ".claude/agents"
WHERE status = "activo"
GROUP BY department
```

---

### Plugin 3: Excalidraw (ALTO)
**Instalar:** Settings → Community Plugins → Browse → "Excalidraw"

**Uso:** Crear diagramas visuales del framework WAT:
- `.obsidian-vault/diagrams/wat-framework-visual.excalidraw`
- `.obsidian-vault/diagrams/agents-coordination.excalidraw`
- `.obsidian-vault/diagrams/data-pipeline.excalidraw`

**Benefit:** Diagramas hand-drawn con links a notes (clickeable desde diagrama)

---

### Plugin 4: Kanban (MEDIO)
**Instalar:** Settings → Community Plugins → Browse → "Kanban"

**Uso:** Status board visual alternativo a Dataview.

---

### Plugin 5: Graph Analysis (MEDIO)
**Instalar:** Settings → Core Plugins → "Graph View" (ya incluido)

**Configuración:**
- Filter: Show only `.claude/` folder
- Groups: Color by folder (agents, skills, workflows, tools)

---

## Verificación End-to-End

### Test 1: Graph View Funciona
1. Abrir Obsidian
2. Cmd/Ctrl + G → abrir Graph View
3. Verificar:
   - ✅ Nodos por cada agente, skill, workflow, tool
   - ✅ Conexiones entre componentes relacionados
   - ✅ Clicking un nodo abre el archivo

**Criterio de éxito:** Ver grafo visual del framework WAT completo.

---

### Test 2: Quick Navigation
1. Abrir [[data-agent]]
2. Hover sobre `[[propertyfinder-scraper]]`
3. Verificar: Quick preview muestra contenido del skill

**Criterio de éxito:** Navegación instantánea entre componentes sin abrir archivos.

---

### Test 3: Integration Status Check
1. Abrir `.claude/integrations/postgresql.md`
2. Leer sección "Status"
3. Ejecutar health check: `docker ps | grep postgres`
4. Actualizar status badge si cambió

**Criterio de éxito:** Status refleja estado real de cada integración.

---

### Test 4: Project Status Board
1. Abrir un archivo en `.claude/projects/`
2. Crear dataview query en nuevo note:
   ```dataview
   TABLE status, owner, eta
   FROM ".claude/projects"
   ```
3. Verificar: tabla muestra todos los proyectos

**Criterio de éxito:** Status board centralizado funcional.

---

### Test 5: Onboarding Completo
1. Nuevo developer simula day 1
2. Sigue `.claude/onboarding/day-1-setup.md`
3. Completa todos los checkboxes
4. Mide tiempo

**Criterio de éxito:** Setup completo en < 2 horas (vs 1 día antes).

---

### Test 6: ADR Útil
1. Developer pregunta: "¿Por qué usamos PostgreSQL y no MongoDB?"
2. Buscar en Obsidian: "postgresql"
3. Encontrar `[[003-memory-model]]`
4. Leer sección "Alternatives Considered"

**Criterio de éxito:** Respuesta en < 30 segundos.

---

### Test 7: Dependency Impact Analysis
1. Developer quiere editar `tools/db/pool.js`
2. Abrir archivo en Obsidian
3. Ver sección "Used By" → backlinks
4. Identificar: 8 agentes + 3 workflows afectados

**Criterio de éxito:** Impact analysis en < 10 segundos.

---

### Test 8: Troubleshooting Runbook
1. Database connection falla
2. Buscar en `.claude/troubleshooting/db-issues.md`
3. Seguir steps: check docker, check env vars, restart container
4. Issue resuelto

**Criterio de éxito:** Debugging en < 5 min (vs 30 min antes).

---

## Costos y Mantenimiento

### Costos
- **Obsidian:** $0 (usando Git plugin en lugar de Sync oficial)
- **Setup:** ~30-40 horas (Fase 1-3)
- **Mantenimiento:** ~2 horas/semana
  - Actualizar ADRs cuando hay decisiones arquitectónicas
  - Actualizar status board de proyectos
  - Actualizar integration status

### Mantenimiento Semanal
**Cada lunes (5 min):**
- Actualizar status de proyectos en `.claude/projects/`
- Verificar integration status en `.claude/integrations/`

**Cada nueva decisión arquitectónica (10 min):**
- Crear ADR en `.claude/adr/`

**Cada nuevo agente/skill/workflow (2 min):**
- Usar template de `.obsidian-vault/templates/`
- Añadir links `[[...]]` a componentes relacionados

---

## Métricas de Éxito

| Métrica | Antes | Target Post-Obsidian | Medición |
|---------|-------|----------------------|----------|
| **Onboarding time** | 1 semana | 1 día | Tiempo hasta primer commit útil |
| **Debugging avg time** | 30 min | 5 min | Tiempo desde error → solución |
| **Impact analysis** | Desconocido | 10 seg | Tiempo para identificar qué se rompe al editar X |
| **Knowledge retention** | Bajo (memoria) | Alto (documentado) | Nuevos devs pueden responder "¿por qué X?" sin preguntar |
| **Context switching** | 5+ archivos | 1 click | Saltos necesarios para entender un componente |

---

## Resumen Ejecutivo

### Por Qué Obsidian
Emiralia tiene un sistema complejo (WAT framework, 9 agentes, 7 workflows, 35+ skills, 46 tools) documentado en archivos `.md` lineales. **No hay visualización de cómo todo conecta.**

Obsidian convierte estos archivos en **un knowledge graph interactivo** donde:
- Clicking `[[data-agent]]` abre el agente
- Graph view muestra dependencias visuales
- ADRs documentan el "por qué" de cada decisión
- Status boards muestran proyectos en tiempo real
- Onboarding guides reducen tiempo de setup de 1 semana → 1 día

### Inversión
- **40 horas setup** (Fases 1-3)
- **2 horas/semana mantenimiento**
- **$0 costo** (Git plugin gratis)

### Retorno
- Onboarding: **7x más rápido**
- Debugging: **6x más rápido**
- Impact analysis: **desconocido → 10 seg**
- Knowledge retention: **memoria humana → documentado**

### Decisión Recomendada
**Proceder con Fase 1 (Foundation)** esta semana:
1. Setup vault + plugins (2 horas)
2. Grafo de componentes con `[[links]]` (1 día)
3. Integration registry (2 días)
4. Project status board (1 día)

Total: **4 días de trabajo**, retorno inmediato en developer experience.
