---
id: 48
status: In Progress
created: 2026-03-23
agents: [dev-agent]
---
# Fix: Image Generation en Producción

## Problema
La generación de imágenes funciona en local pero falla en producción (Railway). Dos causas raíz:

1. **`KIE_AI_API_KEY` no estaba en Railway** → `generate-image.js` lanza error antes de llamar a KIE AI.
2. **`tools/db/pool.js` no soporta `DATABASE_URL`** → Railway inyecta `DATABASE_URL` pero el shared pool solo lee `PG_*` vars individuales, causando que `trackGeneration()` falle y el asset vuelva a estado `draft`.

## Solución
- Añadir todas las env vars necesarias en Railway (KIE, ElevenLabs, Supabase completo)
- Actualizar `tools/db/pool.js` para soportar `DATABASE_URL` (mismo patrón que `server.js`)
- Añadir backend Supabase Storage a `storage-service.js` ✅ DONE

## Métricas de éxito
- Asset pasa de `generating` → `pending_review` en producción
- `generated_url` apunta a URL de Supabase Storage
- Logs de Railway muestran `[Nano Banana] ✓` y `[Storage:supabase] ✓`

## Fases y tareas

### Fase 1 — Storage (Supabase) ✅ DONE
- [x] Crear bucket `emiralia-assets` en Supabase
- [x] Añadir backend `supabase` a `storage-service.js`
- [x] Instalar `@supabase/supabase-js`
- [x] Configurar env vars Supabase en Railway

### Fase 2 — Fix pool.js
- [ ] Actualizar `tools/db/pool.js` para soportar `DATABASE_URL`
- [ ] Push + redeploy Railway
- [ ] Verificar generación end-to-end en producción