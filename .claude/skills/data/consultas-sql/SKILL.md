---
name: consultas-sql
description: >
  Usar cuando se necesite generar o ejecutar consultas SQL sobre la base de datos
  de Emiralia. Transforma preguntas en lenguaje natural a queries PostgreSQL
  optimizadas. Solo permite SELECT (read-only).
agent: Data Agent
model: haiku
allowed-tools:
  - Bash
  - Read
  - Grep
disable-model-invocation: true
argument-hint: "[descripción en lenguaje natural de lo que quieres consultar]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/query_properties.js
inputs:
  - QUERY_DESCRIPTION: Descripción en lenguaje natural de los datos que necesitas
outputs:
  type: table
  destination:
    category: database
    target: Resultados en consola / pm_reports si se quiere persistir
  write_mode: create_new
---

## Schema actual
!`node tools/db/query_properties.js schema`

## Estado del agente
!`node tools/db/memory.js list data-agent`

# Skill: Consultas SQL

## ¿Qué hace este skill?

Transforma preguntas en **lenguaje natural** a consultas **PostgreSQL** optimizadas sobre la base de datos de Emiralia. Solo genera y ejecuta queries SELECT (read-only).

## Cuándo usarlo

- Para análisis ad-hoc de datos de propiedades.
- Cuando cualquier agente necesite datos de la DB para tomar decisiones.
- Para generar reportes rápidos de KPIs.
- Como parte del workflow de data intelligence.

---

## Schema de referencia

### Tabla `properties` (principal)
```sql
pf_id TEXT PK, url TEXT, title TEXT, description TEXT,
community TEXT, city TEXT, building_name TEXT,
property_type TEXT, listing_type TEXT, bedrooms_value INT, bathrooms INT,
size_sqft NUMERIC, price_aed BIGINT, price_currency TEXT,
latitude NUMERIC, longitude NUMERIC,
features JSONB, amenities JSONB, images JSONB,
agent_name TEXT, agent_phone TEXT, broker_name TEXT,
is_off_plan BOOLEAN, is_verified BOOLEAN, completion_status TEXT,
scraped_at TIMESTAMPTZ, added_on_pf TIMESTAMPTZ
```

### Tabla `projects`
```sql
id SERIAL PK, name TEXT, problem TEXT, solution TEXT,
success_metrics JSONB, department TEXT, risks JSONB,
status TEXT, created_at TIMESTAMPTZ
```

### Tabla `tasks`
```sql
id SERIAL PK, phase_id INT FK, description TEXT,
agent TEXT, effort TEXT, status TEXT, priority TEXT
```

### Tabla `agent_memory`
```sql
agent_id TEXT, key TEXT, value JSONB, scope TEXT
```

---

## Queries frecuentes de Emiralia

```sql
-- Resumen general de propiedades
SELECT city, COUNT(*) as total, AVG(price_aed)::BIGINT as precio_medio,
  MIN(price_aed) as min_precio, MAX(price_aed) as max_precio
FROM properties GROUP BY city ORDER BY total DESC;

-- Top 10 comunidades por volumen
SELECT community, COUNT(*) as listings, AVG(price_aed)::BIGINT as precio_medio
FROM properties WHERE city = 'Dubai'
GROUP BY community ORDER BY listings DESC LIMIT 10;

-- Propiedades off-plan por developer
SELECT broker_name, COUNT(*) as listings, AVG(price_aed)::BIGINT as precio_medio
FROM properties WHERE is_off_plan = true
GROUP BY broker_name ORDER BY listings DESC LIMIT 10;

-- Nuevas propiedades últimas 24h
SELECT pf_id, title, price_aed, community, property_type
FROM properties WHERE scraped_at > NOW() - INTERVAL '24 hours'
ORDER BY scraped_at DESC;

-- Distribución por rango de precio (en AED)
SELECT
  CASE
    WHEN price_aed < 500000 THEN '< 500K'
    WHEN price_aed < 1000000 THEN '500K-1M'
    WHEN price_aed < 2000000 THEN '1M-2M'
    WHEN price_aed < 5000000 THEN '2M-5M'
    ELSE '> 5M'
  END as rango,
  COUNT(*) as cantidad
FROM properties WHERE price_aed IS NOT NULL
GROUP BY 1 ORDER BY MIN(price_aed);
```

---

## Proceso paso a paso

### Paso 1: Interpretar la pregunta en lenguaje natural
### Paso 2: Generar la query SQL correspondiente
### Paso 3: Validar que es SELECT-only
### Paso 4: Ejecutar con `tools/db/query_properties.js`

```bash
node tools/db/query_properties.js "SELECT ..."
```

### Paso 5: Formatear y presentar resultados

---

## Reglas de seguridad

- **SOLO SELECT y WITH (CTE)**. Nunca INSERT, UPDATE, DELETE, DROP.
- Si el usuario pide modificar datos, rechazar y sugerir usar el tool específico.
- Queries con LIMIT recomendado para tablas grandes (default: LIMIT 100).

---

## Persistencia

Si el usuario quiere guardar los resultados:
```bash
node tools/db/save_research.js --title "Query: [descripción]" --summary "Resultados de consulta SQL"
```

---

## Notas

- Siempre mostrar la query generada antes de ejecutar, para que el usuario pueda revisarla.
- Los precios están en AED. Para convertir a EUR, dividir entre ~4.
- La tabla `properties` puede tener miles de registros. Usar LIMIT para queries exploratorias.
