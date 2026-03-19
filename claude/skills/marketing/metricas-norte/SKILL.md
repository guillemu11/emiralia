---
name: metricas-norte
description: >
  Usar cuando se necesite definir o revisar la North Star Metric de Emiralia
  y sus métricas de input. Evalúa candidatos a NSM y diseña el árbol de
  métricas que guía las decisiones de producto y crecimiento.
agent: Marketing Agent
disable-model-invocation: true
argument-hint: "[candidatos a NSM o 'evaluar todos']"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - CANDIDATES: Candidatos a NSM o 'evaluar todos'
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Métricas Norte (North Star Metric)

## ¿Qué hace este skill?

Define la **North Star Metric** de Emiralia y las 3-5 **input metrics** que la impulsan. La NSM es la métrica única que mejor captura el valor que Emiralia entrega a sus usuarios.

## Cuándo usarlo

- Al inicio del proyecto para alinear a todos los agentes.
- Cuando los KPIs actuales no guían decisiones claras.
- Como parte del workflow de marketing planning.

---

## Candidatas a NSM para Emiralia

| Candidata | Qué mide | Tipo de juego |
|-----------|----------|---------------|
| Leads cualificados / semana | Valor entregado al inversor (llegó al agente) | Attention |
| Propiedades indexadas en español | Cobertura del marketplace | Transaction |
| Usuarios activos semanales | Engagement de la plataforma | Attention |
| Sesiones búsqueda→contacto | Conversión completa del journey | Transaction |
| Contenido consumido / usuario | Educación del inversor | Attention |

## Criterios de evaluación de una NSM

Una buena NSM debe cumplir los 7 criterios:

| # | Criterio | Pregunta |
|---|----------|----------|
| 1 | Captura valor | ¿Refleja el valor que el usuario recibe? |
| 2 | Predice ingresos | ¿Si sube, los ingresos subirán? |
| 3 | Accionable | ¿El equipo puede influir directamente? |
| 4 | Simple | ¿Se entiende en 5 segundos? |
| 5 | Medible | ¿Se puede medir con la infraestructura actual? |
| 6 | No es vanity | ¿No se puede manipular fácilmente? |
| 7 | Alinea equipos | ¿Todos los agentes contribuyen a moverla? |

---

## Plantilla de output

```markdown
# North Star Metric — Emiralia
**Fecha**: [fecha]

## Evaluación de Candidatas

| Candidata | Valor | Ingresos | Accionable | Simple | Medible | No-vanity | Alinea | Score |
|-----------|-------|----------|------------|--------|---------|-----------|--------|-------|
| [candidata] | [1-5] | [1-5] | [1-5] | [1-5] | [1-5] | [1-5] | [1-5] | [/35] |

## NSM Seleccionada
> **[Métrica]**: [definición precisa]

### Por qué esta métrica
[Justificación en 2-3 líneas]

### Qué NO es la NSM
- No es revenue (es un output, no un input)
- No es tráfico (es vanity sin conversión)
- No es NPS (es difícil de medir frecuentemente)

## Input Metrics (3-5)

| Input Metric | Relación con NSM | Responsable | Frecuencia |
|-------------|-----------------|-------------|-----------|
| [métrica 1] | [cómo mueve la NSM] | [agente] | [diaria/semanal] |

### Árbol de Métricas
```
NSM: [Leads cualificados / semana]
├── Tráfico orgánico → Content Agent + SEO Agent
├── Tasa contacto agente → Frontend Agent (UX)
├── Propiedades con ficha completa → Data Agent + Content Agent
├── Emails captados → Marketing Agent
└── Conversión email→lead → Marketing Agent
```
```

---

## Persistencia

```bash
node tools/db/save_research.js --title "North Star Metric — [fecha]" --summary "NSM + input metrics"
node tools/db/memory.js set marketing-agent north_star_metric '"[métrica]"' shared
node tools/db/memory.js set marketing-agent input_metrics '"[lista]"' shared
```

---

## Notas

- Solo **UNA** North Star Metric. Si tienes dos, no tienes ninguna.
- Las input metrics deben ser **leading indicators** (predicen el futuro), no lagging (miden el pasado).
- Revisar la NSM cada **trimestre**. Puede cambiar conforme Emiralia evoluciona.
