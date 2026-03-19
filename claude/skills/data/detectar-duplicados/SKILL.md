---
name: detectar-duplicados
description: >
  Detecta propiedades duplicadas en la tabla `properties` donde el mismo
  inmueble físico está listado por diferentes agentes/brokers con distintos
  pf_id. Opera en tres niveles: coincidencia RERA exacta, coincidencia de
  edificio+specs, y proximidad GPS+specs. Nunca elimina registros — solo
  los marca con `duplicate_of`.
agent: Data Agent
argument-hint: "[--tier 1|2|3|all] [--dry-run] [--mark]"
tools:
  - tools/db/detect_duplicates.js
  - tools/db/memory.js
  - tools/db/wat-memory.js
inputs:
  - TIER: Nivel de detección (1=RERA, 2=edificio+specs, 3=GPS+specs, all=todos). Default: all
  - MODE: dry-run (solo reporte) | mark (marcar duplicados en DB). Default: dry-run
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > agent_memory (data-agent) + consola
  write_mode: update
---

# Skill: Detectar Duplicados

## ¿Qué hace este skill?

Identifica **cross-broker duplicates**: el mismo inmueble físico publicado por
diferentes agentes con diferentes `pf_id`. El upsert por `pf_id` existente solo
evita re-importar el mismo listing. Este skill va un nivel más allá detectando
cuando la misma unidad física aparece con diferentes identificadores.

Opera en tres niveles de confianza:

| Tier | Señal | Confianza |
|------|-------|-----------|
| 1 | Mismo `rera` (no nulo), diferente `pf_id` | Definitivo |
| 2 | Mismo `building_name` + `community` + `bedrooms_value` + `size_sqft` (±1%) + `price_aed` (±5%) | Probable |
| 3 | Coordenadas GPS dentro de ~50m + mismo `bedrooms_value` + `size_sqft` (±1%) | Probable |

**Regla crítica:** Este skill **nunca elimina propiedades**. Solo marca duplicados
escribiendo `duplicate_of = <canonical_pf_id>` en la fila no-canónica.

---

## Cuándo usar este skill

- Tras un scrape masivo para limpiar el inventario antes de publicar en plataforma
- Semanalmente como parte del workflow de calidad de datos
- Cuando se detecte inflación anómala del número de listings en una comunidad
- Antes de generar métricas de inventario para el PM Agent o Marketing Agent

---

## Proceso paso a paso

### Paso 0: Verificar estado del sistema

```bash
node tools/db/wat-memory.js check data-agent last_dedup_at
```

Si `last_dedup_at` es de hace menos de 24 horas, confirmar con el usuario
antes de relanzar.

### Paso 1: Ejecutar en modo dry-run primero (siempre)

```bash
node tools/db/detect_duplicates.js --tier all --dry-run
```

Revisar el reporte antes de marcar en base de datos.

### Paso 2: Revisar grupos sospechosos

El output del dry-run muestra una tabla:

```
group_id   canonical        duplicates                          size  reason
t1-1       PF-12345         PF-67890, PF-11111                  3     rera: REG-2024-001
t2-1       PF-22222         PF-33333                            2     building + community + specs match
```

### Paso 3: Marcar duplicados (solo si el dry-run es correcto)

```bash
# Marcar todos los tiers
node tools/db/detect_duplicates.js --mark

# O marcar solo Tier 1 (más seguro para empezar)
node tools/db/detect_duplicates.js --tier 1 --mark
```

### Paso 4: Verificar en DB

```bash
node tools/db/query_properties.js "SELECT duplicate_of, COUNT(*) FROM properties WHERE duplicate_of IS NOT NULL GROUP BY duplicate_of ORDER BY COUNT(*) DESC LIMIT 10"
```

### Paso 5: Verificar memoria

```bash
node tools/db/memory.js list data-agent
```

---

## Criterios de selección del listing canónico

Dentro de cada grupo de duplicados, el listing canónico se elige con esta prioridad:

1. `is_verified = TRUE` → preferido siempre
2. `is_premium = TRUE` → segunda preferencia
3. `scraped_at DESC` → más reciente gana

Los demás listings del grupo reciben `duplicate_of = <canonical_pf_id>`.

---

## Comportamiento ante errores

| Error | Acción |
|-------|--------|
| DB no disponible (`ECONNREFUSED`) | Detener. Ejecutar `docker compose up -d` |
| `duplicate_of` columna no existe | Aplicar migración: `node tools/db/init_db.js` |
| 0 duplicados en Tier 1 | Normal si todos los RERA son únicos o nulos. Proceder con Tier 2/3 |
| Grupo con >10 duplicados | Posible dato corrupto — revisar manualmente antes de marcar |
| Error en `--mark` mode | Transacción con rollback automático, sin datos parciales |

---

## Notas operativas

- Los duplicados marcados con `duplicate_of` NO se eliminan de la tabla. La plataforma web los filtra con `WHERE duplicate_of IS NULL`.
- El campo `duplicate_group` agrupa todos los pf_ids del mismo inmueble (incluido el canónico) para trazabilidad.
- Para desmarcar un falso positivo: `UPDATE properties SET duplicate_of = NULL, duplicate_group = NULL WHERE pf_id = '<id>'`
- Tier 3 (GPS) puede generar falsos positivos en edificios densos con múltiples unidades similares. Usar con revisión manual.
