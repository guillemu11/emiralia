---
name: wat-audit
description: Audita el sistema WAT completo (CLAUDE.md, agentes, skills, workflows, tools). Detecta inconsistencias, gaps y propone mejoras. Genera informe con score + propuestas.
agent: WAT Auditor Agent
context: fork
model: sonnet
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - Write
---

## Estado actual de agentes
!`node tools/db/wat-memory.js status`

## Ultimo research report
!`node tools/db/wat-memory.js check research-agent latest_research_report`

## What This Skill Does

Ejecuta una auditoria del framework WAT de Emiralia. Analiza todos los archivos `.md` del sistema (CLAUDE.md, agentes, skills, workflows) y los cruza con el inventario real de tools y la base de datos de agentes.

Usa `/wat-audit` cuando quieras:
- Verificar que la documentacion esta sincronizada con el estado real del proyecto
- Detectar agentes, skills o workflows faltantes o incompletos
- Identificar gaps en la cobertura de procesos
- Obtener propuestas de mejora estructural

## Modes

Puedes ejecutar una auditoria completa o parcial:

- `/wat-audit` — Auditoria completa (todos los checks)
- `/wat-audit agents` — Solo auditar agentes
- `/wat-audit skills` — Solo auditar skills
- `/wat-audit workflows` — Solo auditar workflows
- `/wat-audit claude-md` — Solo auditar CLAUDE.md

## Instructions

### Paso 1: Recopilar inventario

Lee todos los archivos del sistema WAT:

```
.claude/CLAUDE.md
.claude/rules/*.md
.claude/agents/**/*.md
.claude/skills/*/SKILL.md
.claude/workflows/*.md
```

Tambien recopila:
- Lista de archivos `.js` en `tools/` (inventario de tools reales)
- Tabla `agents` de la base de datos: `node tools/db/wat-memory.js status`

### Paso 1b: Cargar Inteligencia Externa

Consulta el ultimo informe del Research Agent:

```bash
node tools/db/wat-memory.js check research-agent latest_research_report
```

- Si hay datos: cargar las novedades con impacto `high` y `medium` para cruzarlas en el check 2e.
- Si no hay datos: anotar como Suggestion ("Research Agent no ha ejecutado aun — considerar ejecutar `/research-monitor`") y continuar sin contexto externo.

### Paso 2: Ejecutar checks

#### 2a. Consistency Check
Para cada referencia cruzada, verificar que el target existe:

| Referencia en | Debe existir en |
|--------------|-----------------|
| Agente listado en CLAUDE.md | `.claude/agents/{dept}/{id}.md` |
| Skill listada en agente `.md` | `.claude/skills/{skill}/SKILL.md` |
| Tool referenciado en agente `.md` | `tools/**/{tool}.js` |
| Agente referenciado en workflow | `.claude/agents/**/{agent}.md` |
| Skill con comando `/{name}` | `.claude/skills/{name}/SKILL.md` |
| Agente en CLAUDE.md | Registro en tabla `agents` de DB |

Clasificar discrepancias:
- **Critical**: Agente/skill referenciado que no existe (causara error en ejecucion)
- **Warning**: Agente existe en archivos pero no en CLAUDE.md (invisible para el sistema)
- **Suggestion**: Tool existe pero no esta referenciado en ningun agente

#### 2b. Completeness Check
Para cada `.md`, verificar que tiene las secciones minimas:

**Agentes** (`.claude/agents/**/*.md`):
- [ ] Frontmatter con `name` y `description`
- [ ] Seccion "Mision" o equivalente
- [ ] Seccion "Tools disponibles" con `memory.js` y `wat-memory.js`
- [ ] Seccion "Claves de memoria recomendadas"
- [ ] Seccion de protocolo o instrucciones operativas

**Skills** (`.claude/skills/*/SKILL.md`):
- [ ] Frontmatter con `name` y `description`
- [ ] Seccion "What This Skill Does"
- [ ] Instrucciones paso a paso
- [ ] Referencia a tools que usa (si aplica)

**Workflows** (`.claude/workflows/*.md`):
- [ ] Objetivo claro
- [ ] Inputs y outputs definidos
- [ ] Agentes involucrados listados
- [ ] Pasos secuenciales
- [ ] Edge cases o condiciones de error

#### 2c. Gap Analysis
Identificar zonas sin cobertura:
- Departamentos en CLAUDE.md sin ningun agente con `.md` propio
- Agentes en la tabla `agents` de DB sin definicion `.md`
- Procesos mencionados en workflows sin skill o tool que los ejecute
- Agentes con skills asignadas que no tienen SKILL.md

#### 2e. External Intelligence Cross-Reference

Si el Paso 1b cargo novedades del Research Agent, cruzar cada novedad `high` o `medium` con el estado actual del WAT:

- Para cada novedad: evaluar si implica un cambio necesario en agentes, skills, tools o workflows de Emiralia.
- **Scoring**:
  - Novedades externas generan **Suggestion** (-1 pt) por defecto.
  - Excepcion: breaking changes o deprecaciones → **Warning** (-3 pt).
  - Nunca generar **Critical** desde inteligencia externa.
- Incluir una seccion "Inteligencia Externa" en el informe (Paso 4) con:
  - Novedades relevantes detectadas
  - Impacto potencial en el WAT
  - Acciones sugeridas

Si no hay datos del Research Agent, omitir esta seccion silenciosamente.

#### 2d. Structure Proposals
Basandose en los patrones que YA funcionan bien en el sistema:
- Proponer templates mejorados si hay `.md` inconsistentes
- Sugerir nuevas secciones basandose en lo que los mejores agentes ya tienen
- Recomendar reorganizacion si hay archivos en ubicaciones confusas
- Identificar informacion faltante que haria mas eficiente la ejecucion

#### 2f. Modular Architecture Check
Verificar integridad de la arquitectura modular (post-refactor 1d105fe):

**Archivos principales** - Deben existir:
- [ ] `.claude/CLAUDE.md` (README ejecutivo, <100 líneas)
- [ ] `.claude/AGENTS.md` (inventario de agentes)
- [ ] `.claude/SKILLS.md` (catálogo de skills)
- [ ] `.claude/TOOLS.md` (documentación de tools)
- [ ] `.claude/WORKFLOWS.md` (SOPs cross-agente)
- [ ] `.claude/RULES.md` (rules + convenciones)

**Quick Reference en CLAUDE.md** - Debe tener tabla con links a los 6 archivos principales + BUSINESS_PLAN.md

**Links bidireccionales**:
- CLAUDE.md → links a AGENTS.md, SKILLS.md, TOOLS.md, WORKFLOWS.md, RULES.md, BUSINESS_PLAN.md
- AGENTS.md → links a archivos en `agents/**/*.md`
- WORKFLOWS.md → links a archivos en `workflows/*.md`
- RULES.md → links a archivos en `rules/*.md`
- Verificar que cada link apunta a un archivo que existe

**Separación de concerns**:
- CLAUDE.md NO debe contener inventarios detallados (delegar a archivos específicos)
- AGENTS.md, SKILLS.md, TOOLS.md, WORKFLOWS.md, RULES.md deben estar actualizados con el estado real

Clasificar:
- **Critical**: Quick Reference faltante o links rotos a archivos principales
- **Warning**: Links rotos a archivos secundarios (agents/, workflows/, rules/)
- **Suggestion**: Inventarios desactualizados o información duplicada entre archivos

### Paso 3: Calcular score

Score base: 100 puntos.
- Cada **Critical** issue: -10 puntos
- Cada **Warning**: -3 puntos
- Cada **Suggestion**: -1 punto

Score minimo: 0.

### Paso 4: Generar output

#### Informe completo
Guardar en `apps/dashboard/docs/wat-audit-{YYYY-MM-DD}.md`:

```markdown
# WAT Audit Report — {fecha}

**Score: {score}/100** ({calificacion})
**Issues encontrados:** {n_critical} critical | {n_warning} warnings | {n_suggestions} suggestions

---

## Critical Issues
1. {descripcion} — **Accion requerida:** {que hacer}

## Warnings
1. {descripcion} — **Recomendacion:** {que hacer}

## Suggestions
1. {descripcion}

---

## Detalle por area

### CLAUDE.md
{hallazgos especificos}

### Agentes ({n} auditados)
{tabla con estado de cada agente}

### Skills ({n} auditadas)
{tabla con estado de cada skill}

### Workflows ({n} auditados)
{tabla con estado de cada workflow}

### Tools ({n} inventariados)
{lista de tools referenciados vs no referenciados}

### Inteligencia Externa
{Si hay datos del Research Agent}
| Novedad | Fuente | Impacto | Accion sugerida |
|---------|--------|---------|-----------------|
| {titulo} | {source} | {high/medium} | {que hacer en WAT} |

{Si no hay datos: omitir esta seccion}

---

## Propuestas de mejora
1. {propuesta con justificacion}
2. ...
```

#### Resumen en chat
Mostrar un resumen de 5-10 lineas con:
- Score y calificacion
- Top 3 issues criticos (si hay)
- Top 3 mejoras propuestas
- Referencia al archivo del informe completo

### Paso 5: Persistir en memoria

```bash
node tools/db/memory.js set wat-auditor-agent last_audit_at "{timestamp}" shared
node tools/db/memory.js set wat-auditor-agent last_audit_score "{score}" shared
node tools/db/memory.js set wat-auditor-agent critical_issues "{count}" shared
```
