---
name: propertyfinder-scraper
description: >
  Extrae propiedades de PropertyFinder.ae usando el actor de Apify
  `dhrumil/propertyfinder-scraper` y las persiste en PostgreSQL.
  Cubre todos los campos disponibles: precio, habitaciones, baños,
  superficie, descripción, imágenes, agente, agencia, RERA,
  coordenadas GPS, amenidades, estado de entrega y árbol de ubicación.
agent: Data Agent
context: fork
allowed-tools:
  - Bash
  - Read
  - Grep
tools:
  - tools/apify_propertyfinder.js
  - tools/db/init_db.js
inputs:
  - SEARCH_URL: URL de búsqueda de PropertyFinder con filtros aplicados
  - MAX_RESULTS: Número máximo de propiedades a extraer (0 = sin límite)
  - APIFY_THREADS: Hilos paralelos del actor (1-5)
outputs:
  type: table
  destination:
    category: database
    target: PostgreSQL > tabla `properties`
  write_mode: upsert
---

# Skill: PropertyFinder Scraper

## ¿Qué hace este skill?

Extrae listados de propiedades de [PropertyFinder.ae](https://www.propertyfinder.ae) y los guarda en la base de datos PostgreSQL de Emiralia.

El agente usa el actor **`dhrumil/propertyfinder-scraper`** del marketplace de Apify, que accede directamente a la API interna de PropertyFinder y extrae datos estructurados para cada propiedad.

---

## Cuándo usar este skill

- Cuando se necesite poblar o actualizar la base de datos de propiedades
- Para importar un nuevo segmento (zona, tipo de propiedad, precio)
- Para detectar propiedades nuevas publicadas desde el último run
- Como paso previo a cualquier workflow de content generation o SEO

---

## Cómo construir la URL de búsqueda

1. Ve a [propertyfinder.ae](https://www.propertyfinder.ae/en/search)
2. Aplica los filtros que necesites (zona, tipo, precio, off-plan, etc.)
3. Copia la URL de la barra del navegador
4. Pégala como `SEARCH_URL` en el fichero `.env`

### Parámetros clave de la URL

| Parámetro | Valores | Descripción |
|-----------|---------|-------------|
| `c=1`     | 1=venta, 2=alquiler | Tipo de operación |
| `fu=0`    | 0=off-plan, 1=listo | Estado de la propiedad |
| `ob=nd`   | nd=más nuevo primero | Ordenación |
| `rms=1`   | 1+ | Mínimo de habitaciones |
| `l=`      | IDs de zona | Zona geográfica |

### Ejemplo para off-plan Dubai (todos los tipos):

```
https://www.propertyfinder.ae/en/search?c=1&fu=0&ob=nd
```

---

## Campos extraídos

| Campo | Descripción |
|-------|-------------|
| `pf_id` | ID único de PropertyFinder |
| `title` | Título del anuncio |
| `price_aed` | Precio en AED |
| `property_type` | Apartment, Villa, Townhouse… |
| `bedrooms` / `bathrooms` | Número de habitaciones/baños |
| `size_sqft` | Superficie en sqft |
| `community` / `city` | Zona y ciudad |
| `latitude` / `longitude` | Coordenadas GPS |
| `features` | Lista de amenidades |
| `images` | URLs de imágenes |
| `agent_name` / `agent_phone` / `agent_email` | Contacto del agente |
| `broker_name` | Nombre de la agencia |
| `rera` | Número RERA |
| `is_off_plan` | True si es sobre plano |
| `completion_status` | Estado de entrega estimado |
| `added_on_pf` | Fecha de publicación original |

---

## Ejecución

```bash
# 1. Asegúrate de que Docker y la DB están corriendo
npm run db:up

# 2. Scrape completo (todas las propiedades, upsert en DB)
node tools/apify_propertyfinder.js

# 3. Scrape incremental (filtra duplicados contra DB, ahorra ~70% de escrituras)
node tools/apify_propertyfinder.js --incremental

# 4. Scrape con monitoring (Apify solo devuelve nuevas/modificadas, máximo ahorro)
node tools/apify_propertyfinder.js --monitoring

# 5. Combinado (recomendado para runs regulares)
node tools/apify_propertyfinder.js --monitoring --incremental
```

### Flags de optimización

| Flag | Ahorro | Descripción |
|------|--------|-------------|
| `--incremental` | DB writes | Consulta pf_ids existentes en DB, solo inserta nuevas y actualiza precios cambiados |
| `--monitoring` | Apify créditos | Activa `monitoringMode` en el actor Apify, que solo devuelve propiedades nuevas/modificadas desde el último run |
| Ambos combinados | Máximo | Apify trae menos + DB filtra las que ya tiene |

---

## Comportamiento ante errores

| Error | Acción |
|-------|--------|
| `APIFY_TOKEN no definido` | Detener. Pedir token al propietario del sistema |
| Run de Apify FAILED | Loguear el run ID, revisar en `console.apify.com` |
| Timeout > 10 min | Reducir `MAX_RESULTS` o aumentar `APIFY_THREADS` |
| Error de conexión a DB | Verificar que Docker está corriendo: `docker compose ps` |
| 0 resultados | Revisar que `SEARCH_URL` sea válida y tenga resultados en la web |

---

## Extensión a otras zonas/emiratos

Para añadir Abu Dhabi, Sharjah u otras zonas:
1. Filtrar en PropertyFinder con la zona deseada
2. Copiar la nueva URL
3. Crear un nuevo entry en el workflow o ejecutar el tool con la nueva `SEARCH_URL`

Los datos se acumulan en la misma tabla `properties` con `city` como discriminador.
