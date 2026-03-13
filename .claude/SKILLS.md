# Skills de Emiralia

Catálogo completo de skills invocables en el sistema WAT.

---

## Operacionales (`ops/`)

Skills para gestión del sistema WAT y tracking de actividades.

| Skill | Comando | Agente | Model | Context | Cuándo usarlo |
|-------|---------|--------|-------|---------|---------------|
| `skill-builder` | `/skill-builder` | — | sonnet | fork | Crear o auditar skills siguiendo best practices |
| `wat-audit` | `/wat-audit` | WAT Auditor | sonnet | fork | Auditoría del sistema WAT: consistencia, gaps, mejoras estructurales |
| `activity-tracking` | `/activity-tracking` | Transversal | haiku | shared | Registrar progreso y hitos de cualquier agente |
| `research-monitor` | `/research-monitor` | Research Agent | sonnet | fork | Monitoreo semanal de fuentes externas (Anthropic, GitHub, Reddit) |
| `eod-report` | `/eod-report` | Transversal | haiku | shared | Generar reporte end-of-day con actividades del día |
| `weekly-brainstorm` | `/weekly-brainstorm` | Transversal | sonnet | fork | Brainstorm semanal de ideas y mejoras |
| `dev-server` | `/dev-server` | Dev Agent | haiku | shared | Levantar servidor de desarrollo automáticamente |

---

## Contenido & Traducción (`content/`)

Skills para generación y traducción de contenido inmobiliario.

| Skill | Comando | Agente | Model | Context | Cuándo usarlo |
|-------|---------|--------|-------|---------|---------------|
| `traducir` | `/traducir` | Translation Agent | sonnet | fork | Traducir contenido inmobiliario EN↔ES con variante regional (es-ES, es-MX, es-CO) |

---

## Diseño (`design/`)

Skills para UI/UX, creatividades y diseño visual.

| Skill | Comando | Agente | Model | Context | Cuándo usarlo |
|-------|---------|--------|-------|---------|---------------|
| `ui-ux-pro-max` | `/ui-ux-pro-max` | Frontend Agent | opus | fork | Inteligencia de diseño (67 estilos, 96 paletas, tipografía) |
| `screenshot-loop` | `/screenshot-loop` | Frontend Agent | sonnet | shared | Iteración de diseño visual basada en capturas y brand guidelines |

---

## Estrategia de Producto (`producto/`)

Skills para product strategy, competidores y sizing de mercado.

| Skill | Comando | Agente | Model | Context | Cuándo usarlo |
|-------|---------|--------|-------|---------|---------------|
| `estrategia-producto` | `/estrategia-producto` | PM Agent | opus | fork | Product Strategy Canvas de 9 secciones para Emiralia |
| `propuesta-valor` | `/propuesta-valor` | PM Agent | opus | fork | Propuesta de valor JTBD de 6 partes |
| `perfil-cliente-ideal` | `/perfil-cliente-ideal` | PM Agent | opus | fork | Arquetipos ICP de inversores hispanohablantes |
| `analisis-competidores` | `/analisis-competidores` | PM Agent | sonnet | fork | Matriz competitiva vs PropertyFinder, Bayut, Houza |
| `tamanio-mercado` | `/tamanio-mercado` | PM Agent | opus | fork | TAM/SAM/SOM del mercado PropTech hispano en EAU |

---

## Go-to-Market & Crecimiento (`gtm/`)

Skills para planificación GTM, segmentación y growth loops.

| Skill | Comando | Agente | Model | Context | Cuándo usarlo |
|-------|---------|--------|-------|---------|---------------|
| `estrategia-gtm` | `/estrategia-gtm` | PM Agent | opus | fork | Plan GTM con canales, roadmap y presupuesto |
| `segmento-entrada` | `/segmento-entrada` | PM Agent | opus | fork | Selección de beachhead: España vs LatAm vs Expats |
| `loops-crecimiento` | `/loops-crecimiento` | PM Agent | sonnet | fork | Diseño de growth loops sostenibles |
| `mapa-viaje-cliente` | `/mapa-viaje-cliente` | PM Agent | sonnet | fork | Customer journey de 8 etapas del comprador en EAU |
| `ideas-posicionamiento` | `/ideas-posicionamiento` | Marketing Agent | opus | fork | Territorios de posicionamiento diferencial |

---

## Ejecución (`ejecucion/`)

Skills para PRDs, priorización, sprints y gestión de proyectos.

| Skill | Comando | Agente | Model | Context | Cuándo usarlo |
|-------|---------|--------|-------|---------|---------------|
| `crear-prd` | `/crear-prd` | PM Agent | opus | fork | PRD de 8 secciones para features de Emiralia |
| `priorizar-features` | `/priorizar-features` | PM Agent | sonnet | fork | Priorización con RICE, MoSCoW, Impact/Esfuerzo |
| `historias-usuario` | `/historias-usuario` | PM Agent | sonnet | fork | User stories + Job stories con contexto EAU |
| `pre-mortem` | `/pre-mortem` | PM Agent | sonnet | fork | Análisis de riesgos Tigers/Paper Tigers/Elephants |
| `planificar-sprint` | `/planificar-sprint` | PM Agent | sonnet | shared | Sprint semanal para equipo de agentes IA |
| `pm-challenge` | `/pm-challenge` | PM Agent | opus | fork | Review, challenge y convertir ideas en planes ejecutables |
| `cerrar-proyecto` | `/cerrar-proyecto` | PM Agent | haiku | shared | Cierre automatizado: resumen, tasks Done, audit log |
| `pm-context-audit` | `/pm-context-audit` | PM Agent | sonnet | fork | Auditar completitud, consistencia y frescura del contexto del PM Agent |

---

## Marketing (`marketing/`)

Skills para campañas, métricas y battlecards competitivos.

| Skill | Comando | Agente | Model | Context | Cuándo usarlo |
|-------|---------|--------|-------|---------|---------------|
| `metricas-norte` | `/metricas-norte` | Marketing Agent | sonnet | fork | North Star Metric + input metrics |
| `ideas-marketing` | `/ideas-marketing` | Marketing Agent | opus | fork | Ideas creativas de campañas cost-effective |
| `battlecard-competitivo` | `/battlecard-competitivo` | Marketing Agent | sonnet | fork | Battlecards de ventas vs competidores |

---

## Data & Analytics (`data/`)

Skills para scraping, análisis SQL, cohortes y detección de duplicados.

| Skill | Comando | Agente | Model | Context | Cuándo usarlo |
|-------|---------|--------|-------|---------|---------------|
| `propertyfinder-scraper` | `/propertyfinder-scraper` | Data Agent | haiku | shared | Extraer propiedades de PropertyFinder.ae vía Apify |
| `consultas-sql` | `/consultas-sql` | Data Agent | haiku | shared | Queries SQL desde lenguaje natural (read-only) |
| `analisis-cohortes` | `/analisis-cohortes` | Data Agent | sonnet | fork | Análisis por comunidad, precio, temporal |
| `detectar-duplicados` | `/detectar-duplicados` | Data Agent | sonnet | fork | Detección cross-broker de propiedades duplicadas |
| `analisis-ab` | `/analisis-ab` | PM Agent | sonnet | fork | Análisis de tests A/B con significancia estadística |
| `analisis-sentimiento` | `/analisis-sentimiento` | PM Agent | sonnet | fork | Sentimiento y JTBD desde feedback de usuarios |
| `skill-stats` | `/skill-stats` | Data Agent | haiku | fork | Estadísticas de uso de skills: adopción, frecuencia, tendencias |
| `panicselling-scraper` | `/panicselling-scraper` | Data Agent | haiku | shared | Extraer price drops de propiedades de lujo desde panicselling.xyz |

---

## Skills en Desarrollo

| Skill | Agente | ETA | Bloqueador |
|-------|--------|-----|-----------|
| `/lead-pipeline` | Sales Agent | Q1 2026 | Agente no implementado |
| `/competitor-watch` | Marketing Agent | Q2 2026 | Requiere web scraper de competidores |
| `/seo-audit` | SEO Agent | Q2 2026 | Agente no implementado |
| `/customer-onboarding` | Customer Success Agent | Q2 2026 | Agente no implementado |

---

## Asignación de Modelos

**Guías de selección:**

- **`haiku`** → Tasks ligeras, rápidas, frecuentes
  - Ejemplos: tracking, queries SQL, scraping, dev-server
  - Costo: ~$0.001/invocación
  - Tiempo: <5s

- **`sonnet`** → Tasks analíticas, moderadas
  - Ejemplos: auditorías, análisis de cohortes, priorización
  - Costo: ~$0.01/invocación
  - Tiempo: 10-30s

- **`opus`** → Tasks estratégicas, complejas
  - Ejemplos: PRDs, product strategy, GTM planning, UI/UX design
  - Costo: ~$0.10/invocación
  - Tiempo: 30-60s

---

## Context Modes

**`context: fork`** → Ejecuta el skill en contexto aislado (no contamina conversación principal)
- Usar para: análisis largos, brainstorms, auditorías
- Beneficio: mantiene conversación principal limpia

**`context: shared`** → Ejecuta en contexto principal
- Usar para: tracking, queries rápidas, acciones que necesitan memoria de conversación
- Beneficio: acceso a todo el contexto actual

---

## Crear un Skill Nuevo

1. **Crear directorio:** `.claude/skills/<categoria>/<skill-name>/`
2. **Crear SKILL.md** con frontmatter:
   ```markdown
   ---
   name: skill-name
   description: Qué hace el skill
   model: haiku|sonnet|opus
   context: fork|shared
   allowed-tools: [Bash, Read, Grep, ...]
   ---
   [Prompt del skill]
   ```
3. **Registrar en SKILLS.md** (este archivo)
4. **Validar con:** `node tools/workspace-skills/skill-coverage-checker.js`
5. **Test manual:** `/skill-name` en Claude Code
