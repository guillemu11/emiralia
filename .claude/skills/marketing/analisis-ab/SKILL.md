---
name: analisis-ab
description: >
  Usar cuando se necesite analizar resultados de tests A/B en Emiralia.
  Calcula significancia estadística, tamaño de muestra necesario y
  recomienda ship/extend/stop.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[datos del test en JSON o descripción]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - TEST_DATA: Datos del test (variantes, conversiones, muestras)
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Análisis A/B

## ¿Qué hace este skill?

Analiza resultados de **tests A/B** ejecutados en Emiralia. Calcula significancia estadística, interpreta resultados y recomienda si shipear, extender o parar el test.

## Cuándo usarlo

- Después de ejecutar un test A/B en la plataforma.
- Para calcular el tamaño de muestra necesario antes de un test.
- Para interpretar resultados con muestras pequeñas (early stage).

---

## Tipos de tests A/B en Emiralia

| Tipo | Ejemplo | Métrica principal |
|------|---------|------------------|
| UI | Search results: lista vs cards | CTR en propiedades |
| Content | Ficha de propiedad: corta vs larga | Tiempo en página, contacto |
| CTA | "Contactar agente" vs "Ver más detalles" | Tasa de contacto |
| SEO | Meta descriptions variantes | CTR desde Google |
| Email | Subject lines diferentes | Open rate, CTR |

---

## Proceso paso a paso

### Paso 1: Recibir datos del test
Formato esperado:
```json
{
  "test_name": "CTA Contactar vs Ver más",
  "duration_days": 14,
  "variant_a": { "name": "Contactar agente", "visitors": 500, "conversions": 25 },
  "variant_b": { "name": "Ver más detalles", "visitors": 480, "conversions": 35 }
}
```

### Paso 2: Calcular métricas

**Tasa de conversión**: conversions / visitors
**Lift**: (B - A) / A × 100%

### Paso 3: Evaluar significancia estadística

**Test Z para proporciones**:
- p̂_A = conversiones_A / visitantes_A
- p̂_B = conversiones_B / visitantes_B
- p̂ = (conv_A + conv_B) / (vis_A + vis_B)
- SE = √(p̂ × (1-p̂) × (1/n_A + 1/n_B))
- Z = (p̂_B - p̂_A) / SE
- p-value: lookup from Z-score

**Umbral**: p < 0.05 para significancia

### Paso 4: Calcular tamaño de muestra necesario
Si el test no es significativo, calcular cuántos visitantes más se necesitan.

### Paso 5: Recomendar acción

---

## Plantilla de output

```markdown
# Análisis A/B: [Nombre del Test]
**Fecha**: [fecha]
**Duración**: [N] días

## Resultados

| Métrica | Variante A | Variante B | Diferencia |
|---------|-----------|-----------|-----------|
| Visitantes | [N] | [N] | - |
| Conversiones | [N] | [N] | - |
| Tasa conversión | [%] | [%] | [+/- %] |
| Lift | - | [%] | - |

## Significancia Estadística
- **Z-score**: [valor]
- **p-value**: [valor]
- **Significativo**: [Sí/No] (umbral: p < 0.05)
- **Intervalo de confianza del lift**: [[min%, max%]]

## Recomendación

### SHIP / EXTEND / STOP

**[Recomendación]**: [Justificación]

| Condición | Acción |
|-----------|--------|
| p < 0.05 y lift > 0 | **SHIP** variante ganadora |
| p > 0.05 y tendencia positiva | **EXTEND** test [N] días más |
| p > 0.05 y sin tendencia | **STOP** test, no hay diferencia real |
| p < 0.05 y lift < 0 | **REVERT** a variante original |

## Aprendizajes
- [Qué hemos aprendido sobre nuestros usuarios]
- [Implicaciones para futuros tests]
```

---

## Guía para early-stage (muestras pequeñas)

- Con < 100 visitantes por variante: **no ejecutar tests A/B**. Mejor hacer cambios directos y medir before/after.
- Con 100-500 por variante: solo detectarás diferencias **grandes** (> 30% lift).
- Con 500-1000: detectarás diferencias **medianas** (10-30% lift).
- Con > 1000: detectarás diferencias **pequeñas** (< 10% lift).

---

## Persistencia

```bash
node tools/db/save_research.js --title "A/B Test — [nombre]" --summary "Análisis de test A/B"
node tools/db/memory.js set pm-agent last_ab_test '"[nombre]"' shared
```

---

## Notas

- **No hacer p-hacking**: decidir el tamaño de muestra ANTES de empezar el test.
- Un test por vez. No testear múltiples cambios simultáneamente.
- Complementar con `/metricas-norte` para alinear los tests con la NSM.
