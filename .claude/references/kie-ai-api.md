# KIE AI API — Reference

**Base URL:** `https://api.kie.ai/api/v1`
**Auth:** `Authorization: Bearer <KIE_AI_API_KEY>`
**Docs:** https://docs.kie.ai/

---

## Patrón Universal

Todos los modelos siguen el mismo patrón:

```
POST /jobs/createTask         → crea tarea, devuelve taskId
GET  /jobs/recordInfo?taskId  → polling hasta state=success
```

### createTask Request
```json
{
  "model": "<model-name>",
  "input": { ... parámetros del modelo ... }
}
```

### createTask Response
```json
{ "code": 200, "data": { "taskId": "abc123" } }
```
Si `code !== 200` → error en `msg`.

### Polling Response (recordInfo)
```json
{
  "code": 200,
  "data": {
    "taskId": "abc123",
    "state": "waiting|queuing|generating|success|fail",
    "resultJson": "{\"resultUrls\":[\"https://...\"], \"videoUrl\":\"https://...\"}",
    "failCode": null,
    "failMsg": null,
    "costTime": 12000,
    "completeTime": 1774267980000,
    "createTime": 1774267800000
  }
}
```

**Importante:** `resultJson` es un **JSON string** — hay que hacer `JSON.parse()`. Puede contener `resultUrls[]`, `videoUrl`, `video_url`, etc. según el modelo.

**Rate limit:** 20 requests/10s
**Media retention:** 14 días (descargar inmediatamente)
**Concurrent tasks:** 100+

---

## Modelos — Lipsync / Avatar Video

### `infinitalk/from-audio` ✅ (USADO EN PROYECTO)
- **Descripción:** Lip sync de alta calidad con expresiones faciales realistas (MeiGen-AI)
- **Max audio:** 15 segundos por generación
- **Input:**
  ```json
  {
    "image_url": "https://... (portrait, JPEG/PNG/WEBP, max 10MB)",
    "audio_url": "https://... (MP3/WAV/AAC/MP4/OGG, max 10MB, max 15s)",
    "prompt": "Natural professional lip sync, smooth animation",
    "resolution": "480p | 720p"
  }
  ```
- **Precio:** 3 créditos/seg (480p), 12 créditos/seg (720p)
- **Resultado:** `resultJson` contiene URL del video MP4

### `kling-avatar/standard`
- **Descripción:** Kling AI Avatar Standard — 720p
- **Max audio:** 15 segundos
- **Input:** igual que infinitalk + `prompt`
- **Precio:** 8 créditos/seg

### `kling-avatar/pro`
- **Descripción:** Kling AI Avatar Pro — 1080p
- **Input:** igual que infinitalk
- **Precio:** 16 créditos/seg

---

## Modelos — Image Generation

### `nano-banana-2` ✅ (USADO EN PROYECTO)
- **Descripción:** Nano Banana 2 (Google Gemini backend)
- **Input:**
  ```json
  {
    "prompt": "...",
    "aspect_ratio": "1:1 | 16:9 | 9:16",
    "resolution": "1K | 2K",
    "output_format": "jpg"
  }
  ```
- **Resultado:** `resultJson.resultUrls[0]` → URL de la imagen

### `flux-kontext-pro` / `flux-kontext-max`
- **Endpoint especial:** `POST /flux/kontext/generate`
- **Input:** `prompt`, `inputImage` (opcional para edición), `aspectRatio`, `outputFormat`
- **Uso:** Generación y edición de imágenes de alta calidad

---

## Modelos — Video Generation

### `kling-3.0/video`
- **Input:**
  ```json
  {
    "prompt": "...",
    "image_urls": ["https://..."],
    "duration": 3-15,
    "aspect_ratio": "16:9 | 9:16 | 1:1",
    "mode": "std | pro"
  }
  ```

### `wan/2-6-flash-image-to-video`
- **Input:**
  ```json
  {
    "prompt": "...",
    "image_urls": ["https://..."],
    "duration": "5 | 10 | 15",
    "resolution": "720p | 1080p"
  }
  ```

---

## Modelos — Audio

### ElevenLabs (vía KIE AI)
- `elevenlabs/text-to-speech-turbo-2-5`
- `elevenlabs/text-to-speech-multilingual-v2`
- `elevenlabs/text-to-speech-dialogue-v3`
- **Nota:** El proyecto usa ElevenLabs directamente (no vía KIE AI) para TTS

---

## Variables de Entorno del Proyecto

```env
KIE_AI_API_KEY=...                      # API key principal
KIE_LIPSYNC_MODEL=infinitalk/from-audio  # Modelo lipsync activo
```

---

## Troubleshooting Común

| Error | Causa | Solución |
|-------|-------|---------|
| `model not supported` | Nombre de modelo incorrecto | Verificar este documento |
| `task creation failed` | Payload incorrecto | Revisar parámetros requeridos del modelo |
| `fail` state en polling | KIE no pudo descargar `audio_url` | Asegurar que `audio_url` sea accesible públicamente |
| `No video URL found` | Formato de `resultJson` inesperado | Inspeccionar `resultJson` raw y ajustar parsing |
| 401 | API key inválida | Verificar `KIE_AI_API_KEY` en .env |
| 402 | Créditos insuficientes | Recargar cuenta en kie.ai |
| 429 | Rate limit | Esperar y reintentar |