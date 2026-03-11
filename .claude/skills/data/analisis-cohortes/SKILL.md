---
name: analisis-cohortes
description: >
  Usar cuando se necesite analizar datos de propiedades por cohortes: comunidad,
  rango de precio, fecha de scraping o tipo de propiedad. Identifica tendencias
  y patrones en el inventario inmobiliario de EAU.
agent: Data Agent
disable-model-invocation: true
argument-hint: "[tipo: propiedades|comunidades|precios|temporal]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/query_properties.js
  - tools/db/save_research.js
inputs:
  - COHORT_TYPE: Tipo de análisis (propiedades, comunidades, precios, temporal)
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Análisis de Cohortes

## ¿Qué hace este skill?

Analiza los datos de propiedades de Emiralia agrupados en **cohortes** para identificar tendencias, patrones de calidad y oportunidades de mercado. Adaptado al estado actual de Emiralia (datos de propiedades, no usuarios aún).

## Cuándo usarlo

- Para entender la distribución del inventario por zona y precio.
- Para detectar problemas de calidad de datos.
- Para identificar comunidades trending o developers activos.
- Como parte del workflow de data intelligence.

---

## Tipos de análisis disponibles

### A. Cohorte por Comunidad
Agrupa propiedades por zona geográfica para entender cobertura y precios.

```sql
SELECT community, COUNT(*) as listings,
  AVG(price_aed)::BIGINT as precio_medio,
  AVG(size_sqft)::INT as superficie_media,
  COUNT(CASE WHEN is_off_plan THEN 1 END) as off_plan,
  COUNT(CASE WHEN images IS NOT NULL THEN 1 END) as con_imagenes
FROM properties WHERE city = 'Dubai'
GROUP BY community ORDER BY listings DESC;
```

### B. Cohorte por Rango de Precio
Distribución del inventario por brackets de precio.

```sql
SELECT
  CASE
    WHEN price_aed < 500000 THEN 'Accesible (< 500K AED)'
    WHEN price_aed < 1000000 THEN 'Medio (500K-1M)'
    WHEN price_aed < 2000000 THEN 'Alto (1M-2M)'
    WHEN price_aed < 5000000 THEN 'Premium (2M-5M)'
    ELSE 'Lujo (> 5M)'
  END as segmento,
  COUNT(*) as cantidad,
  AVG(size_sqft)::INT as superficie_media,
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM properties) * 100, 1) as porcentaje
FROM properties WHERE price_aed IS NOT NULL
GROUP BY 1 ORDER BY MIN(price_aed);
```

### C. Cohorte Temporal
Evolución del inventario por semana de scraping.

```sql
SELECT DATE_TRUNC('week', scraped_at) as semana,
  COUNT(*) as nuevas_propiedades,
  AVG(price_aed)::BIGINT as precio_medio_nuevas
FROM properties
GROUP BY 1 ORDER BY 1 DESC LIMIT 12;
```

### D. Cohorte por Tipo de Propiedad
Distribución apartments vs villas vs townhouses.

---

## Plantilla de output

```markdown
# Análisis de Cohortes — [Tipo]
**Fecha**: [fecha]
**Propiedades analizadas**: [N]

## Resumen Ejecutivo
[2-3 líneas con los hallazgos principales]

## Resultados por Cohorte

### [Cohorte 1]
| Métrica | Valor |
|---------|-------|
| Total propiedades | [N] |
| Precio medio | [AED] |
| Superficie media | [sqft] |
| % off-plan | [%] |
| Calidad datos | [%] |

## Tendencias Identificadas
1. [Tendencia 1 con datos]
2. [Tendencia 2 con datos]

## Anomalías Detectadas
| Anomalía | Propiedades afectadas | Acción recomendada |
|----------|----------------------|-------------------|

## Insights Accionables
- **Para PM Agent**: [insight de producto]
- **Para Marketing Agent**: [insight de campaña]
- **Para Content Agent**: [insight de contenido]
```

---

## Persistencia

```bash
node tools/db/save_research.js --title "Cohorte Analysis — [tipo] [fecha]" --summary "Análisis de cohortes"
node tools/db/memory.js set data-agent last_cohort_analysis '"[fecha]"' shared
```

---

## Notas

- Este skill trabaja con **datos de propiedades** (no usuarios). Los análisis de cohortes de usuarios se añadirán cuando exista tracking.
- Anomalías comunes: precios en 0, propiedades sin community, duplicados de pf_id.
- Complementar con `/consultas-sql` para queries ad-hoc adicionales.
