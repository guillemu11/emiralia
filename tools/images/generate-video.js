/**
 * KIE AI Video Generation
 * Text-to-Video e Image-to-Video directos (sin pipeline de avatar).
 *
 * Patrón: POST createTask → GET recordInfo polling → descargar video → guardar en disco
 */

import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { upload, generateKey } from '../storage/storage-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const KIE_AI_API_KEY = process.env.KIE_AI_API_KEY;
const KIE_AI_BASE_URL = 'https://api.kie.ai/api/v1';
const KIE_VIDEO_MODEL = process.env.KIE_VIDEO_MODEL || 'wan-2.1';

// ─── Helpers internos ──────────────────────────────────────────────────────

/**
 * Hace polling a KIE AI hasta que el video esté listo o haya timeout
 *
 * @param {string} taskId    - ID de la tarea
 * @param {string} prefix    - Prefijo para logs (ej. 'TextToVideo', 'ImageToVideo')
 * @param {number} timeoutMs - Tiempo máximo de espera en ms (default 300s)
 * @returns {Promise<string>} URL del video generado
 */
async function pollVideoResult(taskId, prefix = 'Video', timeoutMs = 300000) {
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
        console.log(`[${prefix}] Poll #${attempts}: ${state}`);

        if (state === 'success') {
            let videoUrl;
            try {
                const parsed = JSON.parse(data.resultJson || '{}');
                // El campo puede ser videoUrl, video_url, o estar en resultUrls
                videoUrl = parsed.videoUrl || parsed.video_url || (parsed.resultUrls || [])[0];
            } catch { /* ignorar errores de parsing */ }

            if (!videoUrl) {
                throw new Error(`No video URL found in KIE AI result for task ${taskId}`);
            }
            return videoUrl;
        }

        if (state === 'fail') {
            throw new Error(data.failMsg || 'KIE AI video generation failed');
        }
        // estados: waiting, queuing, generating → continuar polling
    }

    throw new Error('Video generation timeout after 300s');
}

/**
 * Descarga un video desde URL y lo sube al storage service
 *
 * @param {string} videoUrl  - URL del video a descargar
 * @param {string} prefix    - Storage key prefix ('video')
 * @returns {Promise<Object>} { url: publicUrl, key: storageKey }
 */
async function downloadAndSaveVideo(videoUrl, prefix = 'video') {
    console.log(`[Video] Descargando desde: ${videoUrl}`);

    const videoResponse = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        timeout: 120000,
    });
    const videoBuffer = Buffer.from(videoResponse.data);

    const key = generateKey(prefix, 'mp4');
    const { url: publicUrl } = await upload(videoBuffer, key, 'video/mp4');

    console.log(`[Video] ✓ URL pública: ${publicUrl}`);
    return { url: publicUrl, key };
}

/**
 * Maneja errores HTTP de KIE AI de forma consistente
 */
function handleKieError(error, context) {
    console.error(`[${context}] Error:`, error.message);

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

    throw new Error(`${context} failed: ${error.message}`);
}

// ─── Text to Video ────────────────────────────────────────────────────────

/**
 * Genera video a partir de un prompt de texto (sin avatar)
 *
 * @param {Object} params
 * @param {string} params.prompt           - Descripción del video a generar
 * @param {string} [params.format='9:16']  - Aspect ratio ('9:16', '16:9', '1:1')
 * @param {string} [params.duration='5']   - Duración en segundos
 * @returns {Promise<Object>} { success, url, path }
 */
export async function generateTextToVideo({ prompt, format = '9:16', duration = '5' }) {
    if (!KIE_AI_API_KEY) {
        throw new Error('KIE_AI_API_KEY not configured in .env');
    }
    if (!prompt || typeof prompt !== 'string') {
        throw new Error('Valid prompt is required');
    }

    console.log(`[TextToVideo] Iniciando generación`);
    console.log(`[TextToVideo] Modelo: ${KIE_VIDEO_MODEL}, formato: ${format}, duración: ${duration}s`);
    console.log(`[TextToVideo] Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);

    try {
        // Step 1: Crear tarea
        const createRes = await axios.post(
            `${KIE_AI_BASE_URL}/jobs/createTask`,
            {
                model: KIE_VIDEO_MODEL,
                input: {
                    prompt,
                    aspect_ratio: format,
                    duration: parseInt(duration),
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

        console.log(`[TextToVideo] Tarea creada: ${taskId}`);

        // Step 2: Polling
        const videoUrl = await pollVideoResult(taskId, 'TextToVideo');

        // Step 3: Descargar y subir a storage
        const saved = await downloadAndSaveVideo(videoUrl, 'video');

        return {
            success: true,
            url: saved.url,
            storageKey: saved.key,
        };

    } catch (error) {
        handleKieError(error, 'TextToVideo');
    }
}

// ─── Image to Video ───────────────────────────────────────────────────────

/**
 * Genera video animado a partir de una imagen estática
 *
 * @param {Object} params
 * @param {string} params.imageUrl              - URL de la imagen base
 * @param {string} params.motionDescription     - Descripción del movimiento a aplicar
 * @param {string} [params.cameraMovement='pan'] - Tipo de movimiento de cámara
 * @param {string} [params.format='9:16']       - Aspect ratio del video
 * @param {string} [params.duration='5']        - Duración en segundos
 * @returns {Promise<Object>} { success, url, path }
 */
export async function generateImageToVideo({
    imageUrl,
    motionDescription,
    cameraMovement = 'pan',
    format = '9:16',
    duration = '5',
    model,
}) {
    if (!KIE_AI_API_KEY) {
        throw new Error('KIE_AI_API_KEY not configured in .env');
    }
    if (!imageUrl) {
        throw new Error('imageUrl is required');
    }
    if (!motionDescription) {
        throw new Error('motionDescription is required');
    }

    const modelToUse = model || KIE_VIDEO_MODEL;
    const isKling = modelToUse === 'kling-3.0/video';

    console.log(`[ImageToVideo] Iniciando generación`);
    console.log(`[ImageToVideo] Modelo: ${modelToUse}, formato: ${format}, duración: ${duration}s`);
    console.log(`[ImageToVideo] Imagen: ${imageUrl}`);
    console.log(`[ImageToVideo] Movimiento: ${motionDescription}${!isKling ? ` (cámara: ${cameraMovement})` : ''}`);

    // Build input payload depending on model
    // kling-3.0/video uses image_urls (array) and mode instead of image_url and camera_movement
    const input = isKling
        ? {
            image_urls: [imageUrl],
            prompt: motionDescription,
            duration: parseInt(duration),
            aspect_ratio: format,
            mode: 'std',
          }
        : {
            image_url: imageUrl,
            prompt: motionDescription,
            camera_movement: cameraMovement,
            aspect_ratio: format,
            duration: parseInt(duration),
          };

    try {
        // Step 1: Crear tarea
        const createRes = await axios.post(
            `${KIE_AI_BASE_URL}/jobs/createTask`,
            {
                model: modelToUse,
                input,
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

        console.log(`[ImageToVideo] Tarea creada: ${taskId}`);

        // Step 2: Polling
        const videoUrl = await pollVideoResult(taskId, 'ImageToVideo');

        // Step 3: Descargar y subir a storage
        const saved = await downloadAndSaveVideo(videoUrl, 'video');

        return {
            success: true,
            url: saved.url,
            storageKey: saved.key,
        };

    } catch (error) {
        handleKieError(error, 'ImageToVideo');
    }
}
