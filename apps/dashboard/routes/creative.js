/**
 * Creative Studio — Express Router (Project 043)
 *
 * Endpoints:
 *   GET    /api/creative/assets               — listar assets (filtros: type, status, limit, offset)
 *   POST   /api/creative/assets               — crear asset
 *   GET    /api/creative/assets/:id           — obtener asset por ID
 *   PATCH  /api/creative/assets/:id           — actualizar asset
 *   DELETE /api/creative/assets/:id           — borrar asset
 *   PATCH  /api/creative/assets/:id/status    — cambiar status
 *   GET    /api/creative/calendar             — obtener calendario (?week_start=YYYY-MM-DD)
 *   POST   /api/creative/calendar             — crear slot de calendario
 *   PATCH  /api/creative/calendar/slots/:id   — actualizar slot
 *   GET    /api/creative/config               — configuración KIE AI y voz
 *
 * Uso: import { createCreativeRouter } from './routes/creative.js';
 *      app.use('/api/creative', createCreativeRouter(pool));
 */

import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { generateImageService } from '../../../tools/images/generate-service.js';

export function createCreativeRouter(pool) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const router = Router();

    // ─── GET /assets ─────────────────────────────────────────────────────────
    //
    // Cursor-based pagination (stable, O(1) regardless of volume).
    //
    // Query params:
    //   type, status, created_by  — filters
    //   limit                     — page size (default 24, max 100)
    //   cursor                    — opaque base64 string from previous next_cursor
    //
    // Response: { items: [...], total: N, next_cursor: string|null }
    //
    // Cursor encodes { at: ISO string, id: UUID } of the last seen row.
    // Subsequent pages fetch rows WHERE (created_at, id) < (cursor.at, cursor.id).

    router.get('/assets', async (req, res) => {
        try {
            const { type, status, created_by, cursor } = req.query;
            const limit = Math.min(parseInt(req.query.limit) || 24, 100);

            // Build filter conditions
            const conditions = [];
            const params = [];

            if (type && type !== 'all') {
                params.push(type);
                conditions.push(`type = $${params.length}`);
            }
            if (status && status !== 'all') {
                params.push(status);
                conditions.push(`status = $${params.length}`);
            }
            if (created_by) {
                params.push(created_by);
                conditions.push(`created_by = $${params.length}`);
            }

            // Decode cursor and add cursor condition
            if (cursor) {
                try {
                    const { at, id } = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
                    params.push(at, id);
                    conditions.push(
                        `(created_at < $${params.length - 1} OR (created_at = $${params.length - 1} AND id < $${params.length}))`
                    );
                } catch {
                    return res.status(400).json({ error: 'Invalid cursor' });
                }
            }

            const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
            params.push(limit + 1); // fetch one extra to detect next page

            // Items query — projected fields only (brief/output_config excluded for list)
            const itemsResult = await pool.query(
                `SELECT id, type, status, title,
                        generated_url, thumbnail_url, storage_key, thumbnail_storage_key,
                        generation_error, scheduled_at, agent_id, created_by,
                        rejection_reason, created_at, updated_at
                 FROM creative_assets
                 ${where}
                 ORDER BY created_at DESC, id DESC
                 LIMIT $${params.length}`,
                params
            );

            const rows = itemsResult.rows;
            const hasMore = rows.length > limit;
            const items = hasMore ? rows.slice(0, limit) : rows;

            // Build next_cursor from last item
            let next_cursor = null;
            if (hasMore && items.length > 0) {
                const last = items[items.length - 1];
                next_cursor = Buffer.from(
                    JSON.stringify({ at: last.created_at.toISOString(), id: last.id })
                ).toString('base64');
            }

            // Total count (only for first page to avoid O(n) on every request)
            let total = null;
            if (!cursor) {
                const countParams = params.slice(0, -1); // exclude the limit param
                const countResult = await pool.query(
                    `SELECT COUNT(*) FROM creative_assets ${where}`,
                    countParams
                );
                total = parseInt(countResult.rows[0].count);
            }

            res.json({ items, total, next_cursor });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── POST /assets ─────────────────────────────────────────────────────────

    router.post('/assets', async (req, res) => {
        try {
            const {
                type, title, brief = {}, output_config = {},
                agent_id = null, created_by = 'human'
            } = req.body;

            if (!type) {
                return res.status(400).json({ error: 'type is required' });
            }

            const validTypes = ['image','text_to_video','image_to_video','multiframe',
                                'podcast','property_tour','carousel','infographic'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({ error: `Invalid type: ${type}` });
            }

            const result = await pool.query(
                `INSERT INTO creative_assets
                   (type, title, brief, output_config, agent_id, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [type, title || null, JSON.stringify(brief), JSON.stringify(output_config),
                 agent_id, created_by]
            );

            res.status(201).json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── GET /assets/:id ──────────────────────────────────────────────────────

    router.get('/assets/:id', async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT * FROM creative_assets WHERE id = $1`,
                [req.params.id]
            );

            if (!result.rows.length) {
                return res.status(404).json({ error: 'Asset not found' });
            }

            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── PATCH /assets/:id ────────────────────────────────────────────────────

    router.patch('/assets/:id', async (req, res) => {
        try {
            const { title, brief, output_config, generated_url, thumbnail_url,
                    generation_error, generation_job_id, rejection_reason } = req.body;

            const fields = [];
            const params = [];

            if (title !== undefined)            { params.push(title);                      fields.push(`title = $${params.length}`); }
            if (brief !== undefined)            { params.push(JSON.stringify(brief));      fields.push(`brief = $${params.length}`); }
            if (output_config !== undefined)    { params.push(JSON.stringify(output_config)); fields.push(`output_config = $${params.length}`); }
            if (generated_url !== undefined)    { params.push(generated_url);              fields.push(`generated_url = $${params.length}`); }
            if (thumbnail_url !== undefined)    { params.push(thumbnail_url);              fields.push(`thumbnail_url = $${params.length}`); }
            if (generation_error !== undefined) { params.push(generation_error);           fields.push(`generation_error = $${params.length}`); }
            if (generation_job_id !== undefined){ params.push(generation_job_id);          fields.push(`generation_job_id = $${params.length}`); }
            if (rejection_reason !== undefined) { params.push(rejection_reason);           fields.push(`rejection_reason = $${params.length}`); }

            if (!fields.length) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            params.push(req.params.id);
            const result = await pool.query(
                `UPDATE creative_assets SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
                params
            );

            if (!result.rows.length) {
                return res.status(404).json({ error: 'Asset not found' });
            }

            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── DELETE /assets/:id ───────────────────────────────────────────────────

    router.delete('/assets/:id', async (req, res) => {
        try {
            const result = await pool.query(
                `DELETE FROM creative_assets WHERE id = $1 RETURNING id`,
                [req.params.id]
            );

            if (!result.rows.length) {
                return res.status(404).json({ error: 'Asset not found' });
            }

            res.json({ deleted: result.rows[0].id });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── PATCH /assets/:id/status ─────────────────────────────────────────────

    router.patch('/assets/:id/status', async (req, res) => {
        try {
            const { status, rejection_reason } = req.body;
            const validStatuses = ['draft','generating','pending_review','approved','rejected','scheduled','published'];

            if (!status || !validStatuses.includes(status)) {
                return res.status(400).json({ error: `Invalid status. Valid: ${validStatuses.join(', ')}` });
            }

            const params = [status, req.params.id];
            let query = `UPDATE creative_assets SET status = $1`;

            if (status === 'rejected' && rejection_reason) {
                params.splice(1, 0, rejection_reason);
                query += `, rejection_reason = $2`;
                params[params.length - 1] = req.params.id;
                query += ` WHERE id = $${params.length} RETURNING *`;
            } else {
                query += ` WHERE id = $2 RETURNING *`;
            }

            const result = await pool.query(query, params);

            if (!result.rows.length) {
                return res.status(404).json({ error: 'Asset not found' });
            }

            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── GET /calendar ────────────────────────────────────────────────────────

    router.get('/calendar', async (req, res) => {
        try {
            const { week_start } = req.query;

            if (!week_start) {
                return res.status(400).json({ error: 'week_start (YYYY-MM-DD) is required' });
            }

            const result = await pool.query(
                `SELECT ec.*,
                        ca.type as asset_type, ca.title as asset_title,
                        ca.thumbnail_url, ca.generated_url, ca.status as asset_status
                 FROM editorial_calendar ec
                 LEFT JOIN creative_assets ca ON ec.asset_id = ca.id
                 WHERE ec.week_start = $1
                 ORDER BY ec.slot_date, ec.platform`,
                [week_start]
            );

            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── POST /calendar ───────────────────────────────────────────────────────

    router.post('/calendar', async (req, res) => {
        try {
            const { slot_date, week_start, platform, asset_id = null, notes = null } = req.body;
            const validPlatforms = ['instagram','tiktok','linkedin','youtube'];

            if (!slot_date || !week_start || !platform) {
                return res.status(400).json({ error: 'slot_date, week_start, platform are required' });
            }
            if (!validPlatforms.includes(platform)) {
                return res.status(400).json({ error: `Invalid platform. Valid: ${validPlatforms.join(', ')}` });
            }

            const result = await pool.query(
                `INSERT INTO editorial_calendar (slot_date, week_start, platform, asset_id, notes, status)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [slot_date, week_start, platform, asset_id, notes,
                 asset_id ? 'scheduled' : 'empty']
            );

            // If asset_id provided, update asset scheduled_at
            if (asset_id) {
                await pool.query(
                    `UPDATE creative_assets SET scheduled_at = $1, status = 'scheduled'
                     WHERE id = $2`,
                    [slot_date, asset_id]
                );
            }

            res.status(201).json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── PATCH /calendar/slots/:id ────────────────────────────────────────────

    router.patch('/calendar/slots/:id', async (req, res) => {
        try {
            const { asset_id, status, notes } = req.body;
            const fields = [];
            const params = [];

            if (asset_id !== undefined) { params.push(asset_id); fields.push(`asset_id = $${params.length}`); }
            if (status !== undefined)   { params.push(status);   fields.push(`status = $${params.length}`); }
            if (notes !== undefined)    { params.push(notes);    fields.push(`notes = $${params.length}`); }

            if (!fields.length) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            params.push(req.params.id);
            const result = await pool.query(
                `UPDATE editorial_calendar SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
                params
            );

            if (!result.rows.length) {
                return res.status(404).json({ error: 'Slot not found' });
            }

            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── GET /config ──────────────────────────────────────────────────────────

    router.get('/config', async (req, res) => {
        const fernandoVoiceId = process.env.ELEVENLABS_FERNANDO_VOICE_ID || null;
        const yolandaVoiceId  = process.env.ELEVENLABS_YOLANDA_VOICE_ID  || null;
        res.json({
            kie_image_enabled:    !!process.env.KIE_AI_API_KEY,
            video_enabled:        !!process.env.KIE_AI_API_KEY,
            elevenlabs_enabled:   !!(process.env.ELEVENLABS_API_KEY && fernandoVoiceId && yolandaVoiceId),
            fernando_voice_id:    fernandoVoiceId,
            yolanda_voice_id:     yolandaVoiceId,
            fernando_avatar_url:  process.env.FERNANDO_AVATAR_URL || null,
            yolanda_avatar_url:   process.env.YOLANDA_AVATAR_URL  || null,
            cost_standard: 0.04,
            cost_hd: 0.06,
            supported_types: ['image','text_to_video','image_to_video','multiframe',
                              'podcast','property_tour','carousel','infographic'],
            supported_statuses: ['draft','generating','pending_review','approved',
                                 'rejected','scheduled','published'],
        });
    });

    // ─── POST /generate/image ─────────────────────────────────────────────────

    router.post('/generate/image', async (req, res) => {
        const { asset_id, brief = {}, output_config = {} } = req.body;

        // Validar campos obligatorios del brief
        if (!brief.prompt || !brief.style) {
            return res.status(400).json({ error: 'brief.prompt and brief.style are required' });
        }

        try {
            // Marcar el asset como "generating" en la DB antes de responder
            await pool.query(
                `UPDATE creative_assets SET status = 'generating' WHERE id = $1`,
                [asset_id]
            );
        } catch (err) {
            return res.status(500).json({ error: `DB update failed: ${err.message}` });
        }

        // Construir el prompt completo
        let prompt = brief.prompt;
        prompt += `. Style: ${brief.style}, photography aesthetic`;
        if (brief.avatar && brief.avatar !== 'none') {
            prompt += `. Avatar: ${brief.avatar}`;
        }
        if (brief.text_overlay) {
            prompt += `. Text overlay: ${brief.text_overlay}`;
        }
        if (brief.brand_elements && brief.brand_elements.length) {
            prompt += `. Brand elements: ${Array.isArray(brief.brand_elements) ? brief.brand_elements.join(', ') : brief.brand_elements}`;
        }

        // Mapear format → size
        const sizeMap = { square: 'square', portrait: 'portrait', landscape: 'landscape' };
        const size = sizeMap[output_config.format] || 'square';

        // Mapear quality
        const quality = output_config.quality === 'HD' ? 'hd' : 'standard';

        // Responder inmediatamente — la generación continúa en background
        res.json({ status: 'generating', id: asset_id });

        // Fire-and-forget: generar imagen de forma asíncrona
        (async () => {
            try {
                const result = await generateImageService({
                    prompt,
                    size,
                    quality,
                    model: output_config.model || 'nano-banana-2',
                    generatedBy: 'creative-studio',
                    agentId: 'content-agent',
                });

                await pool.query(
                    `UPDATE creative_assets
                     SET generated_url = $1, thumbnail_url = $2,
                         storage_key = $3, thumbnail_storage_key = $4,
                         status = 'pending_review'
                     WHERE id = $5`,
                    [result.url, result.thumbnailUrl || result.url,
                     result.storageKey || null, result.thumbnailStorageKey || null,
                     asset_id]
                );
            } catch (err) {
                console.error(`[creative/generate/image] asset ${asset_id} failed:`, err.message);
                await pool.query(
                    `UPDATE creative_assets
                     SET generation_error = $1, status = 'draft'
                     WHERE id = $2`,
                    [err.message, asset_id]
                );
            }
        })().catch(err => console.error('[creative/generate/image] unhandled error:', err));
    });

    // ─── POST /generate/video ─────────────────────────────────────────────────

    router.post('/generate/video', async (req, res) => {
        const { asset_id, brief = {}, output_config = {} } = req.body;

        if (!asset_id) {
            return res.status(400).json({ error: 'asset_id is required' });
        }

        // Determinar subtype desde el asset en DB
        let assetType;
        try {
            const assetRes = await pool.query('SELECT type, brief FROM creative_assets WHERE id = $1', [asset_id]);
            if (!assetRes.rows.length) return res.status(404).json({ error: 'Asset not found' });
            assetType = assetRes.rows[0].type;
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }

        // Validar según tipo
        if (assetType === 'text_to_video' && (!brief.script || !brief.avatar)) {
            return res.status(400).json({ error: 'brief.script and brief.avatar are required for text_to_video' });
        }
        if (assetType === 'image_to_video' && (!brief.source_image_url || !brief.motion_description)) {
            return res.status(400).json({ error: 'brief.source_image_url and brief.motion_description are required for image_to_video' });
        }

        // Marcar como generating
        try {
            await pool.query(`UPDATE creative_assets SET status = 'generating' WHERE id = $1`, [asset_id]);
        } catch (err) {
            return res.status(500).json({ error: `DB update failed: ${err.message}` });
        }

        // Responder inmediatamente — la generación continúa en background
        res.json({ status: 'generating', id: asset_id });

        // Pipeline async fire-and-forget
        (async () => {
            try {
                let videoUrl;
                let videoStorageKey = null;

                if (assetType === 'text_to_video') {
                    // Import dinámico para evitar problemas de ES module en top-level
                    const { generateAvatarVideo } = await import('../../../tools/images/generate-video-service.js');
                    const result = await generateAvatarVideo({
                        script: brief.script,
                        avatar: brief.avatar,
                        format: output_config.format || '9:16',
                        speed: parseFloat(brief.voice_speed) || 1.0,
                        tone: brief.tone || null,
                        lipsyncModel: output_config.lipsync_model || null,
                    });
                    videoUrl = result.videoUrl;
                    videoStorageKey = result.storageKey || null;

                } else if (assetType === 'image_to_video') {
                    const { generateImageToVideo } = await import('../../../tools/images/generate-video.js');
                    const result = await generateImageToVideo({
                        imageUrl: brief.source_image_url,
                        motionDescription: brief.motion_description,
                        cameraMovement: brief.camera_movement || 'pan',
                        format: output_config.format || '9:16',
                        duration: output_config.duration?.replace('s', '') || '5',
                        model: output_config.model || null,
                    });
                    videoUrl = result.url;
                    videoStorageKey = result.storageKey || null;

                } else if (assetType === 'multiframe') {
                    // Multiframe: pipeline en desarrollo — se completa en Fase 4
                    await pool.query(
                        `UPDATE creative_assets SET status = 'pending_review', generation_error = $1 WHERE id = $2`,
                        ['Multiframe pipeline en desarrollo — usa Image to Video por frame', asset_id]
                    );
                    return;

                } else if (assetType === 'podcast') {
                    // Pipeline Podcast: ElevenLabs TTS + KIE AI Lip Sync por host
                    const { generateAvatarVideo } = await import('../../../tools/images/generate-video-service.js');

                    const hosts = brief.hosts || 'fernando';
                    const talkingPoints = Array.isArray(brief.talking_points)
                        ? brief.talking_points.join('. ')
                        : brief.talking_points || '';
                    const topic = brief.topic || '';
                    const voiceStyle = brief.voice_style || 'natural';

                    if (hosts === 'both') {
                        // Dividir talking points entre Fernando y Yolanda
                        const points = Array.isArray(brief.talking_points) ? brief.talking_points : [];
                        const midpoint = Math.ceil(points.length / 2);
                        const fernandoScript = `${topic}. ${points.slice(0, midpoint).join('. ')}`;
                        const yolandaScript  = points.slice(midpoint).join('. ') || topic;

                        // Generar ambos segmentos
                        const [fernandoResult, yolandaResult] = await Promise.all([
                            generateAvatarVideo({ script: fernandoScript, avatar: 'fernando', format: output_config.format || '16:9', lipsyncModel: output_config.lipsync_model || null }),
                            generateAvatarVideo({ script: yolandaScript,  avatar: 'yolanda',  format: output_config.format || '16:9', lipsyncModel: output_config.lipsync_model || null }),
                        ]);

                        // Guardar ambas URLs — el video principal es Fernando, Yolanda en brief
                        videoUrl = fernandoResult.videoUrl;
                        await pool.query(
                            `UPDATE creative_assets SET brief = brief || $1 WHERE id = $2`,
                            [JSON.stringify({ yolanda_segment_url: yolandaResult.videoUrl }), asset_id]
                        );
                    } else {
                        const avatar = hosts === 'yolanda' ? 'yolanda' : 'fernando';
                        const script = `${topic}. ${talkingPoints}`;
                        const result = await generateAvatarVideo({
                            script,
                            avatar,
                            format: output_config.format || '16:9',
                            lipsyncModel: output_config.lipsync_model || null,
                        });
                        videoUrl = result.videoUrl;
                    }

                } else if (assetType === 'property_tour') {
                    // Pipeline Property Tour: fetch DB → build script → ElevenLabs TTS + Lip Sync
                    const { generateAvatarVideo } = await import('../../../tools/images/generate-video-service.js');

                    let propertyData = brief.property_data || {};

                    // Si viene property_id, intentar enriquecer desde DB
                    if (brief.property_id) {
                        try {
                            const propRes = await pool.query(
                                `SELECT title, price_aed, community, bedrooms, size_sqft, roi, images
                                 FROM properties
                                 WHERE pf_id = $1 OR id::text = $1
                                 LIMIT 1`,
                                [String(brief.property_id)]
                            );
                            if (propRes.rows.length) {
                                propertyData = { ...propRes.rows[0], ...propertyData };
                            }
                        } catch (dbErr) {
                            console.warn('[creative/tour] DB fetch failed, using brief data:', dbErr.message);
                        }
                    }

                    // Construir el guión del host con los datos de la propiedad
                    const overlays = brief.data_overlays || ['precio', 'roi'];
                    const parts = [
                        propertyData.title ? `Hoy te presento ${propertyData.title}` : 'Hoy te presento esta increíble propiedad',
                    ];
                    if (propertyData.community) parts.push(`ubicada en ${propertyData.community}`);
                    if (overlays.includes('precio') && propertyData.price_aed) {
                        parts.push(`con un precio de ${Number(propertyData.price_aed).toLocaleString()} AED`);
                    }
                    if (overlays.includes('metros') && propertyData.size_sqft) {
                        parts.push(`con ${propertyData.size_sqft} pies cuadrados de superficie`);
                    }
                    if (propertyData.bedrooms) parts.push(`${propertyData.bedrooms} habitaciones`);
                    if (overlays.includes('roi') && propertyData.roi) {
                        parts.push(`y una rentabilidad estimada del ${propertyData.roi}% anual`);
                    }
                    parts.push('Una oportunidad que no te puedes perder en el mercado de Emiratos.');

                    const script = parts.join(', ');
                    const avatar = brief.host === 'yolanda' ? 'yolanda' : 'fernando';

                    const result = await generateAvatarVideo({
                        script,
                        avatar,
                        format: output_config.format || '9:16',
                        lipsyncModel: output_config.lipsync_model || null,
                    });
                    videoUrl = result.videoUrl;

                } else {
                    throw new Error(`Unsupported video type for this endpoint: ${assetType}`);
                }

                await pool.query(
                    `UPDATE creative_assets
                     SET generated_url = $1, thumbnail_url = $2,
                         storage_key = $3, status = 'pending_review'
                     WHERE id = $4`,
                    [videoUrl, videoUrl, videoStorageKey || null, asset_id]
                );

            } catch (err) {
                console.error(`[creative/generate/video] asset ${asset_id} failed:`, err.message);
                await pool.query(
                    `UPDATE creative_assets SET generation_error = $1, status = 'draft' WHERE id = $2`,
                    [err.message, asset_id]
                );
            }
        })().catch(err => console.error('[creative/generate/video] unhandled:', err));
    });

    // ─── POST /suggest-brief ──────────────────────────────────────────────────
    // Recibe { type, context } → devuelve brief JSONB sugerido para pre-rellenar el formulario

    router.post('/suggest-brief', async (req, res) => {
        const { type, context } = req.body;
        if (!type || !context) {
            return res.status(400).json({ error: 'type and context are required' });
        }

        const briefSchemas = {
            image:          '{ prompt, style (realistic|illustrated|cinematic|minimal), avatar (fernando|yolanda|none), text_overlay? }',
            text_to_video:  '{ script, avatar (fernando|yolanda), tone (informativo|aspiracional|urgente|educativo), scene?, subtitles?, voice_speed (0.8|1|1.2) }',
            image_to_video: '{ source_image_url, motion_description, camera_movement (Pan|Zoom In|Zoom Out|Orbit|Static) }',
            multiframe:     '{ frames: [{image_url, caption, duration_s}], transition_style (Fade|Cut|Wipe|Morph) }',
            podcast:        '{ hosts (fernando|yolanda|both), topic, talking_points (multi-line text), background_scene (minimal_studio|dubai_skyline|office|coworking), voice_style (natural|energetico|profesional) }',
            property_tour:  '{ host (fernando|yolanda|auto), property_data: {title, price_aed, community, bedrooms, roi}, data_overlays: [precio|roi|metros|ubicacion|developer] }',
            carousel:       '{ slides: [{title, text}], style_template (Emiralia Branded|Minimalista|Dark Premium|Stats Only) }',
            infographic:    '{ infographic_type (Data|Comparison|Timeline|Process), data: [{label, value}], color_scheme (Primary Blue|Dark Premium|Light Neutral) }',
        };

        const systemPrompt = `Eres un experto en marketing inmobiliario para el mercado hispanohablante interesado en Dubai y Abu Dhabi.
El usuario te pide generar un brief estructurado para producir contenido de tipo "${type}" para la plataforma Emiralia.

Schema esperado para el tipo "${type}":
${briefSchemas[type] || '{ prompt }'}

Reglas:
- Responde ÚNICAMENTE con un JSON válido, sin markdown, sin explicaciones.
- Adapta el contenido al mercado inmobiliario de Emiratos Árabes Unidos.
- Usa español neutro (no muy regional).
- El JSON debe ser parseable directamente con JSON.parse().
- No incluyas campos que no estén en el schema.`;

        try {
            const message = await anthropic.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 800,
                system: systemPrompt,
                messages: [{ role: 'user', content: context }],
            });

            const raw = message.content[0]?.text?.trim() || '{}';
            // Extraer JSON del response (puede venir envuelto en ```json ... ```)
            const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
            const jsonStr = (jsonMatch[1] || raw).trim();

            let suggested;
            try {
                suggested = JSON.parse(jsonStr);
            } catch {
                // Si no es JSON válido, intentar extraer el bloque JSON
                const start = jsonStr.indexOf('{');
                const end = jsonStr.lastIndexOf('}');
                if (start !== -1 && end !== -1) {
                    suggested = JSON.parse(jsonStr.slice(start, end + 1));
                } else {
                    throw new Error('Claude did not return valid JSON');
                }
            }

            res.json(suggested);
        } catch (err) {
            console.error('[creative/suggest-brief] Error:', err.message);
            res.status(500).json({ error: `Brief suggestion failed: ${err.message}` });
        }
    });

    return router;
}
