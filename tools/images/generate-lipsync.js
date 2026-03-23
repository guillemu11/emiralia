/**
 * KIE AI Lip Sync
 * Genera video de lip sync combinando audio MP3 con imagen de avatar.
 *
 * Patrón: POST createTask → GET recordInfo polling → descargar video → guardar en disco
 */

import axios from 'axios';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { upload, generateKey } from '../storage/storage-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const KIE_AI_API_KEY = process.env.KIE_AI_API_KEY;
const KIE_AI_BASE_URL = 'https://api.kie.ai/api/v1';
const KIE_LIPSYNC_MODEL = process.env.KIE_LIPSYNC_MODEL || 'infinitalk/from-audio';

/**
 * Genera video de lip sync a partir de audio e imagen de avatar
 *
 * @param {Object} params
 * @param {string} params.audioUrl        - URL del audio MP3 generado (puede ser URL pública o ruta local)
 * @param {string} params.avatarImageUrl  - URL de la imagen del avatar
 * @param {string} [params.format='9:16'] - Aspect ratio del video de salida
 * @returns {Promise<Object>} { success, url, path }
 */
export async function generateLipsync({ audioUrl, avatarImageUrl, format = '9:16', prompt = 'Natural professional lip sync, smooth animation', resolution, model }) {
    if (!KIE_AI_API_KEY) {
        throw new Error('KIE_AI_API_KEY not configured in .env');
    }
    if (!audioUrl) {
        throw new Error('audioUrl is required');
    }
    if (!avatarImageUrl) {
        throw new Error('avatarImageUrl is required');
    }

    // Determine model: explicit param > env var > default
    const modelToUse = model || KIE_LIPSYNC_MODEL;

    // Kling Pro supports 1080p; others default to 720p
    const resolutionToUse = resolution || (modelToUse === 'kling-avatar/pro' ? '1080p' : '720p');

    console.log(`[LipSync] Iniciando generación de lip sync`);
    console.log(`[LipSync] Modelo: ${modelToUse}, resolución: ${resolutionToUse}, formato: ${format}`);
    console.log(`[LipSync] Audio: ${audioUrl}`);
    console.log(`[LipSync] Avatar: ${avatarImageUrl}`);

    try {
        return await generateWithRetry({ audioUrl, avatarImageUrl, prompt, resolution: resolutionToUse, model: modelToUse });
    } catch (error) {
        console.error('[LipSync] Error en generación:', error.message);

        if (error.response?.status === 401) {
            throw new Error('Invalid KIE AI API key');
        }
        if (error.response?.status === 402) {
            throw new Error('KIE AI insufficient credits - check your balance');
        }
        if (error.response?.status === 429) {
            throw new Error('Rate limit exceeded - try again in a few moments');
        }
        if (error.code === 'ECONNABORTED') {
            throw new Error('Request timeout - try again');
        }

        throw new Error(`Lipsync generation failed: ${error.message}`);
    }
}

/**
 * Ejecuta un intento de generación de lip sync (createTask + polling + upload)
 */
async function runOnce({ audioUrl, avatarImageUrl, prompt, resolution, model }) {
    const createRes = await axios.post(
        `${KIE_AI_BASE_URL}/jobs/createTask`,
        {
            model,
            input: {
                image_url: avatarImageUrl,
                audio_url: audioUrl,
                prompt,
                resolution,
            }
        },
        {
            headers: {
                'Authorization': `Bearer ${KIE_AI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        }
    );

    if (createRes.data.code !== 200) {
        throw new Error(`Task creation failed: ${createRes.data.msg}`);
    }

    const taskId = createRes.data.data?.taskId || createRes.data.data?.task_id;
    if (!taskId) {
        throw new Error('No taskId returned from KIE AI');
    }

    console.log(`[LipSync] Tarea creada: ${taskId}`);

    const videoUrl = await pollLipsyncResult(taskId);

    console.log(`[LipSync] Descargando video desde: ${videoUrl}`);
    const videoResponse = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        timeout: 120000,
    });
    const videoBuffer = Buffer.from(videoResponse.data);

    const key = generateKey('lipsync', 'mp4');
    const { url: publicUrl } = await upload(videoBuffer, key, 'video/mp4');

    console.log(`[LipSync] ✓ URL pública: ${publicUrl}`);

    return {
        success: true,
        url: publicUrl,
        storageKey: key,
    };
}

/**
 * Reintenta la generación hasta maxRetries veces.
 * En el 2do intento baja a 480p para reducir carga en el upstream.
 */
async function generateWithRetry(params, maxRetries = 2) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const resolution = attempt > 1 ? '480p' : params.resolution;
        try {
            if (attempt > 1) {
                console.log(`[LipSync] Reintentando (intento ${attempt}/${maxRetries}) con resolución ${resolution}...`);
            }
            return await runOnce({ ...params, resolution, model: params.model });
        } catch (err) {
            lastError = err;
            const isUpstreamTimeout = /timed out|timeout|try again/i.test(err.message);
            if (!isUpstreamTimeout || attempt === maxRetries) throw err;
            console.log(`[LipSync] Timeout detectado en intento ${attempt}, esperando 5s antes de reintentar...`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
    throw lastError;
}

/**
 * Hace polling a KIE AI hasta que el video de lip sync esté listo o haya timeout
 *
 * @param {string} taskId    - ID de la tarea
 * @param {number} timeoutMs - Tiempo máximo de espera en ms (default 300s — videos tardan más)
 * @returns {Promise<string>} URL del video generado
 */
async function pollLipsyncResult(taskId, timeoutMs = 300000) {
    const start = Date.now();
    let attempts = 0;
    const interval = 5000;

    while (Date.now() - start < timeoutMs) {
        await new Promise(r => setTimeout(r, interval));
        attempts++;

        const res = await axios.get(
            `${KIE_AI_BASE_URL}/jobs/recordInfo?taskId=${taskId}`,
            {
                headers: { 'Authorization': `Bearer ${KIE_AI_API_KEY}` },
                timeout: 15000,
            }
        );

        const data = res.data?.data || {};
        const state = data.state;
        console.log(`[LipSync] Poll #${attempts}: ${state}`);

        if (state === 'success') {
            // resultJson contiene la URL del video
            let videoUrl;
            try {
                const parsed = JSON.parse(data.resultJson || '{}');
                // El campo puede ser videoUrl, video_url, o estar en resultUrls
                videoUrl = parsed.videoUrl || parsed.video_url || (parsed.resultUrls || [])[0];
            } catch { /* ignorar errores de parsing */ }

            if (!videoUrl) {
                throw new Error('No video URL found in KIE AI lipsync result');
            }
            return videoUrl;
        }

        if (state === 'fail') {
            throw new Error(data.failMsg || 'KIE AI lipsync generation failed');
        }
        // estados: waiting, queuing, generating → continuar polling
    }

    throw new Error('Lipsync generation timeout after 300s');
}
