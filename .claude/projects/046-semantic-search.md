---
id: 46
status: Planning
created: 2026-03-23
agents: [dev-agent, data-agent]
---
# Proyecto 046 — Semantic Search (Pinecone + Gemini Embeddings)

## Problema

La búsqueda actual de propiedades usa `ILIKE '%query%'` en PostgreSQL — solo encuentra coincidencias exactas de palabras. Si un usuario escribe "apartamento tranquilo cerca del agua" no encontrará nada porque ninguna propiedad tiene esas palabras exactas en sus campos.

## Solución

Añadir una capa de **búsqueda semántica** que convierta propiedades y búsquedas en vectores numéricos (embeddings) que capturan el *significado*, y buscar por similitud vectorial. Pinecone y PostgreSQL coexisten:

```
PostgreSQL  → metadatos y filtros exactos (precio, habitaciones, ciudad)
Cloudflare R2 → archivos (imágenes, vídeos)
Pinecone    → búsqueda semántica (nuevo)
```

**No reemplaza nada del stack actual.** Es una capa adicional que mejora la experiencia del usuario con lenguaje natural.

## Métricas de éxito

- [ ] Usuario puede buscar con frases naturales ("piso moderno vista al mar") y obtener resultados relevantes
- [ ] Endpoint `/api/properties/semantic` retorna en < 500ms
- [ ] `semantic: true` en respuesta cuando usa Pinecone, `semantic: false` cuando usa SQL fallback
- [ ] Con Pinecone caído: degradación silenciosa vía SQL ILIKE funciona

## Fases y tareas

### Fase 1: Pipeline de indexación (embedding batch)
- [ ] Crear `tools/embeddings/embed-properties.js`
- [ ] Leer propiedades de PostgreSQL en batches de 100
- [ ] Generar embeddings con Gemini `text-embedding-004` (768 dims)
- [ ] Subir a Pinecone index `emiralia-properties` con metadata
- [ ] Tracking incremental via `embedding_indexed_at`

### Fase 2: Migración DB
- [ ] Crear `tools/db/migration_embeddings.sql`
- [ ] Añadir columna `embedding_indexed_at TIMESTAMPTZ` a tabla `properties`
- [ ] Crear índice parcial para propiedades no indexadas

### Fase 3: Endpoint de búsqueda semántica
- [ ] Añadir `GET /api/properties/semantic` en `apps/api/src/routes/properties.js`
- [ ] Generar embedding del query con Gemini
- [ ] Buscar top-50 en Pinecone
- [ ] Fetch completo desde PostgreSQL con filtros adicionales
- [ ] Fallback automático a SQL ILIKE si Pinecone falla

### Fase 4: UI
- [ ] Conectar `apps/website/src/propiedades.js` al endpoint semántico
- [ ] Activar para queries > 3 palabras o botón "Búsqueda Inteligente"

## Dependencias y configuración

**Env vars a añadir en `.env`:**
```bash
GEMINI_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX_NAME=emiralia-properties
PINECONE_ENVIRONMENT=
```

**Dependencias a añadir en `package.json` (root):**
```
@google/generative-ai
@pinecone-database/pinecone
```

## Post-MVP / Hoja de Ruta

- Búsqueda multilingüe (embeddings en árabe/inglés para propiedades con descripción original)
- Re-ranking por popularidad o precio tras recuperación semántica
- Sugerencias de búsqueda basadas en embeddings similares
- Analytics de queries semánticos vs exactos para medir adopción