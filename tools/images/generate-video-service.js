/**
 * Creative Studio — Video Service
 * Orquestador del pipeline completo de Avatar: TTS → LipSync → asset final.
 *
 * También expone shortcuts para Text-to-Video e Image-to-Video directos.
 */

import { generateTTS } from './generate-tts.js';
import { generateLipsync } from './generate-lipsync.js';
import { generateTextToVideo } from './generate-video.js';
import { generateImageToVideo } from './generate-video.js';

// Imágenes de avatares (URLs públicas configurables por .env)
const AVATAR_IMAGES = {
    fernando: process.env.FERNANDO_AVATAR_URL || 'https://emiralia.com/avatars/fernando.jpg',
    yolanda:  process.env.YOLANDA_AVATAR_URL  || 'https://emiralia.com/avatars/yolanda.jpg',
};

// IDs de voz por avatar — ElevenLabs (configurables por .env)
const VOICE_IDS = {
    fernando: process.env.ELEVENLABS_FERNANDO_VOICE_ID || 'cjVigY5qzO86Huf0OWal',
    yolanda:  process.env.ELEVENLABS_YOLANDA_VOICE_ID  || 'XrExE9yKIg1WjnnlVkGX',
};

/**
 * Pipeline completo: script → TTS → LipSync → video con avatar
 *
 * Flujo:
 *  1. Genera audio a partir del script con la voz del avatar
 *  2. Genera video de lip sync combinando el audio con la imagen del avatar
 *  3. Retorna URLs de ambos assets (audio + video)
 *
 * @param {Object} params
 * @param {string} params.script            - Texto del guión a locutar
 * @param {string} params.avatar            - Nombre del avatar ('fernando' | 'yolanda')
 * @param {string} [params.format='9:16']   - Aspect ratio del video de salida
 * @param {number} [params.speed=1.0]       - Velocidad del habla (0.5–2.0)
 * @returns {Promise<Object>} { success, videoUrl, audioUrl, avatar, format }
 */
export async function generateAvatarVideo({ script, avatar, format = '9:16', speed = 1.0, tone = null, lipsyncModel = null }) {
    console.log(`[VideoService] Iniciando pipeline avatar: ${avatar}`);

    // Step 1: TTS — convertir script a audio
    const voiceId = VOICE_IDS[avatar] || VOICE_IDS.fernando;
    const ttsResult = await generateTTS({ script, voiceId, speed });
    console.log(`[VideoService] TTS done: ${ttsResult.url}`);

    // Step 2: Lip Sync — combinar audio con imagen del avatar
    const avatarImageUrl = AVATAR_IMAGES[avatar];
    if (!avatarImageUrl) {
        throw new Error(`Avatar image URL not configured for: ${avatar}`);
    }

    const lipsyncPrompt = tone
        ? `Natural professional ${tone} lip sync for ${avatar} avatar, smooth animation`
        : `Natural professional lip sync for ${avatar} avatar, smooth animation`;

    const lipsyncResult = await generateLipsync({
        audioUrl: ttsResult.url,
        avatarImageUrl,
        format,
        prompt: lipsyncPrompt,
        resolution: '480p',
        model: lipsyncModel || undefined,
    });
    console.log(`[VideoService] LipSync done: ${lipsyncResult.url}`);

    return {
        success: true,
        videoUrl: lipsyncResult.url,
        audioUrl: ttsResult.url,
        avatar,
        format,
    };
}

// Re-exportar para uso directo desde este módulo
export { generateTextToVideo, generateImageToVideo };
