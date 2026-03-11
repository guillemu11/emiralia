---
name: crear-prd
description: >
  Usar cuando se necesite crear un PRD (Product Requirements Document) para una
  nueva funcionalidad o mejora de Emiralia. Genera un documento de 8 secciones
  con contexto PropTech, KPIs y plan de release.
agent: PM Agent
context: fork
model: opus
disable-model-invocation: true
argument-hint: "[nombre del feature o mejora]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
  - tools/db/save_project.js
inputs:
  - FEATURE: Nombre o descripción del feature a documentar
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Crear PRD

## ¿Qué hace este skill?

Genera un **Product Requirements Document** completo de 8 secciones para cualquier funcionalidad de Emiralia. Incluye hipótesis de valor, contexto de usuario, KPIs medibles, requisitos funcionales y plan de release.

## Cuándo usarlo

- Antes de que el Dev Agent empiece a implementar una feature.
- Para documentar decisiones de producto de forma estructurada.
- Como paso previo a `/planificar-sprint` (las tareas salen del PRD).
- Cuando se necesite alineación entre agentes sobre qué construir.

---

## Proceso paso a paso

Actúa como un **Senior Product Manager** con experiencia en PropTech. Para `$ARGUMENTS`:

### Paso 1: Consultar contexto
```bash
node tools/db/memory.js get pm-agent icp_profiles_count
node tools/db/memory.js get pm-agent strategy_canvas_version
```

### Paso 2: Generar el PRD de 8 secciones
### Paso 3: Validar con el usuario
### Paso 4: Opcionalmente, convertir a proyecto con `save_project.js`

---

## Plantilla de output

```markdown
# PRD: [Nombre del Feature]
**Fecha**: [fecha] | **Autor**: PM Agent | **Versión**: 1.0

## 1. Resumen Ejecutivo e Hipótesis
**Feature**: [nombre]
**Hipótesis**: Si implementamos [feature], entonces [resultado esperado] porque [razón].
**Confianza**: [Alta/Media/Baja]

## 2. Contexto del Usuario
- **ICP impactado**: [Empresario Español / Inversor LatAm / Expat]
- **Etapa del journey**: [Descubrimiento / Investigación / Comparación / etc.]
- **Job To Be Done**: "Cuando [situación], quiero [motivación], para [resultado]"
- **Problema actual**: [qué dolor resuelve este feature]

## 3. Objetivos y KPIs
| Objetivo | KPI | Target | Plazo |
|----------|-----|--------|-------|
| [objetivo 1] | [métrica medible] | [valor] | [semanas] |
| [objetivo 2] | [métrica medible] | [valor] | [semanas] |

## 4. Segmentos Impactados
| Segmento | Impacto | Prioridad |
|----------|---------|-----------|
| [segmento] | [Alto/Medio/Bajo] | [P0/P1/P2] |

## 5. Propuesta de Valor del Feature
[¿Por qué este feature hace a Emiralia mejor que la alternativa actual?]

## 6. Descripción de la Solución
### Incluido (In Scope)
- [funcionalidad 1]
- [funcionalidad 2]

### Excluido (Out of Scope)
- [lo que NO se hará en esta versión]

### Mockup / Wireframe
[Descripción textual o referencia a diseño]

## 7. Requisitos
### Funcionales
| # | Requisito | Prioridad | Agente |
|---|-----------|-----------|--------|
| RF-1 | [requisito] | Must | [Dev/Data/Content] |

### No Funcionales
| # | Requisito | Criterio |
|---|-----------|----------|
| RNF-1 | Performance | [< X ms de carga] |
| RNF-2 | Idioma | Todo en español |

## 8. Plan de Release
| Fase | Contenido | Duración | Agentes |
|------|-----------|----------|---------|
| Alpha | [MVP mínimo] | [X días] | [agentes] |
| Beta | [+ mejoras] | [X días] | [agentes] |
| GA | [release completo] | [X días] | [agentes] |

### Métricas de Adopción Post-Release
| Métrica | Semana 1 | Semana 4 | Semana 12 |
|---------|----------|----------|-----------|
| [uso del feature] | [target] | [target] | [target] |
```

---

## Conversión a Proyecto

Tras aprobación del usuario, ofrecer:
> ¿Quieres que convierta este PRD en un proyecto con fases y tareas en el Dashboard? (Usa `save_project.js`)

---

## Persistencia

```bash
node tools/db/save_research.js --title "PRD — [feature]" --summary "Product Requirements Document"
node tools/db/memory.js set pm-agent last_prd_created '"[feature]"' shared
```

---

## Notas

- Todo PRD debe tener una **hipótesis falsificable**. Si no puedes probarla, no es un buen PRD.
- Los KPIs deben ser **medibles con la infraestructura actual** de Emiralia.
- El Out of Scope es tan importante como el In Scope. Evita scope creep.
- Complementar con `/priorizar-features` para decidir si vale la pena y `/pre-mortem` para riesgos.
