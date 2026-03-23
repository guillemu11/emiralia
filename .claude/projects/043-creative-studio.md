---
id: 43
status: In Progress
created: 2026-03-23
agents:
  - social-media-agent
  - content-agent
  - marketing-agent
  - dev-agent
  - frontend-agent
---

# Creative Studio — Hub de Producción Nativo

## Problema

Emiralia depende de herramientas externas (Higgsfield, HeyGen) para generar fotos y videos con los avatares Fernando y Yolanda. Esto crea fricción operativa, costes adicionales y falta de control sobre el pipeline de producción de contenido.

## Solución

Construir un Creative Studio nativo dentro del dashboard de Emiralia que:

1. Sirva como hub de producción con **8 modos de contenido distintos**, cada uno con UI y brief propios
2. Use **KIE AI** para toda la generación: imágenes, videos, TTS, Lip Sync, edición
3. Tenga flujo de aprobación: Borrador → En Revisión → Aprobado → Programado
4. Integre un **calendario editorial semanal** donde los assets aprobados se asignan a slots
5. Permita a content-agent y marketing-agent generar y planificar contenido automáticamente

## Capacidades KIE AI Disponibles

| Categoría | Modelos |
|-----------|---------|
| **Video** | Text to Video, Image to Video, Video to Video, Video Editing, Speech to Video, **Lip Sync** |
| **Imagen** | Text to Image, Image to Image, Image Editing |
| **Audio** | Text to Speech, Speech to Text, Text to Music, Audio to Audio |
| **Chat** | Chat |

**Pipeline de avatar (Fernando/Yolanda):**
`Script` → `Text to Speech (KIE AI)` → `Lip Sync (KIE AI)` → Video final

**ElevenLabs: ACTIVO como TTS** — Fernando `cjVigY5qzO86Huf0OWal` · Yolanda `XrExE9yKIg1WjnnlVkGX` vía modelo `eleven_multilingual_v2`.

## Métricas de Éxito

- Eliminar dependencia de Higgsfield y HeyGen
- Tiempo de producción < 10 minutos desde brief hasta asset generado
- Calendario editorial auto-poblado semanalmente por agentes
- 8 tipos de contenido operativos con UI propia
- Pipeline TTS + Lip Sync funcional para avatares Fernando y Yolanda
- Workflow semanal automatizado: 0 intervención humana hasta revisión

## Arquitectura WAT

### Principio: los agentes piensan, los tools ejecutan, el workflow orquesta

```
Manual (humano desde UI)      Automático (agentes)
         ↓                           ↓
     Brief JSONB               Brief JSONB
         ↓                           ↓
         └──── POST /api/creative/generate/* ────┘
                         ↓
               tools/images/generate-*.js
               (KIE AI: TTS, LipSync, Video, Image)
                         ↓
             creative_assets → status='pending_review'
                         ↓
                   Humano aprueba en UI
                         ↓
                  Editorial Calendar
                         ↓
              social-media-agent publica
```

**Regla:** No se crea ningún agente nuevo. Las skills nuevas van en agentes existentes.

### Capas WAT

| Capa | Qué hace | Ejemplos |
|------|----------|---------|
| **Tools** | Llamadas KIE AI (deterministas, sin inteligencia) | `generate-tts.js`, `generate-lipsync.js`, `generate-video.js` |
| **Skills** | Generan briefs creativos con inteligencia contextual | `/generar-contenido-semana`, `/brief-avatar-video`, `/brief-podcast` |
| **Workflow** | Orquesta el ciclo semanal end-to-end | `editorial-weekly.md` |
| **UI** | Interfaz manual al mismo pipeline | Creative Studio en `/creative-studio` |

### Skills nuevas por agente existente

| Agente | Skill | Qué genera |
|--------|-------|------------|
| `content-agent` | `/generar-contenido-semana` | 5-7 briefs JSONB mixtos → inserta en `creative_assets` con `status='draft'` |
| `content-agent` | `/brief-property-tour` | Brief completo de tour dado un `property_id` |
| `content-agent` | `/brief-carousel` | Brief de carrusel con slides basadas en datos de mercado |
| `content-agent` | `/brief-infographic` | Brief de infografía con datos de DB o market data |
| `social-media-agent` | `/brief-avatar-video` | Brief texto-a-video con guion, tono, escena (extiende `/guionizar`) |
| `social-media-agent` | `/brief-podcast` | Brief de podcast con topic, talking points, hosts |
| `marketing-agent` | `/planificar-semana-editorial` | Lee assets `approved` → asigna a slots del calendario según mix strategy |

### Workflow nuevo: `editorial-weekly.md`

```
Trigger: Lunes 9am (scheduled) o /planificar-semana manual

Paso 1 — Generación de briefs
  content-agent → /generar-contenido-semana
  Output: 5-7 creative_assets con status='draft' en DB

Paso 2 — Generación automática de assets
  server → auto-trigger /api/creative/generate/* por cada draft
  Pipeline por tipo:
    imagen      → generate-image.js (KIE AI Text to Image)
    avatar vid  → generate-tts.js → generate-lipsync.js
    carousel    → generate-image.js × N slides
    infographic → generate-image.js con prompt estructurado
  Output: creative_assets con status='pending_review'

Paso 3 — Revisión humana
  inbox_items notification → humano abre Creative Studio UI
  Humano aprueba / rechaza cada asset
  Output: assets con status='approved'

Paso 4 — Planificación editorial
  marketing-agent → /planificar-semana-editorial
  Lee assets approved no schedulados
  Asigna a slots del calendario (mix: no 2 tours el mismo día)
  Output: editorial_calendar rows creados

Paso 5 — Publicación
  social-media-agent ejecuta según schedule del calendario
  Output: posts publicados en Instagram, TikTok, LinkedIn
```

### UI: Creative Studio en `/creative-studio`

**Ruta:** `/creative-studio` (página standalone, patrón IntelligenceHub)

**Layout — 3 paneles:**
- **Izquierda (240px):** `CreativeTypeSidebar` — 8 tarjetas de tipo con icono + descripción
- **Centro/Derecha:** `BriefForm` dinámico — cambia según tipo seleccionado
- **Bottom/Tab:** `AssetGallery` + `EditorialCalendar`

**Backend:** `apps/dashboard/routes/creative.js` (Express Router importado en server.js)

## Nuevas Tablas DB

### `creative_assets`

```sql
CREATE TABLE creative_assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type              VARCHAR(30) NOT NULL CHECK (type IN (
                      'image','text_to_video','image_to_video',
                      'multiframe','podcast','property_tour',
                      'carousel','infographic')),
  status            VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
                      'draft','generating','pending_review',
                      'approved','rejected','scheduled','published')),
  title             VARCHAR(500),
  brief             JSONB DEFAULT '{}',
  output_config     JSONB DEFAULT '{}',
  generated_url     TEXT,
  thumbnail_url     TEXT,
  generation_job_id VARCHAR(255),
  generation_error  TEXT,
  scheduled_at      TIMESTAMPTZ,
  agent_id          VARCHAR(50) REFERENCES agents(id),
  created_by        VARCHAR(100) DEFAULT 'human',
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### `editorial_calendar`

```sql
CREATE TABLE editorial_calendar (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date  DATE NOT NULL,
  week_start DATE NOT NULL,
  platform   VARCHAR(20) NOT NULL CHECK (platform IN ('instagram','tiktok','linkedin','youtube')),
  asset_id   UUID REFERENCES creative_assets(id) ON DELETE SET NULL,
  status     VARCHAR(20) DEFAULT 'empty' CHECK (status IN ('empty','scheduled','published','skipped')),
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Los 8 Tipos de Contenido y sus Briefs

### 1. Imagen (`image`)

**Brief inputs:**
- `prompt*` — descripción de la imagen
- `avatar` — Fernando / Yolanda / Ninguno
- `style*` — Realistic / Illustrated / Cinematic / Minimal
- `text_overlay` — (opcional) texto sobre la imagen
- `brand_elements[]` — Logo / Watermark / Tagline

**Output config:**
- `format*` — Square 1:1 / Portrait 9:16 / Landscape 16:9
- `quality*` — Standard ($0.04) / HD ($0.06)

**Generación:** KIE AI Text to Image (via `tools/images/generate-image.js` existente)

---

### 2. Video Texto-a-Video (`text_to_video`)

**Brief inputs:**
- `script*` — guion completo (con contador de palabras + estimador de duración)
- `avatar*` — Fernando / Yolanda (obligatorio)
- `tone` — Informativo / Aspiracional / Urgente / Educativo
- `scene` — texto libre (ej. "oficina moderna con skyline de Dubai")
- `subtitles` — boolean
- `voice_speed` — 0.8x / 1x / 1.2x

**Output config:**
- `format*` — 9:16 (TikTok/Reels) / 16:9 (YouTube/LinkedIn) / 1:1
- `duration*` — 15s / 30s / 60s
- `quality` — 720p / 1080p

**Pipeline KIE AI:**
1. `Text to Speech` — script → audio (.mp3)
2. `Lip Sync` — audio + imagen del avatar → video sincronizado

---

### 3. Video Imagen-a-Video (`image_to_video`)

**Brief inputs:**
- `source_image_url*` — upload o selección desde galería de assets aprobados
- `motion_description*` — descripción del movimiento deseado
- `camera_movement` — Pan / Zoom In / Zoom Out / Orbit / Static

**Output config:**
- `format*` — 9:16 / 16:9 / 1:1
- `duration*` — 5s / 10s / 15s

**Generación:** KIE AI Image to Video

---

### 4. Video Multi-Frame (`multiframe`)

**Brief inputs:**
- `frames*[]` — hasta 6 frames: `{ image_url, caption, duration_s }`
- `transition_style` — Fade / Cut / Wipe / Morph

**Output config:**
- `format*` — 9:16 / 16:9
- `duration` — calculado (suma de frame durations)

**Generación:** KIE AI Video to Video + Video Editing para transiciones

---

### 5. Video Podcast (`podcast`)

**Brief inputs:**
- `hosts*` — Fernando solo / Yolanda solo / Ambos
- `topic*` — tema del episodio
- `talking_points[]` — puntos clave (uno por línea)
- `background_scene` — Studio Minimal / Dubai Skyline / Office / Coworking
- `voice_style` — Natural / Energético / Profesional

**Output config:**
- `format*` — 16:9 / 1:1
- `duration*` — 60s / 2min / 5min

**Pipeline KIE AI:**
1. `Text to Speech` — talking_points → audio por host
2. `Lip Sync` — audio + imagen del avatar → segmento de video
3. Si `hosts='both'`: dos segmentos alternados con `Video Editing`

---

### 6. Video Tour Propiedad (`property_tour`)

**Brief inputs:**
- Modo A (default): Picker de propiedad de DB (búsqueda + mini-card) — auto-popula datos
- Modo B: Entrada manual (título, precio AED, comunidad, habitaciones, m², ROI, images[])
- `host*` — Fernando / Yolanda / Auto
- `data_overlays[]` — Precio / ROI / m² / Ubicación / Developer

**Output config:**
- `format*` — 9:16 / 16:9
- `duration*` — 30s / 60s / 2min

**Pipeline KIE AI:**
1. `Text to Speech` — guion con datos de la propiedad → audio del host
2. `Lip Sync` — audio + imagen del avatar → segmento del host
3. `Video Editing` — combinar avatar + imágenes de la propiedad + data overlays

---

### 7. Carrusel (`carousel`)

**Brief inputs:**
- `slides*[]` — 3 a 10 slides: `{ image_url, title, text }`
- `style_template` — Emiralia Branded / Minimalista / Dark Premium / Stats Only
- `cta_slide` — (opcional) `{ text, link }`

**Output config:**
- `format*` — 1:1 (Instagram) / 4:5
- `quality` — Standard / HD

**Generación:** Una imagen por slide via KIE AI Text to Image (secuencial). Estimación de coste mostrada antes de generar.

---

### 8. Infografía (`infographic`)

**Brief inputs:**
- `infographic_type*` — Data / Comparison / Timeline / Process
- `data_source` — Manual / From DB / Market Data
- `data*[]` — `{ label, value }` (builder dinámico)
- `color_scheme` — Primary Blue / Dark Premium / Light Neutral
- `sections[]` — Header / Datos / Footer / CTA

**Output config:**
- `format*` — Portrait A4 / Square / Landscape

**Generación:** KIE AI Text to Image con prompt estructurado de datos

## Brief Validation Schema

```js
{
  image:         { required: ['prompt', 'style'] },
  text_to_video: { required: ['script', 'avatar'] },
  image_to_video:{ required: ['source_image_url', 'motion_description'] },
  multiframe:    { required: ['frames'], minFrames: 2, maxFrames: 6 },
  podcast:       { required: ['hosts', 'topic'] },
  property_tour: { required: ['host'], oneOf: [['property_id'], ['property_data.title']] },
  carousel:      { required: ['slides'], minSlides: 3, maxSlides: 10 },
  infographic:   { required: ['infographic_type', 'data'], minDataPoints: 1 }
}
```

## Fases y Tareas

### UI v2 — Rediseño Layout Conversacional ✅ DONE

**Archivos:** `CreativeStudio.jsx` (refactor completo), `CreativeTypeTopNav.jsx`, `AIBriefInput.jsx`, clases CSS `cs2-*`

**Verificación:** Tipos en tab horizontal scrollable · Left panel = parámetros del tipo activo · Right panel = preview/output · "Inspirar con IA" collapsible con suggest-brief vía Claude API · Tabs secundarios (Galería/Calendario/Avatares) en header derecha.

---

### Fase 1 — DB + API Shell + UI Navegable ✅ DONE

**Verificación:** API `/api/creative/config` y `/api/creative/assets` retornan 200. Tablas `creative_assets` + `editorial_calendar` en DB. Ruta `/creative-studio` navegable con 8 tipos en sidebar.

---

### Fase 2 — Modo Imagen (end-to-end funcional) ✅ DONE

**Archivos:** `ImageBriefForm.jsx`, `GenerationProgress.jsx`, `CreativeAssetCard.jsx`, `CreativePreviewModal.jsx`, `POST /api/creative/generate/image`

**Verificación:** Ir a `/creative-studio` → seleccionar "Imagen" → rellenar prompt + style → "Generar imagen" → spinner con elapsed → imagen aparece en galería como `pending_review` → Aprobar/Rechazar desde preview modal.

---

### Fase 3 — Video Standard + Pipeline KIE AI TTS/LipSync ✅ DONE

**Archivos:** `generate-tts.js`, `generate-lipsync.js`, `generate-video.js`, `generate-video-service.js`, `POST /generate/video` en router, `TextToVideoBriefForm.jsx`, `ImageToVideoBriefForm.jsx`, `MultiframeBriefForm.jsx`, `CreativeStudio.jsx` actualizado

**Verificación:** Servidor responde en `:3001/api/creative/config`. Ir a `/creative-studio` → seleccionar "Video Avatar" → rellenar script + avatar → "Generar" → spinner TTS → Lip Sync → video en galería como `pending_review`. Polling extendido a 15 min.

---

### Fase 4 — Video Especializado (Podcast + Property Tour) ✅ DONE

**Agentes:** dev-agent, frontend-agent | **Prioridad:** High

| Task | Descripción | Agente | T |
|------|-------------|--------|---|
| 4.1 | Crear `PodcastBriefForm.jsx`: host cards (3 opciones con avatares), topic, talking points builder, background selector, voice_style, format, duration | frontend-agent | M |
| 4.2 | Crear `PropertyTourBriefForm.jsx`: toggle Modo DB / Modo Manual, DB picker con search (`GET /api/properties?search=&limit=24`) + mini property cards + auto-populate, host selector, data overlays checkboxes, format, duration | frontend-agent | L |
| 4.3 | Pipeline Property Tour en router: cuando `type='property_tour'` con `property_id`, `SELECT * FROM properties WHERE pf_id=$1`, inyectar datos en prompt TTS + overlay spec | dev-agent | M |
| 4.4 | Pipeline Podcast: si `hosts='both'`, generar dos segmentos TTS+LipSync, combinar con KIE AI Video Editing | dev-agent | M |
| 4.5 | `GET /api/creative/config`: retorna `{ kie_tts_enabled: true, fernando_voice_id, yolanda_voice_id, video_enabled: true }` | dev-agent | S |

**Verificación:** Seleccionar propiedad del picker → campos auto-rellenados → generar tour. Podcast con ambos hosts genera video compuesto.

---

### Fase 5 — Carrusel e Infografía (3 días)

**Agentes:** dev-agent, frontend-agent | **Prioridad:** Medium

| Task | Descripción | Agente | T |
|------|-------------|--------|---|
| 5.1 | Crear `CarouselBriefForm.jsx`: number input (3-10), slide builder con image picker + title + text + up/down reorder, style template selector, CTA slide toggle, format | frontend-agent | L |
| 5.2 | Añadir `POST /api/creative/generate/carousel` al router: crea asset padre con `status='generating'`, itera slides con `generateImageService` secuencialmente, actualiza `brief.slides[i].generated_url`, final → `draft` | dev-agent | M |
| 5.3 | Progress de carrusel: mostrar "Slide X/N completada" durante generación | frontend-agent | S |
| 5.4 | Preview de carrusel en `CreativePreviewModal.jsx`: slides deslizables | frontend-agent | M |
| 5.5 | Crear `InfographicBriefForm.jsx`: type selector (4 iconos), data source toggle, data builder (label+value rows), color scheme, sections, format | frontend-agent | M |
| 5.6 | Estimación de coste para carrusel: "N slides × $0.04 = $X" antes de generar | frontend-agent | XS |

**Verificación:** Carrusel de 5 slides se genera slide por slide, preview deslizable. Infografía genera imagen con datos estructurados.

---

### Fase 6 — Editorial Calendar + Approval Workflow (3 días)

**Agentes:** dev-agent, frontend-agent | **Prioridad:** High

| Task | Descripción | Agente | T |
|------|-------------|--------|---|
| 6.1 | Extraer helpers de `SocialWorkspace.jsx` a `src/utils/calendarHelpers.js`: `getWeekStart`, `getWeekDays`, `toISODate`, `formatDayLabel`, `isToday` | frontend-agent | S |
| 6.2 | Crear `EditorialCalendar.jsx`: grid semanal 7 cols × 4 platforms, navegación semanas, slots con thumbnail o dashed "+ Asignar" | frontend-agent | L |
| 6.3 | Crear `SlotPickerModal.jsx`: assets `status='approved'` no schedulados, filtrados por formato compatible con la plataforma | frontend-agent | M |
| 6.4 | `POST /api/creative/calendar/slots`: crear slot, set `scheduled_at` en el asset | dev-agent | S |
| 6.5 | `GET /api/creative/calendar?week_start=YYYY-MM-DD`: 7 días × 4 platforms con JOIN de asset data | dev-agent | S |
| 6.6 | Cuando `status → pending_review`: insertar en `inbox_items` con `to_agent='social-media-agent'` (mismo patrón que artifact handoffs en `server.js:2789`) | dev-agent | M |
| 6.7 | Botón "Enviar a Calendario" en preview modal y asset card: solo visible en `status='approved'` | frontend-agent | S |

**Verificación:** Generar imagen → aprobar → "Enviar a Calendario" → seleccionar slot → asset visible en grid semanal. Social media agent recibe notificación en inbox.

---

### Fase 7 — Skills de Agentes + Workflow Semanal Automatizado (4 días)

**Agentes:** content-agent, marketing-agent, dev-agent, frontend-agent | **Prioridad:** High

#### 7A — Skills en agentes existentes

| Task | Descripción | Agente | T |
|------|-------------|--------|---|
| 7.1 | Skill `/generar-contenido-semana` en content-agent: lee top communities + listings recientes de DB, lee memoria `last_topics_covered`, genera 5-7 briefs JSONB mixtos (mix de tipos), inserta en `creative_assets` con `status='draft'`, escribe memoria `last_brief_batch_at` | content-agent | M |
| 7.2 | Skill `/brief-property-tour` en content-agent: dado `property_id`, genera brief completo con guion del host + data_overlays + format recomendado | content-agent | M |
| 7.3 | Skill `/brief-avatar-video` en social-media-agent: extiende `/guionizar` → genera brief completo `text_to_video` con avatar, tono, escena, voice_speed, subtítulos | social-media-agent | M |
| 7.4 | Skill `/brief-podcast` en social-media-agent: dado un topic, genera brief de podcast con hosts óptimos, talking points, background_scene | social-media-agent | S |
| 7.5 | Skill `/planificar-semana-editorial` en marketing-agent: lee assets `approved` no schedulados, obtiene calendar semana, asigna según mix strategy (no 2 mismos tipos consecutivos), bulk-crea `editorial_calendar` rows | marketing-agent | M |
| 7.6 | Configurar voice IDs Fernando/Yolanda en KIE AI TTS. Exponer en `GET /api/creative/config`. BriefForms muestran selector de velocidad y estilo | dev-agent | S |
| 7.7 | Documentar nuevas skills y memory keys en `content-agent.md`, `social-media-agent.md` y `marketing-agent.md` | dev-agent | S |

#### 7B — Auto-completar brief desde UI

| Task | Descripción | Agente | T |
|------|-------------|--------|---|
| 7.8 | Añadir `POST /api/creative/suggest-brief` al router: recibe `{ type, context }`, llama Claude API (patrón `server.js:551`), retorna brief JSONB sugerido | dev-agent | M |
| 7.9 | Botón "Auto-completar brief (IA)" en cada BriefForm: llama endpoint, pre-rellena campos, usuario puede editar | frontend-agent | M |

#### 7C — Workflow editorial-weekly.md

| Task | Descripción | Agente | T |
|------|-------------|--------|---|
| 7.10 | Crear `.claude/workflows/editorial-weekly.md`: SOP con 5 pasos (ver sección Arquitectura WAT), trigger semanal, agentes, inputs/outputs, edge cases | dev-agent | S |
| 7.11 | Auto-trigger generación: cuando `creative_assets` se inserta con `status='draft'` por un agente, el server lanza automáticamente `/api/creative/generate/*` para cada asset (via DB trigger o POST hook) | dev-agent | M |

**Verificación:** `/generar-contenido-semana` crea 5+ briefs → se generan automáticamente → aparecen en `pending_review` → humano aprueba → `/planificar-semana-editorial` llena el calendario. Workflow completo end-to-end sin intervención manual hasta aprobación.

## Archivos a Crear

```
tools/db/migration_creative_studio.sql
tools/images/generate-video.js
tools/images/generate-tts.js
tools/images/generate-lipsync.js
tools/images/generate-video-service.js
apps/dashboard/routes/creative.js
apps/dashboard/src/pages/CreativeStudio.jsx
apps/dashboard/src/utils/calendarHelpers.js
apps/dashboard/src/components/workspace/creativeConstants.js
apps/dashboard/src/components/workspace/creative/
  CreativeTypeSidebar.jsx
  AssetGallery.jsx
  CreativeAssetCard.jsx
  CreativePreviewModal.jsx
  GenerationProgress.jsx
  SlotPickerModal.jsx
  EditorialCalendar.jsx
  ImageBriefForm.jsx
  TextToVideoBriefForm.jsx
  ImageToVideoBriefForm.jsx
  MultiframeBriefForm.jsx
  PodcastBriefForm.jsx
  PropertyTourBriefForm.jsx
  CarouselBriefForm.jsx
  InfographicBriefForm.jsx
```

## Archivos a Modificar

```
apps/dashboard/server.js          — importar creative router
apps/dashboard/src/main.jsx       — añadir ruta /creative-studio
apps/dashboard/src/components/Layout.jsx — añadir nav item
```

## Post-MVP / Hoja de Ruta

- **Fase Futura 1 — Music y Audio:** Usar KIE AI Text to Music para background music en videos. Audio to Audio para post-procesado de voz.
- **Fase Futura 2 — Video Editing avanzado:** UI para recortar, añadir subtítulos automáticos (Speech to Text de KIE AI), añadir música de fondo.
- **Fase Futura 3 — White-label para developers:** Developers partners usan el Creative Studio para generar su propio contenido de marketing sobre sus propiedades como servicio premium B2B.
- **Fase Futura 4 — IA editorial avanzada:** content-agent sugiere temas basándose en performance de posts anteriores. A/B testing automático de guiones.
