---
name: loops-crecimiento
description: >
  Usar cuando se necesite diseñar o analizar loops de crecimiento sostenible
  para Emiralia. Identifica flywheels que se auto-refuerzan: content, community,
  data y agency loops adaptados al contexto PropTech.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[loop: content|community|data|agency|todos]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - LOOP_TYPE: Tipo de loop a analizar (content, community, data, agency, todos)
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Loops de Crecimiento

## ¿Qué hace este skill?

Diseña **growth loops** (bucles de crecimiento auto-reforzantes) específicos para Emiralia. A diferencia de funnels lineales, los loops generan crecimiento compuesto donde cada output alimenta el siguiente input.

## Cuándo usarlo

- Al diseñar la estrategia de crecimiento a largo plazo.
- Cuando se necesite justificar por qué un canal es sostenible.
- Para identificar "leaks" (fugas) que rompen los loops existentes.
- Como input para el plan GTM.

---

## Loops pre-identificados para Emiralia

### 1. Content Loop (SEO)
```
Contenido en español → SEO rankings → Tráfico orgánico → Leads → Revenue → Más contenido
```

### 2. Community Loop (Referral)
```
Inversor satisfecho → Recomienda a amigos → Nuevos usuarios → Más comunidad → Más confianza → Más inversores
```

### 3. Data Loop (Network Effect)
```
Más propiedades indexadas → Mejor búsqueda → Más usuarios → Más datos de demanda → Mejores recomendaciones → Más propiedades
```

### 4. Agency Loop (B2B)
```
Agencias pagan por leads → Más listados exclusivos → Mejor plataforma → Más usuarios → Más leads → Más agencias
```

---

## Proceso paso a paso

Actúa como un **Growth Strategist** especializado en marketplaces de dos lados. Para `$ARGUMENTS`:

### Paso 1: Mapear el loop completo
Identificar cada nodo y la transición entre ellos.

### Paso 2: Cuantificar el multiplicador
¿Cuántos outputs genera cada input? (Ej: 1 artículo SEO → X visitas → Y leads)

### Paso 3: Identificar leaks (fugas)
¿Dónde se pierde momentum en el loop?

### Paso 4: Diseñar acciones para activar y sellar leaks

---

## Plantilla de output

```markdown
# Growth Loops — Emiralia
**Fecha**: [fecha]

## [Nombre del Loop]

### Diagrama
[Nodo A] → [Nodo B] → [Nodo C] → [Nodo D] → [vuelve a Nodo A]

### Métricas por nodo
| Nodo | Métrica | Valor actual | Valor objetivo |
|------|---------|-------------|----------------|
| [A] | [métrica] | [actual] | [objetivo] |

### Multiplicador del loop
- Input: [1 unidad de X]
- Output estimado: [N unidades de Y que vuelven como input]
- Tiempo de ciclo: [días/semanas para completar 1 vuelta]

### Leaks identificados
| Leak | Impacto | Solución |
|------|---------|----------|
| [Punto donde se pierde momentum] | [% pérdida] | [Acción concreta] |

### Condiciones de activación
- [Qué necesita Emiralia para que este loop empiece a funcionar]
- [Umbral mínimo de usuarios/propiedades/contenido]

### Acciones recomendadas
1. [Acción para activar el loop]
2. [Acción para sellar el leak principal]
3. [Acción para acelerar el ciclo]
```

---

## Persistencia

```bash
node tools/db/save_research.js --title "Growth Loops — [tipo] [fecha]" --summary "Diseño de loops de crecimiento"
node tools/db/memory.js set pm-agent growth_loops_defined '"[tipos]"' shared
```

---

## Notas

- Un loop no funciona si algún nodo tiene tasa de conversión 0. Verificar que **todos los nodos** sean viables.
- En early-stage, el **Content Loop** suele ser el primero en activarse (bajo coste, alto impacto a medio plazo).
- Los loops de **network effect** (Data, Agency) requieren masa crítica. No priorizar en Fase 1.
- Complementar con `/estrategia-gtm` para integrar los loops en el plan de ejecución.
