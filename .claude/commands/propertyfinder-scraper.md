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

Read and execute the full instructions in `.claude/skills/data/propertyfinder-scraper/SKILL.md`.
