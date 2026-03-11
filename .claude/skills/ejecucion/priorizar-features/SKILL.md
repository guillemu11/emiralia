---
name: priorizar-features
description: >
  Usar cuando se necesite priorizar el backlog de features de Emiralia.
  Aplica frameworks RICE, MoSCoW e Impact/Esfuerzo adaptados a la
  capacidad del equipo de agentes IA.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[lista de features separadas por coma]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - FEATURES: Lista de features a priorizar
  - FRAMEWORK: Framework a usar (rice, moscow, impact-effort, todos)
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Priorizar Features

## ¿Qué hace este skill?

Prioriza el backlog de Emiralia usando **3 frameworks** adaptados al contexto de un equipo de agentes IA: RICE, MoSCoW e Impact vs Esfuerzo.

## Cuándo usarlo

- Antes de planificar un sprint (¿qué features van primero?).
- Cuando hay más ideas que capacidad de ejecución.
- Para resolver debates sobre prioridades entre agentes.
- Como parte del workflow de sprint planning.

---

## Frameworks disponibles

### RICE (adaptado a Emiralia)
| Factor | Definición Emiralia | Escala |
|--------|-------------------|--------|
| **R**each | Usuarios hispanohablantes impactados por mes | 0.5 (pocos) - 10 (todos) |
| **I**mpact | Efecto en KPIs core (búsqueda, contacto, retención) | 0.25 (mínimo) - 3 (masivo) |
| **C**onfidence | Nivel de evidencia de que funcionará | 50% - 100% |
| **E**ffort | Persona-semanas de agente necesarias | 0.5 - 10 |

**Fórmula**: RICE = (Reach × Impact × Confidence) / Effort

### MoSCoW
- **Must**: Sin esto el sprint no tiene sentido
- **Should**: Importante pero no bloqueante
- **Could**: Nice-to-have si hay tiempo
- **Won't**: Explícitamente descartado para este sprint

### Impact vs Esfuerzo
- **Quick Wins**: Alto impacto, bajo esfuerzo → Hacer primero
- **Strategic Bets**: Alto impacto, alto esfuerzo → Planificar
- **Fill-ins**: Bajo impacto, bajo esfuerzo → Si sobra tiempo
- **Avoid**: Bajo impacto, alto esfuerzo → No hacer

---

## Calibración de Esfuerzo (Emiralia)

| Agente | Capacidad semanal | Tipo de trabajo |
|--------|-------------------|----------------|
| Dev Agent | ~40h equivalentes | Features, bugs, infra |
| Content Agent | ~40h equivalentes | Blog, fichas, copies |
| Data Agent | ~20h equivalentes | Scraping, limpieza datos |
| Frontend Agent | ~40h equivalentes | UI, landing pages |

---

## Plantilla de output

```markdown
# Priorización de Features — Emiralia
**Fecha**: [fecha]
**Framework**: [RICE / MoSCoW / Impact-Effort]

## Ranking RICE

| # | Feature | Reach | Impact | Confidence | Effort | RICE Score |
|---|---------|-------|--------|------------|--------|-----------|
| 1 | [feature] | [N] | [N] | [%] | [N] | [score] |

## Clasificación MoSCoW

### Must Have
- [feature y justificación]

### Should Have
- [feature y justificación]

### Could Have
- [feature y justificación]

### Won't Have (this sprint)
- [feature y justificación]

## Recomendación
1. **Próximo sprint**: [top 3-5 features]
2. **Sprint siguiente**: [3-5 features]
3. **Backlog**: [resto]
```

---

## Persistencia

```bash
node tools/db/save_research.js --title "Priorización Features — [fecha]" --summary "Ranking de backlog"
node tools/db/memory.js set pm-agent last_prioritization_date '"[timestamp]"' shared
```

---

## Notas

- RICE funciona mejor con **datos reales** de uso. En early-stage, usar estimaciones conservadoras.
- MoSCoW es más rápido pero menos riguroso. Útil para decisiones rápidas en sprint planning.
- Nunca priorizar sin considerar **dependencias** entre features.
- Complementar con `/planificar-sprint` para la ejecución.
