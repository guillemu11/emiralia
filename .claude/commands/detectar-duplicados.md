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

Read and execute the full instructions in `.claude/skills/data/detectar-duplicados/SKILL.md`.
