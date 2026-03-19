---
name: panicselling-scraper
description: >
  Extrae datos de price drops de propiedades de lujo en Dubai desde
  panicselling.xyz usando Apify Playwright Scraper. Detecta bajadas de precio,
  porcentaje de descuento y datos del listing original.
agent: Data Agent
context: fork
allowed-tools:
  - Bash
  - Read
  - Grep
tools:
  - tools/apify_panicselling.js
  - tools/db/init_db.js
inputs:
  - MAX_PAGES: Número de scrolls para cargar más listings (default 10)
outputs:
  type: table
  destination:
    category: database
    target: PostgreSQL > tabla `price_drops`
  write_mode: upsert
---

# Skill: PanicSelling.xyz Scraper

## Que hace este skill?

Extrae listings con bajadas de precio de propiedades de lujo en Dubai desde [panicselling.xyz](https://www.panicselling.xyz/dubai/) y los guarda en la tabla `price_drops` de PostgreSQL.

Usa el actor **`apify/playwright-scraper`** para renderizar la pagina JavaScript y extraer los datos del DOM.

---

## Cuando usar este skill

- Para monitorear descuentos en propiedades de lujo en Dubai (AED 4M+)
- Para detectar oportunidades de inversion con precio rebajado
- Como complemento a los datos de PropertyFinder (cross-referencia de price drops)
- Para analisis de tendencias de mercado (panic selling patterns)

---

## Datos extraidos

| Campo | Descripcion |
|-------|-------------|
| `source_id` | ID unico generado por hash |
| `source_url` | URL del listing original (PropertyFinder, Bayut, etc.) |
| `title` | Titulo del listing |
| `location` | Comunidad / area en Dubai |
| `property_type` | Apartment, Villa, Penthouse, etc. |
| `bedrooms` / `bathrooms` | Habitaciones y banos |
| `size_sqft` | Superficie en sqft |
| `original_price` | Precio antes de la bajada (AED) |
| `current_price` | Precio actual (AED) |
| `price_drop_aed` | Diferencia en AED |
| `price_drop_pct` | Porcentaje de descuento |
| `image_url` | Imagen principal |

---

## Ejecucion

```bash
# 1. Asegurate de que Docker y la DB estan corriendo
npm run db:up

# 2. Scrape completo (default: 10 scrolls)
node tools/apify_panicselling.js

# 3. Limitar scrolls (menos datos, mas rapido)
node tools/apify_panicselling.js --pages=5

# 4. Recuperar un run anterior
node tools/apify_panicselling.js <RUN_ID>
```

---

## Comportamiento ante errores

| Error | Accion |
|-------|--------|
| `APIFY_TOKEN no definido` | Configurar en `.env` |
| No se encontraron listings | La web cambio su estructura. Revisar `panicselling_page_dump.json` |
| Run FAILED | Revisar en `console.apify.com`. Puede ser anti-bot |
| Timeout > 15 min | Reducir `--pages` |

---

## Notas

- PanicSelling.xyz es un tracker independiente, no una fuente oficial
- Los datos se cruzan con PropertyFinder via `source_url` cuando apunta a pf.ae
- El scraper es adaptativo: si no encuentra cards, guarda el HTML completo para analisis manual
- Los precios son en AED y corresponden al segmento luxury (4M+)
