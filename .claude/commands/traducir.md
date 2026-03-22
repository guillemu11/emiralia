---
name: traducir
description: >
  Traduce contenido inmobiliario de EAU entre ingles y espanol con variantes
  regionales: Espana (es-ES), Mexico (es-MX) y Colombia (es-CO). Usa
  terminologia inmobiliaria precisa y adaptada por region. Tambien soporta
  traduccion inversa espanol → ingles. Invocar cuando pidan traducir, translate,
  version en espanol de, adaptar al espanol, o /traducir.
agent: Translation Agent
allowed-tools:
  - Read
  - Edit
  - Bash
  - Grep
tools:
  - tools/translate/translate.js
  - tools/translate/glossary.js
  - tools/db/memory.js
  - tools/db/wat-memory.js
inputs:
  - TEXT: Texto en ingles (o espanol) a traducir
  - TO: Variante destino (es-ES | es-MX | es-CO | en). Default es-ES
  - FROM: Idioma origen (en | es). Default en
  - MODE: property (precision inmobiliaria) | general. Default property
outputs:
  type: document
  destination:
    category: local
    target: consola / archivo
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/content/traducir/SKILL.md`.
