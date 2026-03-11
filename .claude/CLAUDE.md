# Emiralia — CLAUDE.md

**Emiralia** es el primer buscador inteligente de propiedades en Emiratos Árabes Unidos para el mercado hispanohablante. Opera mediante **agentes de IA especializados** que replican los departamentos de una empresa real, coordinados a través del framework WAT (Workflows · Agents · Tools).

---

## Framework WAT

| Capa | Dónde | Qué hace |
|------|-------|----------|
| **Workflows** | `.claude/workflows/` | SOPs: objetivo, inputs, agentes, outputs, edge cases |
| **Agents** | `.claude/agents/` | Roles especializados con skills y tools asignados |
| **Tools** | `tools/` | Scripts deterministas: APIs, DB, transformaciones |
| **Skills** | `.claude/skills/` | Capacidades invocables por agente o por `/comando` |

**Regla core:** Antes de construir algo nuevo, revisa `tools/` y `.claude/skills/`. Si algo falla: corrige el tool, verifica, actualiza el workflow.

---

## Agentes de Emiralia

### 🏛️ Internos (dentro de la plataforma)
| Agente | Rol |
|--------|-----|
| **Content Agent** | Fichas de propiedades, blog, descripciones SEO en español |
| **Translation Agent** | Árabe/inglés → español con precisión inmobiliaria |
| **Frontend Agent** | UI/UX, creatividades, banners, mockups |
| **Dev Agent** | Features, bugs, PRs en el codebase |
| **Data Agent** | Extrae, limpia y normaliza datos de propiedades EAU |

### 🔄 Mixtos (dentro y fuera)
| Agente | Rol |
|--------|-----|
| **PM Agent** | Sprints, backlog, coordinación entre agentes |
| **Marketing Agent** | Campañas, copies, canales, métricas |

### 🔧 Operaciones (meta-sistema)
| Agente | Rol |
|--------|-----|
| **WAT Auditor Agent** | Auditoría del sistema WAT: consistencia, completitud, gaps y mejoras |
| **Research Agent** | Monitorea fuentes externas (Anthropic, GitHub, comunidad) y genera intelligence reports |

### 📋 Planificados (Roadmap)
> Agentes definidos conceptualmente pero sin implementación (.md, skills, tools). Se activarán según necesidad.

| Agente | Rol | Prioridad |
|--------|-----|-----------|
| **SEO Agent** | Keywords, metadatos, arquitectura de enlaces | Media |
| **Sales Agent** | Pipeline compradores hispanohablantes, leads | Alta |
| **Customer Success Agent** | Onboarding, consultas, feedback | Media |
| **Media Buyer Agent** | Inversión publicitaria Meta/Google/TikTok | Baja |
| **Financial Agent** | Presupuestos, CAC, rentabilidad | Baja |
| **Partnerships Agent** | Promotoras, agencias y brokers en EAU | Media |
| **Legal & Compliance Agent** | Contratos, normativa EAU, compradores extranjeros | Baja |

---

## Skills disponibles

### Operacionales (`ops/`)
| Skill | Comando | Agente | Cuándo usarlo |
|-------|---------|--------|---------------|
| `skill-builder` | `/skill-builder` | — | Crear o auditar skills siguiendo best practices |
| `wat-audit` | `/wat-audit` | WAT Auditor | Auditoría del sistema WAT: consistencia, gaps, mejoras estructurales |
| `activity-tracking` | `/activity-tracking` | Transversal | Registrar progreso y hitos de cualquier agente |
| `research-monitor` | `/research-monitor` | Research Agent | Monitoreo semanal de fuentes externas (Anthropic, GitHub, Reddit) |
| `eod-report` | `/eod-report` | Transversal | Generar reporte end-of-day con actividades del día |
| `weekly-brainstorm` | `/weekly-brainstorm` | Transversal | Brainstorm semanal de ideas y mejoras |
| `dev-server` | `/dev-server` | Dev Agent | Levantar servidor de desarrollo automáticamente |

### Contenido & Traducción (`content/`)
| Skill | Comando | Agente | Cuándo usarlo |
|-------|---------|--------|---------------|
| `traducir` | `/traducir` | Translation Agent | Traducir contenido inmobiliario EN↔ES con variante regional (es-ES, es-MX, es-CO) |

### Diseño (`design/`)
| Skill | Comando | Agente | Cuándo usarlo |
|-------|---------|--------|---------------|
| `ui-ux-pro-max` | `/ui-ux-pro-max` | Frontend Agent | Inteligencia de diseño (67 estilos, 96 paletas, tipografía) |
| `screenshot-loop` | `/screenshot-loop` | Frontend Agent | Iteración de diseño visual basada en capturas y brand guidelines |

### Estrategia de Producto (`producto/`)
| Skill | Comando | Agente | Cuándo usarlo |
|-------|---------|--------|---------------|
| `estrategia-producto` | `/estrategia-producto` | PM Agent | Product Strategy Canvas de 9 secciones para Emiralia |
| `propuesta-valor` | `/propuesta-valor` | PM Agent | Propuesta de valor JTBD de 6 partes |
| `perfil-cliente-ideal` | `/perfil-cliente-ideal` | PM Agent | Arquetipos ICP de inversores hispanohablantes |
| `analisis-competidores` | `/analisis-competidores` | PM Agent | Matriz competitiva vs PropertyFinder, Bayut, Houza |
| `tamanio-mercado` | `/tamanio-mercado` | PM Agent | TAM/SAM/SOM del mercado PropTech hispano en EAU |

### Go-to-Market & Crecimiento (`gtm/`)
| Skill | Comando | Agente | Cuándo usarlo |
|-------|---------|--------|---------------|
| `estrategia-gtm` | `/estrategia-gtm` | PM Agent | Plan GTM con canales, roadmap y presupuesto |
| `segmento-entrada` | `/segmento-entrada` | PM Agent | Selección de beachhead: España vs LatAm vs Expats |
| `loops-crecimiento` | `/loops-crecimiento` | PM Agent | Diseño de growth loops sostenibles |
| `mapa-viaje-cliente` | `/mapa-viaje-cliente` | PM Agent | Customer journey de 8 etapas del comprador en EAU |
| `ideas-posicionamiento` | `/ideas-posicionamiento` | Marketing Agent | Territorios de posicionamiento diferencial |

### Ejecución (`ejecucion/`)
| Skill | Comando | Agente | Cuándo usarlo |
|-------|---------|--------|---------------|
| `crear-prd` | `/crear-prd` | PM Agent | PRD de 8 secciones para features de Emiralia |
| `priorizar-features` | `/priorizar-features` | PM Agent | Priorización con RICE, MoSCoW, Impact/Esfuerzo |
| `historias-usuario` | `/historias-usuario` | PM Agent | User stories + Job stories con contexto EAU |
| `pre-mortem` | `/pre-mortem` | PM Agent | Análisis de riesgos Tigers/Paper Tigers/Elephants |
| `planificar-sprint` | `/planificar-sprint` | PM Agent | Sprint semanal para equipo de agentes IA |
| `pm-challenge` | `/pm-challenge` | PM Agent | Review, challenge y convertir ideas en planes ejecutables |
| `cerrar-proyecto` | `/cerrar-proyecto` | PM Agent | Cierre automatizado: resumen, tasks Done, audit log |
| `pm-context-audit` | `/pm-context-audit` | PM Agent | Auditar completitud, consistencia y frescura del contexto del PM Agent |

### Marketing (`marketing/`)
| Skill | Comando | Agente | Cuándo usarlo |
|-------|---------|--------|---------------|
| `metricas-norte` | `/metricas-norte` | Marketing Agent | North Star Metric + input metrics |
| `ideas-marketing` | `/ideas-marketing` | Marketing Agent | Ideas creativas de campañas cost-effective |
| `battlecard-competitivo` | `/battlecard-competitivo` | Marketing Agent | Battlecards de ventas vs competidores |

### Data & Analytics (`data/`)
| Skill | Comando | Agente | Cuándo usarlo |
|-------|---------|--------|---------------|
| `propertyfinder-scraper` | `/propertyfinder-scraper` | Data Agent | Extraer propiedades de PropertyFinder.ae vía Apify |
| `consultas-sql` | `/consultas-sql` | Data Agent | Queries SQL desde lenguaje natural (read-only) |
| `analisis-cohortes` | `/analisis-cohortes` | Data Agent | Análisis por comunidad, precio, temporal |
| `detectar-duplicados` | `/detectar-duplicados` | Data Agent | Detección cross-broker de propiedades duplicadas |
| `analisis-ab` | `/analisis-ab` | PM Agent | Análisis de tests A/B con significancia estadística |
| `analisis-sentimiento` | `/analisis-sentimiento` | PM Agent | Sentimiento y JTBD desde feedback de usuarios |
| `skill-stats` | `/skill-stats` | Data Agent | Estadísticas de uso de skills: adopción, frecuencia, tendencias |
| `panicselling-scraper` | `/panicselling-scraper` | Data Agent | Extraer price drops de propiedades de lujo desde panicselling.xyz |

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

### Plantilla para agentes nuevos
Al crear un nuevo agente en `.claude/agents/`, incluir siempre:
```markdown
## Tools disponibles
- `tools/db/memory.js` — Leer y escribir memoria persistente del agente.
- `tools/db/wat-memory.js` — Consultar el estado compartido de otros agentes.

## Claves de memoria recomendadas
| Key | Scope | Descripción |
|-----|-------|-------------|
| `last_task_completed` | shared | Última tarea completada |
| `last_task_at` | shared | Timestamp de la última acción |
```
Y registrar el agente en DB:
```bash
node -e "
import pool from './tools/db/pool.js';
await pool.query(\`INSERT INTO agents (id, name, role, department) VALUES ('nuevo-agent','Nombre','Rol','dept') ON CONFLICT (id) DO NOTHING\`);
await pool.end();
" --input-type=module
```

---

## Convenciones Skills 2.0

Los skills de Emiralia usan las capacidades avanzadas de Claude Code Skills:

| Feature | Frontmatter | Efecto |
|---------|-------------|--------|
| `context: fork` | `context: fork` | Ejecuta el skill en contexto aislado (no contamina la conversación principal) |
| `model` | `model: haiku/sonnet/opus` | Selecciona el modelo óptimo por costo/calidad |
| `allowed-tools` | `allowed-tools: [Bash, Read, ...]` | Restringe qué tools puede usar el skill |
| `!backticks` | `!` seguido de backtick en el body | Inyecta output dinámico de comandos antes de la ejecución |

**Guías de asignación de modelo:**
- `haiku` → Tasks ligeras: tracking, queries SQL, monitoreo
- `sonnet` → Tasks analíticas: auditorías, análisis, scraping
- `opus` → Tasks estratégicas: PRDs, decisiones de producto

---

## Reglas de contexto (aplican a todos los agentes)

1. **Español primero.** Todo output de cara al usuario en español de calidad, sensible culturalmente para España y Latinoamérica.
2. **Precisión inmobiliaria.** Precio, m², ubicación, developer y estatus de entrega se verifican antes de publicar. Un error en precio es crítico.
3. **Privacidad.** Datos de leads y compradores con máxima confidencialidad. Nunca se loguean datos personales.
4. **EAU-first.** Consejos legales, fiscales o de inversión reflejan normativa de Emiratos, no del país del comprador.
5. **Escalabilidad por diseño.** Cada tool y workflow diseñado para miles de propiedades y leads desde el inicio.
6. **Tracking obligatorio.** Toda tool nueva en `tools/` debe incluir una llamada `trackSkill()` al inicio de su ejecucion. Verificar cobertura con `node tools/workspace-skills/skill-coverage-checker.js`.

```javascript
import { trackSkill } from '../workspace-skills/skill-tracker.js';
trackSkill('<agentId>', '<tool-name>', '<domain>', 'completed').catch(() => {});
```

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
  CLAUDE.md          ← este fichero
  BUSINESS_PLAN.md   ← norte estratégico (visión, modelo B2B, roadmap)
  agents/            ← definiciones de agentes
  skills/            ← skills invocables
  workflows/         ← SOPs cross-agent
tools/               ← scripts ejecutables (Node.js)
.env                 ← API keys (NUNCA en otro sitio)
docker-compose.yml   ← PostgreSQL + Adminer
```
