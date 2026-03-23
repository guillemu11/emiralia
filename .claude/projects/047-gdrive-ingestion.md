---
id: 47
status: Planning
created: 2026-03-23
agents: [dev-agent, data-agent]
---
# Proyecto 047 — Google Drive Ingestion Pipeline

## Problema

El scraper de PropertyFinder se abandona. Los datos de propiedades ahora vienen directamente de los developers a través de Google Drive, organizados por developer y proyecto. No existe ningún pipeline para leer esos archivos, extraer la información estructurada y cargarla en la DB para que aparezca en la web.

## Solución

Pipeline de ingesta que recorre la estructura del Drive, extrae datos de los brochures (PDF) usando Claude claude-haiku, sube las fotos al storage y hace upsert en la tabla `properties` existente. Las propiedades aparecen automáticamente en la web con mapa, filtros y página de detalle — sin cambios en el frontend.

**Estructura del Drive:**
```
Emiralia DATA/
  DEVELOPERS/
    [Developer Name]/
      [Project Name]/          ← un proyecto = una propiedad en DB
        Brochure/   ← PDFs con datos del proyecto
        Floorplan/  ← Planos de planta
        Photos/     ← Fotos (se suben a storage)
        Video/      ← Vídeos
```

**Credenciales necesarias del usuario:**
1. `google-service-account.json` — JSON key de una Service Account de Google Cloud (Drive API habilitada)
2. Compartir `Emiralia DATA/` con el email de la service account (Viewer)
3. `GDRIVE_ROOT_FOLDER_ID` — ID de la carpeta raíz (de la URL del Drive)

## Métricas de éxito

- [ ] `node tools/gdrive/ingest-developer.js --dry-run` lista todos los proyectos del Drive sin errores
- [ ] Una ingesta real carga propiedades en la tabla con `data_source = 'developer'`
- [ ] Las propiedades aparecen en `/propiedades.html` con filtros funcionando
- [ ] Las propiedades con coordenadas aparecen en el mapa Leaflet
- [ ] Las fotos se sirven correctamente desde storage
- [ ] Re-ejecutar la ingesta no duplica propiedades (idempotente)

## Fases y tareas

### Fase 1: DB Migration
- [ ] Crear `tools/db/migration_gdrive_ingestion.sql`
- [ ] Añadir columnas a `properties`: `data_source`, `developer_id`, `gdrive_folder_id`, `brochure_url`, `floorplan_urls`, `video_urls`, `ingestion_run_id`, `ingested_at`
- [ ] Aplicar migración y verificar

### Fase 2: Google Drive Client
- [ ] Añadir dependencia `googleapis` a `package.json`
- [ ] Crear `tools/gdrive/gdrive-client.js` con: authenticate, listDeveloperFolders, listProjectFolders, listFilesInSubfolder, downloadFile
- [ ] Test de conexión básico

### Fase 3: PDF Extractor con Claude
- [ ] Añadir deps `pdf-parse` y `pdfjs-dist` a `package.json`
- [ ] Crear `tools/gdrive/extract-brochure.js`
  - Branch A: PDF con texto → Claude claude-haiku text mode
  - Branch B: PDF de imágenes → Claude claude-haiku vision mode
- [ ] Crear `tools/gdrive/community-coords.json` — lookup estático lat/lng para ~50 comunidades de Dubai/Abu Dhabi
- [ ] Test con un brochure real

### Fase 4: Orquestador principal
- [ ] Crear `tools/gdrive/ingest-developer.js`
  - Flags: `--developer "Emaar"`, `--dry-run`, `--force`
  - Flujo: Drive → extract → upload fotos → upsert properties
  - ID scheme: `dev:{developer_slug}:{drive_file_id}`
- [ ] Añadir scripts en `package.json`: `ingest:gdrive`, `ingest:gdrive:dry`

### Fase 5: API update
- [ ] Añadir `data_source` como filtro opcional en `apps/api/src/routes/properties.js` (buildWhereClause)
- [ ] Verificar que properties con `data_source = 'developer'` aparecen en listado, mapa y detalle

## Dependencias técnicas

**Env vars a añadir en `.env`:**
```bash
GDRIVE_KEY_FILE=./google-service-account.json
GDRIVE_ROOT_FOLDER_ID=<id_de_la_carpeta_raiz>
```

**Deps a añadir en `package.json`:**
```
googleapis@^144.0.0
pdf-parse@^1.1.1
pdfjs-dist@^4.0.0
```

**Archivos críticos a modificar:**
- `tools/db/schema.sql` — referencia para tipos de columnas
- `tools/apify_propertyfinder.js` — patrón de upsert a replicar
- `tools/storage/storage-service.js` — API upload a reutilizar
- `apps/api/src/routes/properties.js` — buildWhereClause a extender

## Post-MVP / Hoja de Ruta

- Sync incremental automático (cron diario via `tools/gdrive/gdrive-sync.js`)
- Dashboard widget para ver estado de ingesta por developer
- Geocoding automático via Google Maps API para comunidades no cubiertas en el lookup estático
- Soporte para múltiples brochures por proyecto (variantes de unidades)
- Extracción de precios por tipología (1BR, 2BR, 3BR) desde un mismo brochure
