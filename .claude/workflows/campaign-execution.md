# Workflow: Campaign Execution

**ID:** campaign-execution
**Versión:** 1.0
**Actualizado:** 2026-03-23
**Status:** Activo

---

## Objetivo

Orquestación end-to-end de una campaña de marketing multi-canal: desde el brief inicial hasta la publicación de todos los assets. Coordina hasta 5 agentes en paralelo para producir blog posts, imágenes, vídeos, paid ads y emails bajo un mismo objetivo, presupuesto y calendario.

---

## Agentes involucrados

| Agente | Rol en el workflow |
|--------|--------------------|
| `marketing-agent` | Orchestrator: crea campaign + campaign_items, define objetivo y audiencia, cierra el ciclo con `/revisar-campana` |
| `content-agent` | Blog posts (`/generar-blog-post`) + email campaigns (`/brief-email-campaign`) |
| `seo-agent` | Optimiza blog posts post-generación antes de aprobar |
| `social-media-agent` | Imágenes orgánicas (`/brief-social-image`) + vídeos avatar pagados (`/brief-paid-avatar-video`) |
| `paid-media-agent` | Briefs de Meta Ads, Google Ads, TikTok Ads |

---

## Inputs requeridos

```
- title: Nombre de la campaña
- goal: Objetivo (awareness / leads / ventas / engagement / lanzamiento)
- target_audience: Descripción de la audiencia objetivo
- channels: Lista de canales (blog / instagram / tiktok / meta_ads / google_ads / tiktok_ads / email / linkedin)
- budget_total: Presupuesto total en USD (opcional)
- start_date / end_date: Fechas de la campaña
- currency: USD (default)
```

---

## Pasos del Workflow

### Paso 1 — Campaign Brief (marketing-agent)

**Trigger:** Humano desde dashboard (/campaign-manager → Nueva Campaña) o marketing-agent vía `/crear-campana`

**Acciones:**
1. `POST /api/campaigns` con title, goal, target_audience, channels, budget_total, start_date, end_date
2. Para cada canal en channels: `POST /api/campaigns/:id/items` con CHANNEL_DEFAULTS:
   ```
   blog       → content_type: blog_post        → assigned_agent: content-agent
   instagram  → content_type: social_image     → assigned_agent: social-media-agent
   tiktok     → content_type: avatar_video     → assigned_agent: social-media-agent
   linkedin   → content_type: social_image     → assigned_agent: content-agent
   meta_ads   → content_type: paid_ad_image    → assigned_agent: paid-media-agent
   google_ads → content_type: paid_ad_image    → assigned_agent: paid-media-agent
   tiktok_ads → content_type: paid_ad_video    → assigned_agent: paid-media-agent
   email      → content_type: email_campaign   → assigned_agent: content-agent
   ```
3. `PATCH /api/campaigns/:id` → status: `briefing`
4. Guardar en memoria: `node tools/db/memory.js set marketing-agent active_campaigns '{"id":"...","title":"...","status":"briefing"}' shared`

**Checkpoint:** Humano confirma estructura de items en Campaign Manager UI antes de producir.

---

### Paso 2 — Producción Paralela por Canal

**Trigger:** Humano hace clic en "Iniciar Producción" en UI, o marketing-agent ejecuta producción automática.

Los canales se producen en paralelo. Cada agente actualiza el `campaign_item` correspondiente al finalizar.

#### Blog (`content-agent`)
```
/generar-blog-post topic="<campaign goal>" keywords=[...] campaign_item_id=<id>
→ save_artifact: type=blog_draft
→ PATCH /api/campaigns/items/:id status=producing
→ handoff: seo-agent /optimizar-seo artifact_id=<id>
→ PATCH /api/campaigns/items/:id status=pending_review
→ POST /api/campaigns/items/:id/submit-review → inbox_items entry para content-agent
```

#### Instagram / LinkedIn (`social-media-agent`)
```
/brief-social-image topic=<campaign goal> channel=instagram campaign_item_id=<id>
→ save_artifact: type=creative_brief
→ PATCH /api/campaigns/items/:id status=producing
→ [Creative Studio genera imagen si disponible, sino: artifact brief]
→ PATCH /api/campaigns/items/:id status=pending_review
→ POST /api/campaigns/items/:id/submit-review
```

#### TikTok orgánico (`social-media-agent`)
```
/brief-avatar topic=<campaign goal> campaign_item_id=<id>
→ save_artifact: type=video_brief
→ PATCH /api/campaigns/items/:id status=producing
→ [HeyGen + KIE AI producen vídeo]
→ PATCH /api/campaigns/items/:id status=pending_review
→ POST /api/campaigns/items/:id/submit-review
```

#### Meta Ads / Google Ads / TikTok Ads (`paid-media-agent`)
```
/brief-meta-ad | /brief-google-ad | /brief-tiktok-ad campaign_item_id=<id>
→ PATCH /api/campaigns/items/:id ad_brief={...} ad_platform=<platform>
→ PATCH /api/campaigns/items/:id status=pending_review
→ POST /api/campaigns/items/:id/submit-review
```

#### Email (`content-agent`)
```
/brief-email-campaign campaign_id=<id> goal=<goal> audience=<audience>
→ save_artifact: type=email_template
→ PATCH /api/campaigns/items/:id artifact_id=<id> status=pending_review
→ POST /api/campaigns/items/:id/submit-review
```

---

### Paso 3 — Human Review Loop

**Trigger:** Humano abre Campaign Detail → ve items en `pending_review`

**Para cada item:**
- ✅ **Aprobar** → `POST /api/campaigns/items/:id/approve` → status: `approved`
- ❌ **Rechazar** → `POST /api/campaigns/items/:id/reject` con `rejection_reason` → status: `rejected`
  - Agente asignado re-produce (vuelve al Paso 2 para ese item)

**Criterio de avance:** Todos los items aprobados o al menos los items de canales orgánicos aprobados.

---

### Paso 4 — Scheduling

**Orgánico (blog / social / email):**
```
marketing-agent /planificar-semana-editorial
→ PATCH /api/campaigns/items/:id scheduled_at=<datetime>
→ status: scheduled
```

**Paid (meta_ads / google_ads / tiktok_ads):**
- Humano descarga el `ad_brief` desde Campaign Detail
- Humano sube manualmente a la plataforma (Meta Business Manager / Google Ads / TikTok Ads Manager)
- Humano actualiza status a `scheduled` cuando la campaña pagada está configurada

---

### Paso 5 — Campaña Activa

```
PATCH /api/campaigns/:id status=active
→ marketing-agent: node tools/db/memory.js set marketing-agent active_campaigns '{"id":"...","status":"active"}' shared
```

---

### Paso 6 — Publicación

Cada item publicado:
```
PATCH /api/campaigns/items/:id status=published published_at=<now>
```

Cuando todos los items principales están `published`:
```
PATCH /api/campaigns/:id status=completed
```

---

### Paso 7 — Cierre y Reporte

```
paid-media-agent /reporte-paid-media campaign_id=<id>
marketing-agent /revisar-campana campaign_id=<id>
→ Guardar resumen en memoria: marketing-agent last_campaign_at, content-agent last_task_at
```

---

## Estados del Pipeline

```
campaigns.status:
planning → briefing → producing → reviewing → active → paused → completed

campaign_items.status:
pending → briefing → producing → pending_review → approved → scheduled → published
                                                           ↘ rejected → (re-produce)
```

---

## Integración con Creative Studio (P043)

**Stage A (antes de P043 activo):**
- Items social_image/avatar_video crean artifacts con metadata
- `creative_asset_id = null`
- Campaign Manager funciona completamente

**Stage B (post-P043):**
- `creative_asset_id` se linkea al asset generado en Creative Studio
- Server-side sync: cuando `creative_assets.status = 'approved'` → auto-update `campaign_items.status = 'approved'`

---

## Edge Cases

| Escenario | Manejo |
|-----------|--------|
| Item rechazado múltiples veces | Agente re-produce con `rejection_reason` como contexto. Si falla 3+ veces → escalate a humano con nota en `campaign_items.notes` |
| Canal sin agente disponible | Item queda en `pending`. Marketing-agent notifica en `/revisar-campana` |
| Budget superado | `paid-media-agent` detecta en `/reporte-paid-media` y notifica. `campaigns.budget_spent > campaigns.budget_total` → alerta en KPI bar |
| Creative Studio no disponible | Items de tipo social_image usan artifact con brief de imagen como fallback |
| Campaña pausada | `PATCH /api/campaigns/:id status=paused` → todos los `scheduled` items se quedan en queue |

---

## Verificación End-to-End

```bash
# 1. Crear campaña de prueba
curl -X POST http://localhost:3001/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Campaign","channels":["blog","instagram","meta_ads"],"status":"planning"}'

# 2. Bulk create items
# (ver /api/campaigns/:id/items endpoint)

# 3. Verificar stats
curl http://localhost:3001/api/campaigns/stats

# 4. Submit review de un item
curl -X POST http://localhost:3001/api/campaigns/items/:id/submit-review
# → debe crear entrada en inbox_items para el assigned_agent
```