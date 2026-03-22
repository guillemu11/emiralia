# Skills de Emiralia

Catálogo completo de skills invocables en el sistema WAT.

---

## Operacionales (`ops/`)

Skills para gestión del sistema WAT y tracking de actividades.

| Skill | Comando | Agente | Model | Context | Cuándo usarlo |
|-------|---------|--------|-------|---------|---------------|
| `skill-builder` | `/skill-builder` | — | sonnet | fork | Crear o auditar skills siguiendo best practices |
| `wat-audit` | `/wat-audit` | [[wat-auditor-agent]] | sonnet | fork | Auditoría del sistema WAT: consistencia, gaps, mejoras estructurales |
| `activity-tracking` | `/activity-tracking` | Transversal | haiku | shared | Registrar progreso y hitos de cualquier agente |
| `research-monitor` | `/research-monitor` | [[research-agent]] | sonnet | fork | Monitoreo semanal de fuentes externas (Anthropic, GitHub, Reddit) |
| `eod-report` | `/eod-report` | Transversal | haiku | shared | Generar reporte end-of-day con actividades del día |
| `weekly-brainstorm` | `/weekly-brainstorm` | Transversal | sonnet | fork | Brainstorm semanal de ideas y mejoras |
| `dev-server` | `/dev-server` | [[dev-agent]] | haiku | shared | Levantar servidor de desarrollo automáticamente |
| `mcp-setup` | `/mcp-setup` | — | haiku | shared | Añadir, eliminar o auditar MCP servers (global o proyecto) |

---

## Contenido & Traducción (`content/`)

Skills para generación y traducción de contenido inmobiliario.

| Skill | Comando | Agente | Model | Context | Cuándo usarlo |
|-------|---------|--------|-------|---------|---------------|
| `traducir` | `/traducir` | [[translation-agent]] | sonnet | fork | Traducir contenido inmobiliario EN↔ES con variante regional (es-ES, es-MX, es-CO) |

---

## Diseño (`design/`)

Skills para UI/UX, creatividades y diseño visual.

| Skill | Comando | Agente | Model | Context | Cuándo usarlo |
|-------|---------|--------|-------|---------|---------------|
| `ui-ux-pro-max` | `/ui-ux-pro-max` | [[frontend-agent]] | opus | fork | Inteligencia de diseño (67 estilos, 96 paletas, tipografía) |
| `screenshot-loop` | `/screenshot-loop` | [[frontend-agent]] | sonnet | shared | Iteración de diseño visual basada en capturas y brand guidelines |

---

## Estrategia de Producto (`producto/`)

Skills para product strategy, competidores y sizing de mercado.

| Skill | Comando | Agente | Model | Context | Cuándo usarlo |
|-------|---------|--------|-------|---------|---------------|
| `estrategia-producto` | `/estrategia-producto` | [[pm-agent]] | opus | fork | Product Strategy Canvas de 9 secciones para Emiralia |
| `propuesta-valor` | `/propuesta-valor` | [[pm-agent]] | opus | fork | Propuesta de valor JTBD de 6 partes |
| `perfil-cliente-ideal` | `/perfil-cliente-ideal` | [[pm-agent]] | opus | fork | Arquetipos ICP de inversores hispanohablantes |
| `analisis-competidores` | `/analisis-competidores` | [[pm-agent]] | sonnet | fork | Matriz competitiva vs PropertyFinder, Bayut, Houza |
| `tamanio-mercado` | `/tamanio-mercado` | [[pm-agent]] | opus | fork | TAM/SAM/SOM del mercado PropTech hispano en EAU |

---

## Go-to-Market & Crecimiento (`gtm/`)

Skills para planificación GTM, segmentación y growth loops.

| Skill | Comando | Agente | Model | Context | Cuándo usarlo |
|-------|---------|--------|-------|---------|---------------|
| `estrategia-gtm` | `/estrategia-gtm` | [[pm-agent]] | opus | fork | Plan GTM con canales, roadmap y presupuesto |
| `segmento-entrada` | `/segmento-entrada` | [[pm-agent]] | opus | fork | Selección de beachhead: España vs LatAm vs Expats |
| `loops-crecimiento` | `/loops-crecimiento` | [[pm-agent]] | sonnet | fork | Diseño de growth loops sostenibles |
| `mapa-viaje-cliente` | `/mapa-viaje-cliente` | [[pm-agent]] | sonnet | fork | Customer journey de 8 etapas del comprador en EAU |
| `ideas-posicionamiento` | `/ideas-posicionamiento` | [[marketing-agent]] | opus | fork | Territorios de posicionamiento diferencial |

---

## Ejecución (`ejecucion/`)

Skills para PRDs, priorización, sprints y gestión de proyectos.

| Skill | Comando | Agente | Model | Context | Cuándo usarlo |
|-------|---------|--------|-------|---------|---------------|
| `crear-prd` | `/crear-prd` | [[pm-agent]] | opus | fork | PRD de 8 secciones para features de Emiralia |
| `priorizar-features` | `/priorizar-features` | [[pm-agent]] | sonnet | fork | Priorización con RICE, MoSCoW, Impact/Esfuerzo |
| `historias-usuario` | `/historias-usuario` | [[pm-agent]] | sonnet | fork | User stories + Job stories con contexto EAU |
| `pre-mortem` | `/pre-mortem` | [[pm-agent]] | sonnet | fork | Análisis de riesgos Tigers/Paper Tigers/Elephants |
| `planificar-sprint` | `/planificar-sprint` | [[pm-agent]] | sonnet | shared | Sprint semanal para equipo de agentes IA |
| `pm-challenge` | `/pm-challenge` | [[pm-agent]] | opus | fork | Review, challenge y convertir ideas en planes ejecutables |
| `cerrar-proyecto` | `/cerrar-proyecto` | [[pm-agent]] | haiku | shared | Cierre automatizado: resumen, tasks Done, audit log |
| `pm-context-audit` | `/pm-context-audit` | [[pm-agent]] | sonnet | fork | Auditar completitud, consistencia y frescura del contexto del [[pm-agent]] |

---

## Marketing (`marketing/`)

Skills para campañas, métricas y battlecards competitivos.

| Skill | Comando | Agente | Model | Context | Cuándo usarlo |
|-------|---------|--------|-------|---------|---------------|
| `metricas-norte` | `/metricas-norte` | [[marketing-agent]] | sonnet | fork | North Star Metric + input metrics |
| `ideas-marketing` | `/ideas-marketing` | [[marketing-agent]] | opus | fork | Ideas creativas de campañas cost-effective |
| `battlecard-competitivo` | `/battlecard-competitivo` | [[marketing-agent]] | sonnet | fork | Battlecards de ventas vs competidores |

---

## Social Media (`social/`)

Skills para guionización, producción y calendario de contenido IG & TikTok con avatares IA Fernando & Yolanda.

| Skill | Comando | Agente | Model | Context | Cuándo usarlo |
|-------|---------|--------|-------|---------|---------------|
| `guionizar` | `/guionizar` | [[social-media-agent]] | sonnet | fork | Generar guion de vídeo para Fernando o Yolanda (hook + desarrollo + CTA + notas HeyGen) |
| `brief-avatar` | `/brief-avatar` | [[social-media-agent]] | sonnet | fork | Producir paquete completo: guion + prompt KIE AI + caption + hashtags + config HeyGen |
| `calendar-social` | `/calendar-social` | [[social-media-agent]] | sonnet | fork | Generar calendario editorial semanal con slots, avatares y pilares asignados |
| `property-content` | `/property-content` | [[social-media-agent]] | sonnet | fork | Crear pieza de contenido completa desde un `property_id` con datos reales |
| `actualizar-persona` | `/actualizar-persona` | [[social-media-agent]] | haiku | shared | Refinar la definición de persona de Fernando o Yolanda y persistir en memoria |

---

## Data & Analytics (`data/`)

Skills para scraping, análisis SQL, cohortes y detección de duplicados.

| Skill | Comando | Agente | Model | Context | Cuándo usarlo |
|-------|---------|--------|-------|---------|---------------|
| `propertyfinder-scraper` | `/propertyfinder-scraper` | [[data-agent]] | haiku | shared | Extraer propiedades de PropertyFinder.ae vía Apify |
| `consultas-sql` | `/consultas-sql` | [[data-agent]] | haiku | shared | Queries SQL desde lenguaje natural (read-only) |
| `analisis-cohortes` | `/analisis-cohortes` | [[data-agent]] | sonnet | fork | Análisis por comunidad, precio, temporal |
| `detectar-duplicados` | `/detectar-duplicados` | [[data-agent]] | sonnet | fork | Detección cross-broker de propiedades duplicadas |
| `analisis-ab` | `/analisis-ab` | [[pm-agent]] | sonnet | fork | Análisis de tests A/B con significancia estadística |
| `analisis-sentimiento` | `/analisis-sentimiento` | [[pm-agent]] | sonnet | fork | Sentimiento y JTBD desde feedback de usuarios |
| `skill-stats` | `/skill-stats` | [[data-agent]] | haiku | fork | Estadísticas de uso de skills: adopción, frecuencia, tendencias |
| `panicselling-scraper` | `/panicselling-scraper` | [[data-agent]] | haiku | shared | Extraer price drops de propiedades de lujo desde panicselling.xyz |

---

## SEO & AEO (`seo/`)

Skills para posicionamiento orgánico y optimización para motores de IA.

| Skill | Comando | Agente | Model | Context | Cuándo usarlo |
|-------|---------|--------|-------|---------|---------------|
| `seo-audit` | `/seo-audit` | [[seo-agent]] | sonnet | fork | Auditoría SEO completa: score por página, gaps, issues priorizados |
| `generar-keywords` | `/generar-keywords` | [[seo-agent]] | sonnet | fork | Clusters de keywords por mercado (Dubai, Abu Dhabi, off-plan...) |
| `meta-optimizer` | `/meta-optimizer` | [[seo-agent]] | sonnet | fork | Optimizar title + description de una página para máximo CTR |
| `structured-data-generator` | `/structured-data-generator` | [[seo-agent]] | sonnet | fork | Generar JSON-LD schemas (Property, FAQPage, HowTo, Article, Organization) |

---

## Skills en Desarrollo

| Skill | Agente | ETA | Bloqueador |
|-------|--------|-----|-----------|
| `/lead-pipeline` | Sales Agent | Q1 2026 | Agente no implementado |
| `/competitor-watch` | [[marketing-agent]] | Q2 2026 | Requiere web scraper de competidores |
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
