---
name: generar-imagen
description: >
  Genera imágenes AI con DALL-E 3 para contenido inmobiliario: posts sociales,
  banners web, headers, creatividades de campañas. Invocar cuando pidan generar
  imagen, crear visual, diseño AI, banner, creatividad, ilustración, o /generar-imagen.
agent: Content Agent
disable-model-invocation: false
argument-hint: [descripción de imagen] [--size=square|landscape|portrait|wide] [--quality=standard|hd]
allowed-tools:
  - Bash
  - Read
tools:
  - tools/images/generate-image.js
  - tools/images/track-generation.js
  - tools/db/memory.js
inputs:
  - PROMPT: Descripción detallada de la imagen a generar
  - SIZE: Tamaño/formato (square|landscape|portrait|wide). Default: square
  - QUALITY: Calidad de generación (standard|hd). Default: standard
outputs:
  type: file
  destination:
    category: filesystem
    target: apps/website/public/generated/
  write_mode: create_new
---

Read and execute the full instructions in `.claude/skills/content/generar-imagen/SKILL.md`.
