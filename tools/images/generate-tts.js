/**
 * ElevenLabs Text to Speech
 * Convierte un script de texto en audio MP3.
 *
 * API: POST /v1/text-to-speech/{voice_id}
 * Respuesta directa (sin polling): binary stream de audio MP3.
 */

import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { upload, generateKey, getBackend, getPublicUrl } from '../storage/storage-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const ELEVENLABS_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const WEBSITE_BASE_URL = (process.env.WEBSITE_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

/**
 * Convierte texto en audio MP3 usando ElevenLabs TTS
 *
 * @param {Object} params
 * @param {string} params.script      - Texto a convertir en audio
 * @param {string} params.voiceId     - ID de voz de ElevenLabs
 * @param {number} [params.speed=1.0] - Velocidad del habla (0.7–1.2)
 * @returns {Promise<Object>} { success, url, path, voiceId }
 */
export async function generateTTS({ script, voiceId, speed = 1.0 }) {
    if (!ELEVENLABS_API_KEY) {
        throw new Error('ELEVENLABS_API_KEY not configured in .env');
    }
    if (!script || typeof script !== 'string') {
        throw new Error('Valid script text is required');
    }
    if (!voiceId) {
        throw new Error('voiceId is required');
    }

    console.log(`[TTS] Iniciando generación con ElevenLabs. Voz: ${voiceId}`);
    console.log(`[TTS] Modelo: ${ELEVENLABS_MODEL}, velocidad: ${speed}`);
    console.log(`[TTS] Script (${script.length} chars): "${script.substring(0, 80)}${script.length > 80 ? '...' : ''}"`);

    try {
        const response = await axios.post(
            `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`,
            {
                text: script,
                model_id: ELEVENLABS_MODEL,
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    speed: Math.min(Math.max(speed, 0.7), 1.2),
                },
            },
            {
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg',
                },
                responseType: 'arraybuffer',
                timeout: 60000,
            }
        );

        const audioBuffer = Buffer.from(response.data);

        // Upload via storage service (local or R2)
        const key = generateKey('audio', 'mp3');
        const { url: storageUrl } = await upload(audioBuffer, key, 'audio/mpeg');

        // KIE AI lipsync needs a publicly reachable URL.
        // - R2: storageUrl is already a public CDN URL ✓
        // - local: storageUrl is /generated/... — prepend WEBSITE_BASE_URL
        let publicUrl;
        if (getBackend() === 'r2') {
            publicUrl = storageUrl;
        } else {
            const isLocalhost = !WEBSITE_BASE_URL
                || WEBSITE_BASE_URL.includes('localhost')
                || WEBSITE_BASE_URL.includes('127.0.0.1');
            if (isLocalhost) {
                // No public URL available in local dev — lipsync will fail unless
                // you set WEBSITE_BASE_URL to a tunnel (e.g. ngrok) or switch to R2.
                console.warn('[TTS] WEBSITE_BASE_URL is localhost — lipsync may fail. Set STORAGE_BACKEND=r2 or use a tunnel.');
            }
            publicUrl = `${WEBSITE_BASE_URL}${storageUrl}`;
        }

        console.log(`[TTS] ✓ Audio stored: key=${key}`);
        console.log(`[TTS] ✓ Public URL: ${publicUrl}`);

        return {
            success: true,
            url: publicUrl,
            storageKey: key,
            voiceId,
        };

    } catch (error) {
        console.error('[TTS] Error en generación:', error.message);

        if (error.response?.status === 401) {
            throw new Error('Invalid ElevenLabs API key — verifica ELEVENLABS_API_KEY en .env');
        }
        if (error.response?.status === 422) {
            const detail = error.response.data ? Buffer.from(error.response.data).toString() : '';
            throw new Error(`ElevenLabs validation error: ${detail}`);
        }
        if (error.response?.status === 429) {
            throw new Error('Rate limit exceeded — espera unos segundos e intenta de nuevo');
        }
        if (error.code === 'ECONNABORTED') {
            throw new Error('Request timeout — intenta de nuevo');
        }

        throw new Error(`TTS generation failed: ${error.message}`);
    }
}
