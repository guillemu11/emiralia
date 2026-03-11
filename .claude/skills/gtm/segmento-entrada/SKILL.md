---
name: segmento-entrada
description: >
  Usar cuando se necesite seleccionar el mercado de entrada (beachhead) de Emiralia.
  Evalúa España, LatAm y Expats como primer segmento objetivo usando una matriz
  de criterios ponderados.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[mercados a evaluar o 'todos']"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - MARKETS: Mercados a evaluar (espana, latam, expats, o todos)
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Segmento de Entrada (Beachhead)

## ¿Qué hace este skill?

Evalúa los mercados candidatos para Emiralia y recomienda el **beachhead**: el primer segmento de mercado donde concentrar todos los esfuerzos de lanzamiento. Usa una matriz de criterios ponderados con datos reales.

## Cuándo usarlo

- Antes de definir la estrategia GTM.
- Cuando haya debate sobre si empezar por España o LatAm.
- Al evaluar la entrada a un nuevo segmento geográfico.

---

## Mercados candidatos

| Mercado | Descripción | Tamaño estimado |
|---------|-------------|-----------------|
| **España** | Inversores y empresarios españoles buscando diversificar en Dubai | ~20,000-40,000 interesados |
| **Venezuela** | Protección de capital, diáspora grande en Madrid/Miami/Dubai | ~10,000-20,000 |
| **Colombia** | Clase media-alta emergente, interés creciente en inversión exterior | ~5,000-15,000 |
| **Argentina** | Protección contra inflación, historial de inversión inmobiliaria | ~10,000-20,000 |
| **México** | Mayor mercado hispano, pero menor conexión con EAU | ~5,000-10,000 |
| **Expats hispanos en EAU** | Ya viven en Dubai/Abu Dhabi, alta intención de compra | ~40,000 personas |

---

## Proceso paso a paso

Actúa como un **estratega de growth y market entry** especializado en marketplaces. Para `$ARGUMENTS`:

### Paso 1: Definir criterios de evaluación
### Paso 2: Puntuar cada mercado (1-5 por criterio)
### Paso 3: Calcular score ponderado
### Paso 4: Recomendar beachhead con justificación

---

## Plantilla de output

```markdown
# Selección de Beachhead — Emiralia
**Fecha**: [fecha]

## Criterios de Evaluación

| Criterio | Peso | Justificación |
|----------|------|---------------|
| Tamaño del segmento accesible | 20% | ¿Cuántos potenciales usuarios hay? |
| Capacidad adquisitiva | 20% | ¿Pueden comprar propiedades en EAU? |
| CAC estimado | 15% | ¿Cuánto cuesta adquirir un usuario? |
| Ciclo de decisión | 10% | ¿Cuánto tardan en decidir comprar? |
| Facilidad de contenido/SEO | 15% | ¿Podemos rankear fácilmente en sus búsquedas? |
| Proximidad cultural con EAU | 10% | ¿Tienen conexión previa con Emiratos? |
| Potencial de referral | 10% | ¿Recomiendan a otros inversores? |

## Matriz de Evaluación

| Criterio (Peso) | España | LatAm (Vzla/Arg/Col) | Expats EAU |
|------------------|--------|----------------------|------------|
| Tamaño (20%) | [1-5] | [1-5] | [1-5] |
| Capacidad adquisitiva (20%) | [1-5] | [1-5] | [1-5] |
| CAC estimado (15%) | [1-5] | [1-5] | [1-5] |
| Ciclo decisión (10%) | [1-5] | [1-5] | [1-5] |
| Facilidad SEO (15%) | [1-5] | [1-5] | [1-5] |
| Proximidad EAU (10%) | [1-5] | [1-5] | [1-5] |
| Potencial referral (10%) | [1-5] | [1-5] | [1-5] |
| **Score ponderado** | **[X.X]** | **[X.X]** | **[X.X]** |

## Recomendación

### Beachhead seleccionado: [Mercado]

**Justificación:**
1. [Razón principal con datos]
2. [Razón secundaria]
3. [Ventaja competitiva en este segmento]

**Riesgos del beachhead seleccionado:**
- [Riesgo 1 y mitigación]
- [Riesgo 2 y mitigación]

**Plan de expansión post-beachhead:**
- Fase 1: [Beachhead] (meses 0-6)
- Fase 2: [Segundo mercado] (meses 6-12)
- Fase 3: [Tercer mercado] (meses 12-18)
```

---

## Persistencia

```bash
node tools/db/save_research.js --title "Beachhead Analysis — [fecha]" --summary "Selección de mercado de entrada"
node tools/db/memory.js set pm-agent beachhead_market '"[mercado]"' shared
node tools/db/memory.js set marketing-agent beachhead_market '"[mercado]"' shared
```

---

## Notas

- La selección debe basarse en **datos**, no en intuición.
- El beachhead perfecto combina tamaño suficiente + capacidad adquisitiva + bajo CAC.
- No intentar atacar todos los mercados a la vez. El focus es clave en early-stage.
- Complementar con `/tamanio-mercado` para dimensionar cada segmento.
