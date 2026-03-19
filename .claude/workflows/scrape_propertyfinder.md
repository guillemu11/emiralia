---
description: SOP para extraer propiedades off-plan de PropertyFinder.ae y guardarlas en la DB de Emiralia
agent: Data Agent
skill: propertyfinder-scraper
tool: tools/apify_propertyfinder.js
---

# Workflow: Scrape PropertyFinder

## Objetivo

Extraer propiedades de PropertyFinder.ae usando Apify y persistirlas en la base de datos PostgreSQL de Emiralia. Este workflow es el punto de entrada para la ingesta de datos de propiedades.

---

## Inputs requeridos

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SEARCH_URL` | URL de búsqueda de PropertyFinder con filtros | `https://www.propertyfinder.ae/en/search?c=1&fu=0&ob=nd` |
| `MAX_RESULTS` | Límite de propiedades a extraer | `50` (test), `0` (sin límite) |
| `APIFY_THREADS` | Hilos paralelos | `3` |

## Output

```yaml
type: table
destination:
  category: database
  target: PostgreSQL > tabla "properties"
write_mode: upsert
```

---

## Pasos de ejecución

### Paso 0 — Leer memoria del agente (WAT Memory)

Antes de arrancar, consultar si ya hay un scrape reciente para evitar costes innecesarios:

```bash
node tools/db/wat-memory.js check data-agent last_scrape_at
node tools/db/wat-memory.js check data-agent last_run_status
```

Si `last_scrape_at` es de hace menos de 6 horas y `last_run_status` es `"success"`, confirmar con el usuario antes de relanzar.

### Paso 1 — Verificar que la DB está corriendo

```bash
docker compose ps
```

Si `emiralia_postgres` no aparece como `running`:
```bash
npm run db:up
# Esperar ~5 segundos y volver a verificar
```

### Paso 2 — Configurar el .env

Asegúrate de que `.env` existe y contiene:
- `APIFY_TOKEN` → tu token de Apify (console.apify.com > Settings > Integrations)
- `SEARCH_URL` → URL con los filtros deseados (ver SKILL.md para construirla)
- `MAX_RESULTS` → `50` para el primer test

Si `.env` no existe:
```bash
copy .env.example .env
# Editar .env con los valores reales
```

### Paso 3 — Ejecutar el scraper

**Primer scrape (base de datos vacía):**
```bash
node tools/apify_propertyfinder.js
```

**Scrapes posteriores (recomendado):**
```bash
# Máximo ahorro: Apify solo trae nuevas + filtra contra DB
node tools/apify_propertyfinder.js --monitoring --incremental
```

**Otros modos:**
```bash
# Solo filtro DB (Apify trae todo, pero DB ignora duplicados)
node tools/apify_propertyfinder.js --incremental

# Solo monitoring Apify (Apify trae menos, DB hace upsert de todo)
node tools/apify_propertyfinder.js --monitoring
```

El script mostrará progreso en tiempo real:
- `🚀 Iniciando actor Apify` → run lanzado
- `📡 Modo MONITORING` → solo propiedades nuevas/modificadas
- `🔄 Modo INCREMENTAL` → filtrando contra DB local
- `⏳ Esperando` → el actor está procesando
- `📥 Descargando dataset` → run completado, descargando resultados
- `💾 Guardando N propiedades` → upsert en PostgreSQL
- `⏭️ Omitidas: N` → propiedades que ya existían (ahorro)

### Paso 4 — Actualizar memoria del agente (WAT Memory)

Al finalizar el scrape con éxito, persistir el estado para que otros agentes puedan coordinarse:

```bash
# Registrar URL, timestamp, total y estado del run
node tools/db/memory.js set data-agent last_scrape_url '"<SEARCH_URL>"' shared
node tools/db/memory.js set data-agent last_scrape_at '"<ISO_TIMESTAMP>"' shared
node tools/db/memory.js set data-agent total_properties <COUNT> shared
node tools/db/memory.js set data-agent last_run_status '"success"' shared
```

Si el run falla, registrar el error:
```bash
node tools/db/memory.js set data-agent last_run_status '"error"' shared
node tools/db/memory.js set data-agent last_run_error '"<mensaje>"' shared
```

### Paso 5 — Verificar los resultados

**Opción A — Adminer (recomendado):**

1. Abrir `http://localhost:8080`
2. Sistema: `PostgreSQL`, Servidor: `postgres`, Usuario/contraseña según `.env`
3. Ejecutar:
```sql
SELECT pf_id, title, price_aed, community, is_off_plan, scraped_at
FROM properties
ORDER BY scraped_at DESC
LIMIT 10;
```

**Opción B — CLI:**
```bash
docker compose exec postgres psql -U emiralia -d emiralia -c \
  "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_off_plan) as off_plan FROM properties;"
```

---

## Edge cases y resolución

| Situación | Causa probable | Solución |
|-----------|---------------|----------|
| `APIFY_TOKEN no definido` | Falta en `.env` | Añadir token de console.apify.com |
| `0 propiedades descargadas` | URL inválida o sin resultados | Verificar `SEARCH_URL` en el navegador |
| Run de Apify en `FAILED` | Error interno del actor | Buscar el Run ID en console.apify.com > Runs |
| `ECONNREFUSED` al conectar DB | PostgreSQL no está corriendo | `docker compose up -d` |
| Timeout > 10 min | Demasiadas propiedades | Reducir `MAX_RESULTS` o aumentar `APIFY_THREADS` |
| Duplicados | Normal — el upsert maneja esto | Usar `--incremental --monitoring` para minimizar coste |

---

## Runs programados (futuro)

Cuando se quiera automatizar, opciones disponibles:
1. **Apify Scheduler** — el propio Apify puede ejecutar el actor en horario definido y enviar los resultados via webhook
2. **GitHub Actions / Task Scheduler de Windows** — ejecutar el scraper en local con cron
3. **Comando recomendado para cron**: `node tools/apify_propertyfinder.js --monitoring --incremental`

---

## Extensión a nuevas zonas

Para añadir Abu Dhabi u otras zonas:
1. Ir a propertyfinder.ae, filtrar por la nueva zona
2. Copiar la URL
3. Cambiar `SEARCH_URL` en `.env` y ejecutar el workflow de nuevo
4. Los datos se acumulan en la misma tabla `properties` (campo `city` como discriminador)
