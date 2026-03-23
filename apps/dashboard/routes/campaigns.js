/**
 * Campaign Manager — Express Router (Project 044)
 *
 * Endpoints:
 *   GET    /api/campaigns                        — listar campaigns (filtros: status, search, limit, offset)
 *   POST   /api/campaigns                        — crear campaign
 *   GET    /api/campaigns/stats                  — stats globales
 *   GET    /api/campaigns/:id                    — obtener campaign con sus items
 *   PATCH  /api/campaigns/:id                    — actualizar campaign
 *   DELETE /api/campaigns/:id                    — borrar campaign
 *   POST   /api/campaigns/:id/items              — crear item(s) (bulk o single)
 *   GET    /api/campaigns/:id/items              — listar items de una campaign
 *   PATCH  /api/campaigns/items/:itemId          — actualizar item
 *   DELETE /api/campaigns/items/:itemId          — borrar item
 *   POST   /api/campaigns/items/:itemId/submit-review — enviar a revisión
 *   POST   /api/campaigns/items/:itemId/approve  — aprobar item
 *   POST   /api/campaigns/items/:itemId/reject   — rechazar item
 *   POST   /api/campaigns/items/:itemId/produce  — lanzar producción de contenido final
 *
 * Uso: import { createCampaignsRouter } from './routes/campaigns.js';
 *      app.use('/api/campaigns', createCampaignsRouter(pool));
 */

import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { generateImage } from '../../../tools/images/generate-image.js';
import { generateTTS } from '../../../tools/images/generate-tts.js';
import { generateLipsync } from '../../../tools/images/generate-lipsync.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Background production helper ────────────────────────────────────────────

async function produceItem(pool, item) {
    const contentType = item.content_type;
    const briefContent = item.artifact_content ?? '';
    const briefMeta = item.artifact_metadata ?? {};

    console.log(`[produce] Iniciando producción: item=${item.id} type=${contentType}`);

    if (contentType === 'blog_post') {
        await produceBlogPost(pool, item, briefContent, briefMeta);
    } else if (contentType === 'social_image') {
        await produceSocialImage(pool, item, briefContent, briefMeta);
    } else if (contentType === 'avatar_video') {
        await produceAvatarVideo(pool, item, briefContent, briefMeta);
    } else {
        throw new Error(`Unknown content_type: ${contentType}`);
    }

    // Mover a pending_review y notificar inbox
    await pool.query(
        `UPDATE campaign_items SET status = 'pending_review' WHERE id = $1`,
        [item.id]
    );
    await pool.query(
        `INSERT INTO inbox_items (title, description, source, department, status)
         VALUES ($1, $2, 'agent', $3, 'chat')`,
        [
            `Revisar contenido producido: ${item.title || item.content_type}`,
            `Contenido final generado (${contentType}, canal: ${item.channel}). Listo para revisión.`,
            item.assigned_agent ?? 'content-agent',
        ]
    );
    console.log(`[produce] Completado: item=${item.id} → pending_review`);
}

// ─── Blog post production ──────────────────────────────────────────────────────

async function produceBlogPost(pool, item, briefContent, briefMeta) {
    console.log(`[produce:blog] Generando artículo completo para: ${item.title}`);

    // 1. Generar artículo completo con Claude
    const articleMsg = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        messages: [{
            role: 'user',
            content: `Eres el content writer especializado de Emiralia, la plataforma inmobiliaria líder para hispanohablantes en UAE.

A continuación tienes un brief de contenido SEO para un artículo de blog. Tu tarea es expandirlo en un artículo completo, profesional y publicable.

BRIEF:
${briefContent}

REQUISITOS:
- Longitud: 1200–1500 palabras
- Formato: Markdown (H2, H3, listas, negritas para términos clave)
- Tono: profesional, basado en datos, accesible para inversor hispanohablante
- Incluir datos reales cuando sea posible (yields UAE 2025-2026, precios por zona, etc.)
- CTA final: mencionar Emiralia como herramienta para encontrar propiedades

Al final del artículo, añade una sección JSON así (separada por ---JSON---):
---JSON---
{
  "title_tag": "...",
  "meta_description": "...",
  "slug": "..."
}
---JSON---

El title_tag debe ser máximo 60 caracteres. La meta_description máximo 160 caracteres. El slug en kebab-case.`,
        }],
    });

    const rawArticle = articleMsg.content[0].text;

    // Separar artículo del bloque JSON
    const jsonSplit = rawArticle.split('---JSON---');
    const articleMarkdown = jsonSplit[0].trim();
    let seoMeta = {};
    if (jsonSplit[1]) {
        try { seoMeta = JSON.parse(jsonSplit[1].trim()); } catch (e) { /* non-blocking */ }
    }

    // 2. Generar imagen destacada con nano banana
    let featuredImageUrl = null;
    try {
        const keywords = briefMeta.keywords ?? item.title ?? 'Dubai real estate investment';
        const imgResult = await generateImage(
            `${keywords} — Dubai real estate aerial photography, modern skyline, premium property`,
            { size: 'landscape', quality: 'hd' }
        );
        if (imgResult.success) featuredImageUrl = imgResult.url;
    } catch (imgErr) {
        console.warn(`[produce:blog] imagen no generada: ${imgErr.message}`);
    }

    // 3. Actualizar artifact con el artículo completo
    await pool.query(
        `UPDATE artifacts
         SET content = $1,
             metadata = metadata || $2::jsonb,
             status = 'pending_review',
             updated_at = NOW()
         WHERE id = $3`,
        [
            articleMarkdown,
            JSON.stringify({
                title_tag: seoMeta.title_tag ?? null,
                meta_description: seoMeta.meta_description ?? null,
                slug: seoMeta.slug ?? null,
                featured_image_url: featuredImageUrl,
            }),
            item.artifact_id,
        ]
    );
}

// ─── Social image production ───────────────────────────────────────────────────

async function produceSocialImage(pool, item, briefContent, briefMeta) {
    console.log(`[produce:social] Generando imagen para: ${item.title}`);

    // Extraer el prompt de IA del brief (buscar sección "## Prompt")
    let imagePrompt = briefMeta.ai_prompt ?? null;
    if (!imagePrompt) {
        const promptMatch = briefContent.match(/##\s*Prompt[^\n]*\n+([\s\S]+?)(?:\n##|$)/i);
        if (promptMatch) imagePrompt = promptMatch[1].trim();
    }
    if (!imagePrompt) {
        imagePrompt = `${item.title} — Dubai real estate, professional Instagram post, luxury lifestyle`;
    }

    const imgResult = await generateImage(imagePrompt, { size: 'square', quality: 'hd' });

    if (!imgResult.success) throw new Error('Image generation failed: ' + imgResult.error);

    await pool.query(
        `UPDATE artifacts
         SET metadata = metadata || $1::jsonb,
             status = 'pending_review',
             updated_at = NOW()
         WHERE id = $2`,
        [
            JSON.stringify({
                generated_image_url: imgResult.url,
                generated_image_path: imgResult.path ?? null,
            }),
            item.artifact_id,
        ]
    );
}

// ─── Avatar video production ───────────────────────────────────────────────────

async function produceAvatarVideo(pool, item, briefContent, briefMeta) {
    const avatar = briefMeta.avatar ?? (item.title?.toLowerCase().includes('yolanda') ? 'Yolanda' : 'Fernando');
    console.log(`[produce:video] Generando vídeo avatar=${avatar} para: ${item.title}`);

    // Extraer guion del artifact
    let script = briefMeta.script ?? null;
    if (!script) {
        const scriptMatch = briefContent.match(/##\s*Guion[^\n]*\n+([\s\S]+?)(?:\n##|$)/i);
        if (scriptMatch) script = scriptMatch[1].trim();
    }
    if (!script) {
        throw new Error('No se encontró guion en el artifact para producción de vídeo');
    }

    // TTS
    const voiceId = avatar === 'Yolanda' ? 'yolanda_es' : 'fernando_es';
    const ttsResult = await generateTTS({ script, voiceId, speed: 1.1 });
    if (!ttsResult.success) throw new Error('TTS failed: ' + ttsResult.error);

    // Lipsync
    const avatarImageUrl = avatar === 'Yolanda'
        ? process.env.AVATAR_YOLANDA_URL ?? '/avatars/yolanda.jpg'
        : process.env.AVATAR_FERNANDO_URL ?? '/avatars/fernando.jpg';

    const videoResult = await generateLipsync({
        audioUrl: ttsResult.url,
        avatarImageUrl,
        format: '9:16',
    });
    if (!videoResult.success) throw new Error('Lipsync failed: ' + videoResult.error);

    await pool.query(
        `UPDATE artifacts
         SET metadata = metadata || $1::jsonb,
             status = 'pending_review',
             updated_at = NOW()
         WHERE id = $2`,
        [
            JSON.stringify({
                tts_url: ttsResult.url,
                tts_path: ttsResult.path ?? null,
                video_url: videoResult.url,
                video_path: videoResult.path ?? null,
                avatar,
                voice_id: voiceId,
            }),
            item.artifact_id,
        ]
    );
}

// ─── Router ───────────────────────────────────────────────────────────────────

export function createCampaignsRouter(pool) {
    const router = Router();

    // ─── GET /stats ───────────────────────────────────────────────────────────
    // IMPORTANTE: /stats debe ir ANTES de /:id para que Express no lo confunda con un UUID

    router.get('/stats', async (req, res) => {
        try {
            const [campaignsTotal, campaignsByStatus, itemsTotal, itemsByStatus, budget] =
                await Promise.all([
                    pool.query(`SELECT COUNT(*)::int AS total FROM campaigns`),
                    pool.query(`SELECT status, COUNT(*)::int AS count FROM campaigns GROUP BY status`),
                    pool.query(`SELECT COUNT(*)::int AS total FROM campaign_items`),
                    pool.query(`SELECT status, COUNT(*)::int AS count FROM campaign_items GROUP BY status`),
                    pool.query(`SELECT COALESCE(SUM(budget_total), 0) AS total_allocated,
                                       COALESCE(SUM(budget_spent), 0) AS total_spent
                                FROM campaigns`),
                ]);

            const byStatusCampaigns = {};
            for (const row of campaignsByStatus.rows) {
                byStatusCampaigns[row.status] = row.count;
            }

            const byStatusItems = {};
            for (const row of itemsByStatus.rows) {
                byStatusItems[row.status] = row.count;
            }

            res.json({
                campaigns: {
                    total: campaignsTotal.rows[0].total,
                    by_status: byStatusCampaigns,
                },
                items: {
                    total: itemsTotal.rows[0].total,
                    by_status: byStatusItems,
                },
                budget: {
                    total_allocated: parseFloat(budget.rows[0].total_allocated),
                    total_spent:     parseFloat(budget.rows[0].total_spent),
                },
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── GET /calendar ────────────────────────────────────────────────────────
    // Returns all campaign_items with scheduled_at within a date range
    // Query params: start (ISO date), end (ISO date)

    router.get('/calendar', async (req, res) => {
        try {
            const { start, end } = req.query;
            let whereClause = `WHERE ci.scheduled_at IS NOT NULL`;
            const params = [];
            if (start) { params.push(start); whereClause += ` AND ci.scheduled_at >= $${params.length}::date`; }
            if (end)   { params.push(end);   whereClause += ` AND ci.scheduled_at <= ($${params.length}::date + interval '1 day')`; }

            const result = await pool.query(
                `SELECT ci.*, c.title AS campaign_title, c.status AS campaign_status
                 FROM campaign_items ci
                 JOIN campaigns c ON ci.campaign_id = c.id
                 ${whereClause}
                 ORDER BY ci.scheduled_at ASC`,
                params
            );
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── GET / ────────────────────────────────────────────────────────────────

    router.get('/', async (req, res) => {
        try {
            const { status, search, limit = 50, offset = 0 } = req.query;
            const conditions = [];
            const params = [];

            if (status && status !== 'all') {
                params.push(status);
                conditions.push(`status = $${params.length}`);
            }
            if (search) {
                params.push(`%${search}%`);
                conditions.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`);
            }

            const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
            params.push(parseInt(limit), parseInt(offset));

            const result = await pool.query(
                `SELECT id, title, description, goal, target_audience, channels,
                        budget_total, budget_spent, currency,
                        start_date, end_date, status,
                        created_by, agent_id, metadata,
                        created_at, updated_at
                 FROM campaigns
                 ${where}
                 ORDER BY created_at DESC
                 LIMIT $${params.length - 1} OFFSET $${params.length}`,
                params
            );

            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── POST / ───────────────────────────────────────────────────────────────

    router.post('/', async (req, res) => {
        try {
            const {
                title,
                description = null,
                goal = null,
                target_audience = null,
                channels = [],
                budget_total = null,
                currency = 'USD',
                start_date = null,
                end_date = null,
                status = 'planning',
                created_by = 'human',
                agent_id = null,
                metadata = {},
            } = req.body;

            if (!title) {
                return res.status(400).json({ error: 'title is required' });
            }

            const result = await pool.query(
                `INSERT INTO campaigns
                   (title, description, goal, target_audience, channels,
                    budget_total, currency, start_date, end_date, status,
                    created_by, agent_id, metadata)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                 RETURNING *`,
                [title, description, goal, target_audience,
                 JSON.stringify(channels), budget_total, currency,
                 start_date, end_date, status, created_by, agent_id,
                 JSON.stringify(metadata)]
            );

            res.status(201).json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── Graceful creative_assets sync ────────────────────────────────────────
    // When creative_assets table exists and an item's linked asset is 'approved',
    // auto-update campaign_items.status to 'approved'. Graceful: no-ops if table missing.

    async function syncCreativeAssets(campaignId) {
        try {
            const tableCheck = await pool.query(
                `SELECT 1 FROM information_schema.tables
                 WHERE table_schema='public' AND table_name='creative_assets' LIMIT 1`
            );
            if (!tableCheck.rows.length) return; // P043 not yet deployed

            await pool.query(
                `UPDATE campaign_items ci
                 SET status = 'approved', updated_at = NOW()
                 FROM creative_assets ca
                 WHERE ci.campaign_id = $1
                   AND ci.creative_asset_id = ca.id
                   AND ca.status = 'approved'
                   AND ci.status NOT IN ('approved', 'scheduled', 'published')`,
                [campaignId]
            );
        } catch {
            // Silently ignore — P043 table may not be ready
        }
    }

    // ─── GET /:id ─────────────────────────────────────────────────────────────

    router.get('/:id', async (req, res) => {
        try {
            const campaignResult = await pool.query(
                `SELECT * FROM campaigns WHERE id = $1`,
                [req.params.id]
            );

            if (!campaignResult.rows.length) {
                return res.status(404).json({ error: 'Campaign not found' });
            }

            // Sync creative_assets status if P043 is live
            await syncCreativeAssets(req.params.id);

            const itemsResult = await pool.query(
                `SELECT * FROM campaign_items WHERE campaign_id = $1 ORDER BY created_at ASC`,
                [req.params.id]
            );

            res.json({ ...campaignResult.rows[0], items: itemsResult.rows });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── PATCH /:id ───────────────────────────────────────────────────────────

    router.patch('/:id', async (req, res) => {
        try {
            const {
                title, description, goal, target_audience, channels,
                budget_total, budget_spent, currency,
                start_date, end_date, status, agent_id, metadata,
            } = req.body;

            const fields = [];
            const params = [];

            if (title !== undefined)           { params.push(title);                        fields.push(`title = $${params.length}`); }
            if (description !== undefined)     { params.push(description);                  fields.push(`description = $${params.length}`); }
            if (goal !== undefined)            { params.push(goal);                         fields.push(`goal = $${params.length}`); }
            if (target_audience !== undefined) { params.push(target_audience);              fields.push(`target_audience = $${params.length}`); }
            if (channels !== undefined)        { params.push(JSON.stringify(channels));     fields.push(`channels = $${params.length}`); }
            if (budget_total !== undefined)    { params.push(budget_total);                 fields.push(`budget_total = $${params.length}`); }
            if (budget_spent !== undefined)    { params.push(budget_spent);                 fields.push(`budget_spent = $${params.length}`); }
            if (currency !== undefined)        { params.push(currency);                     fields.push(`currency = $${params.length}`); }
            if (start_date !== undefined)      { params.push(start_date);                   fields.push(`start_date = $${params.length}`); }
            if (end_date !== undefined)        { params.push(end_date);                     fields.push(`end_date = $${params.length}`); }
            if (status !== undefined)          { params.push(status);                       fields.push(`status = $${params.length}`); }
            if (agent_id !== undefined)        { params.push(agent_id);                     fields.push(`agent_id = $${params.length}`); }
            if (metadata !== undefined)        { params.push(JSON.stringify(metadata));     fields.push(`metadata = $${params.length}`); }

            if (!fields.length) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            params.push(req.params.id);
            const result = await pool.query(
                `UPDATE campaigns SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
                params
            );

            if (!result.rows.length) {
                return res.status(404).json({ error: 'Campaign not found' });
            }

            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── DELETE /:id ──────────────────────────────────────────────────────────

    router.delete('/:id', async (req, res) => {
        try {
            const result = await pool.query(
                `DELETE FROM campaigns WHERE id = $1 RETURNING id`,
                [req.params.id]
            );

            if (!result.rows.length) {
                return res.status(404).json({ error: 'Campaign not found' });
            }

            res.json({ deleted: result.rows[0].id });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── POST /:id/items ──────────────────────────────────────────────────────

    router.post('/:id/items', async (req, res) => {
        try {
            // Verificar que la campaign existe
            const campaignCheck = await pool.query(
                `SELECT id FROM campaigns WHERE id = $1`,
                [req.params.id]
            );
            if (!campaignCheck.rows.length) {
                return res.status(404).json({ error: 'Campaign not found' });
            }

            // Soporte bulk { items: [...] } o single item
            const isBulk = Array.isArray(req.body.items);
            const itemList = isBulk ? req.body.items : [req.body];

            if (!itemList.length) {
                return res.status(400).json({ error: 'No items provided' });
            }

            const created = [];
            for (const item of itemList) {
                const {
                    channel,
                    content_type,
                    title = null,
                    assigned_agent = null,
                    status = 'pending',
                    artifact_id = null,
                    creative_asset_id = null,
                    scheduled_at = null,
                    published_at = null,
                    ad_platform = null,
                    ad_budget = null,
                    ad_spend_actual = null,
                    ad_brief = {},
                    notes = null,
                    rejection_reason = null,
                } = item;

                if (!channel || !content_type) {
                    return res.status(400).json({ error: 'channel and content_type are required for each item' });
                }

                const r = await pool.query(
                    `INSERT INTO campaign_items
                       (campaign_id, channel, content_type, title, assigned_agent, status,
                        artifact_id, creative_asset_id, scheduled_at, published_at,
                        ad_platform, ad_budget, ad_spend_actual, ad_brief, notes, rejection_reason)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                     RETURNING *`,
                    [req.params.id, channel, content_type, title, assigned_agent, status,
                     artifact_id, creative_asset_id, scheduled_at, published_at,
                     ad_platform, ad_budget, ad_spend_actual, JSON.stringify(ad_brief),
                     notes, rejection_reason]
                );
                created.push(r.rows[0]);
            }

            res.status(201).json(isBulk ? created : created[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── GET /:id/items ───────────────────────────────────────────────────────

    router.get('/:id/items', async (req, res) => {
        try {
            const campaignCheck = await pool.query(
                `SELECT id FROM campaigns WHERE id = $1`,
                [req.params.id]
            );
            if (!campaignCheck.rows.length) {
                return res.status(404).json({ error: 'Campaign not found' });
            }

            const result = await pool.query(
                `SELECT * FROM campaign_items WHERE campaign_id = $1 ORDER BY created_at ASC`,
                [req.params.id]
            );

            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── PATCH /items/:itemId ─────────────────────────────────────────────────

    router.patch('/items/:itemId', async (req, res) => {
        try {
            const {
                title, channel, content_type, assigned_agent, status,
                artifact_id, scheduled_at, published_at,
                ad_platform, ad_budget, ad_spend_actual, ad_brief,
                notes, rejection_reason,
            } = req.body;

            const fields = [];
            const params = [];

            if (title !== undefined)           { params.push(title);                    fields.push(`title = $${params.length}`); }
            if (channel !== undefined)         { params.push(channel);                  fields.push(`channel = $${params.length}`); }
            if (content_type !== undefined)    { params.push(content_type);             fields.push(`content_type = $${params.length}`); }
            if (assigned_agent !== undefined)  { params.push(assigned_agent);           fields.push(`assigned_agent = $${params.length}`); }
            if (status !== undefined)          { params.push(status);                   fields.push(`status = $${params.length}`); }
            if (artifact_id !== undefined)     { params.push(artifact_id);              fields.push(`artifact_id = $${params.length}`); }
            if (scheduled_at !== undefined)    { params.push(scheduled_at);             fields.push(`scheduled_at = $${params.length}`); }
            if (published_at !== undefined)    { params.push(published_at);             fields.push(`published_at = $${params.length}`); }
            if (ad_platform !== undefined)     { params.push(ad_platform);              fields.push(`ad_platform = $${params.length}`); }
            if (ad_budget !== undefined)       { params.push(ad_budget);                fields.push(`ad_budget = $${params.length}`); }
            if (ad_spend_actual !== undefined) { params.push(ad_spend_actual);          fields.push(`ad_spend_actual = $${params.length}`); }
            if (ad_brief !== undefined)        { params.push(JSON.stringify(ad_brief)); fields.push(`ad_brief = $${params.length}`); }
            if (notes !== undefined)           { params.push(notes);                    fields.push(`notes = $${params.length}`); }
            if (rejection_reason !== undefined){ params.push(rejection_reason);         fields.push(`rejection_reason = $${params.length}`); }

            if (!fields.length) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            params.push(req.params.itemId);
            const result = await pool.query(
                `UPDATE campaign_items SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
                params
            );

            if (!result.rows.length) {
                return res.status(404).json({ error: 'Item not found' });
            }

            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── DELETE /items/:itemId ────────────────────────────────────────────────

    router.delete('/items/:itemId', async (req, res) => {
        try {
            const result = await pool.query(
                `DELETE FROM campaign_items WHERE id = $1 RETURNING id`,
                [req.params.itemId]
            );

            if (!result.rows.length) {
                return res.status(404).json({ error: 'Item not found' });
            }

            res.json({ deleted: result.rows[0].id });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── POST /items/:itemId/submit-review ────────────────────────────────────

    router.post('/items/:itemId/submit-review', async (req, res) => {
        try {
            // 1. Verificar que el item existe
            const itemResult = await pool.query(
                `SELECT * FROM campaign_items WHERE id = $1`,
                [req.params.itemId]
            );

            if (!itemResult.rows.length) {
                return res.status(404).json({ error: 'Item not found' });
            }

            const item = itemResult.rows[0];

            // 2. Cambiar status a pending_review
            await pool.query(
                `UPDATE campaign_items SET status = 'pending_review' WHERE id = $1`,
                [req.params.itemId]
            );

            // 3. Insertar en inbox_items para revisión humana
            await pool.query(
                `INSERT INTO inbox_items (title, description, source, department, status)
                 VALUES ($1, $2, 'agent', $3, 'chat')`,
                [
                    `Revisar: ${item.title || item.content_type}`,
                    `Campaign item pendiente de revisión (canal: ${item.channel})`,
                    item.assigned_agent,
                ]
            );

            res.json({ ...item, status: 'pending_review' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── POST /items/:itemId/approve ─────────────────────────────────────────

    router.post('/items/:itemId/approve', async (req, res) => {
        try {
            const result = await pool.query(
                `UPDATE campaign_items SET status = 'approved' WHERE id = $1 RETURNING *`,
                [req.params.itemId]
            );

            if (!result.rows.length) {
                return res.status(404).json({ error: 'Item not found' });
            }

            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── POST /items/:itemId/produce ─────────────────────────────────────────
    // Lanza la producción de contenido final a partir del brief aprobado.
    // Responde 202 inmediatamente; la producción corre en background.

    router.post('/items/:itemId/produce', async (req, res) => {
        try {
            const itemResult = await pool.query(
                `SELECT ci.*, a.content AS artifact_content, a.metadata AS artifact_metadata, a.title AS artifact_title
                 FROM campaign_items ci
                 LEFT JOIN artifacts a ON a.id = ci.artifact_id
                 WHERE ci.id = $1`,
                [req.params.itemId]
            );

            if (!itemResult.rows.length) {
                return res.status(404).json({ error: 'Item not found' });
            }

            const item = itemResult.rows[0];

            if (item.status !== 'approved') {
                return res.status(400).json({ error: `Item must be in approved status (current: ${item.status})` });
            }

            // Cambiar a producing sincrono antes de responder
            await pool.query(
                `UPDATE campaign_items SET status = 'producing' WHERE id = $1`,
                [item.id]
            );

            res.status(202).json({ message: 'Production started', itemId: item.id, status: 'producing' });

            // Producción en background (no await)
            produceItem(pool, item).catch(err => {
                console.error(`[produce] Error en item ${item.id}:`, err.message);
                pool.query(
                    `UPDATE campaign_items SET status = 'approved' WHERE id = $1`,
                    [item.id]
                ).catch(() => {});
            });

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── POST /items/:itemId/reject ───────────────────────────────────────────

    router.post('/items/:itemId/reject', async (req, res) => {
        try {
            const { rejection_reason = null } = req.body;

            const result = await pool.query(
                `UPDATE campaign_items SET status = 'rejected', rejection_reason = $1
                 WHERE id = $2 RETURNING *`,
                [rejection_reason, req.params.itemId]
            );

            if (!result.rows.length) {
                return res.status(404).json({ error: 'Item not found' });
            }

            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}
