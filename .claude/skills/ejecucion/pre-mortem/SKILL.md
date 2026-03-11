---
name: pre-mortem
description: >
  Usar antes de lanzar un proyecto o feature importante. Realiza un análisis
  pre-mortem de riesgos usando la clasificación Tigers/Paper Tigers/Elephants,
  con taxonomía de riesgos específica de Emiralia y EAU.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[proyecto o feature a analizar]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - PROJECT: Proyecto o feature a analizar
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Pre-Mortem

## ¿Qué hace este skill?

Realiza un **análisis pre-mortem** de riesgos antes de lanzar un proyecto o feature. Imagina que el proyecto ha fracasado y trabaja hacia atrás para identificar las causas. Clasifica los riesgos como Tigers (reales y peligrosos), Paper Tigers (parecen peligrosos pero no lo son) y Elephants (obvios pero ignorados).

## Cuándo usarlo

- Antes de aprobar un proyecto (después del PRD, antes del sprint).
- Antes de un lanzamiento importante al mercado.
- Cuando hay un "mal presentimiento" sobre un proyecto.
- Como checkpoint obligatorio en proyectos de tamaño L.

---

## Taxonomía de riesgos de Emiralia

| Categoría | Ejemplos | Agente impactado |
|-----------|----------|-----------------|
| **Datos** | Apify rate limits, cambios en PropertyFinder, precios incorrectos, datos obsoletos | Data Agent |
| **Legales EAU** | Cambios regulatorios RERA, restricciones compradores extranjeros, licencias | Legal |
| **Mercado** | Caída mercado Dubai, competencia lanza versión español, cambio tendencias | PM Agent |
| **Adquisición** | SEO penalizado, CAC alto en LatAm, baja conversión orgánica | Marketing Agent |
| **Técnicos** | Fallo agentes IA, downtime DB, errores en listings, problemas de escala | Dev Agent |
| **Financieros** | Costes API inesperados, burn rate alto, no revenue en 6 meses | PM Agent |

---

## Clasificación de riesgos

| Tipo | Descripción | Acción |
|------|-------------|--------|
| **Tiger** | Riesgo real y peligroso. Puede destruir el proyecto. | Plan de mitigación obligatorio |
| **Paper Tiger** | Parece peligroso pero no lo es. Causa preocupación innecesaria. | Documentar por qué no es riesgo real |
| **Elephant** | Obvio para todos pero nadie lo menciona. El "elefante en la sala". | Confrontar directamente |

---

## Plantilla de output

```markdown
# Pre-Mortem: [Proyecto/Feature]
**Fecha**: [fecha]

## Escenario de fracaso
> "Es [fecha + 6 meses]. [Proyecto] ha fracasado. ¿Qué salió mal?"

## Tigers (Riesgos reales)

### Tiger 1: [Nombre del riesgo]
- **Categoría**: [Datos/Legal/Mercado/Adquisición/Técnico/Financiero]
- **Probabilidad**: [Alta/Media/Baja]
- **Impacto**: [Crítico/Alto/Medio/Bajo]
- **Señal de alerta temprana**: [qué indicador observar]
- **Plan de mitigación**: [acciones preventivas]
- **Plan de contingencia**: [qué hacer si ocurre]
- **Responsable de monitoreo**: [agente]

## Paper Tigers (Riesgos aparentes)

### Paper Tiger 1: [Nombre]
- **Por qué parece peligroso**: [percepción]
- **Por qué NO es riesgo real**: [evidencia]
- **Acción**: Ignorar, no invertir recursos

## Elephants (Riesgos ignorados)

### Elephant 1: [Nombre]
- **Por qué se ignora**: [razón]
- **Por qué es importante**: [impacto real]
- **Acción requerida**: [confrontar directamente]

## Matriz de Riesgos

| Riesgo | Tipo | Prob. | Impacto | Score | Acción |
|--------|------|-------|---------|-------|--------|
| [riesgo] | Tiger | [A/M/B] | [C/A/M/B] | [1-10] | [Mitigar/Aceptar/Evitar] |

## Plan de Monitoreo
| Riesgo | Indicador | Frecuencia | Umbral de alerta | Responsable |
|--------|-----------|------------|-------------------|-------------|
```

---

## Persistencia

```bash
node tools/db/save_research.js --title "Pre-Mortem — [proyecto]" --summary "Análisis de riesgos pre-lanzamiento"
node tools/db/memory.js set pm-agent last_premortem '"[proyecto]"' shared
```

---

## Notas

- El pre-mortem es más efectivo cuando se hace **antes** de estar emocionalmente comprometido con el proyecto.
- Mínimo identificar **3 Tigers**, **1 Paper Tiger** y **1 Elephant** por proyecto.
- Los Paper Tigers son valiosos: reducen la ansiedad del equipo al descartar riesgos falsos.
- Complementar con `/crear-prd` para el contexto del proyecto.
