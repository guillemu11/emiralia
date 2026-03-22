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

Read and execute the full instructions in `.claude/skills/data/panicselling-scraper/SKILL.md`.
