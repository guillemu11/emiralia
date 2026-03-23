/**
 * Setup Avatares — Fernando & Yolanda
 *
 * Script one-time de configuración. Genera imágenes de avatar con KIE AI,
 * crea audio samples de voz, lista las voces disponibles de fish-speech,
 * y emite las 4 líneas listas para pegar en .env.
 *
 * Uso:
 *   node tools/images/setup-avatars.js              → genera todo
 *   node tools/images/setup-avatars.js --voices-only → solo lista voces
 *
 * Output generado:
 *   apps/website/public/avatars/fernando.jpg
 *   apps/website/public/avatars/yolanda.jpg
 *   apps/website/public/avatars/fernando-sample.mp3
 *   apps/website/public/avatars/yolanda-sample.mp3
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateTTS } from './generate-tts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const KIE_AI_API_KEY = process.env.KIE_AI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const KIE_AI_BASE_URL = 'https://api.kie.ai/api/v1';
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const KIE_IMAGE_MODEL = 'nano-banana-2';
const AVATARS_DIR = path.resolve(__dirname, '../../apps/website/public/avatars');

// ─── Avatar Config ─────────────────────────────────────────────────────────────

const AVATAR_CONFIG = {
    fernando: {
        label: 'Fernando',
        accent: 'es-MX',
        accentKeywords: ['mexico', 'mx', 'es-mx', 'mexican', 'latin'],
        prompt: 'professional Mexican male real estate investment advisor, 38 years old, business casual suit jacket, confident and analytical expression, dark hair, neutral light studio background, bust shot portrait, photorealistic, high quality, 8K',
        sampleScript: 'Hola, soy Fernando. Analizo el mercado inmobiliario de Emiratos para que tú tomes las mejores decisiones de inversión con datos reales.',
        imageFile: 'fernando.jpg',
        audioFile: 'fernando-sample.mp3',
        envImageKey: 'FERNANDO_AVATAR_URL',
        envVoiceKey: 'ELEVENLABS_FERNANDO_VOICE_ID',
    },
    yolanda: {
        label: 'Yolanda',
        accent: 'es-ES',
        accentKeywords: ['spain', 'es-es', 'spain', 'españa', 'castellano', 'european'],
        prompt: 'professional Spanish woman from Spain, 34 years old, elegant professional attire, warm authoritative smile, dark hair, luxury studio background, bust shot portrait, photorealistic, high quality, 8K',
        sampleScript: 'Hola, soy Yolanda. Te cuento todo lo que necesitas saber para vivir e invertir en las comunidades más exclusivas de Emiratos Árabes Unidos.',
        imageFile: 'yolanda.jpg',
        audioFile: 'yolanda-sample.mp3',
        envImageKey: 'YOLANDA_AVATAR_URL',
        envVoiceKey: 'ELEVENLABS_YOLANDA_VOICE_ID',
    },
};

// ─── Voice Discovery ────────────────────────────────────────────────────────────

async function fetchVoices() {
    if (!ELEVENLABS_API_KEY) {
        console.log('[Voices] ELEVENLABS_API_KEY no configurado — no se puede listar voces');
        return null;
    }

    try {
        console.log(`[Voices] Consultando ElevenLabs: ${ELEVENLABS_BASE_URL}/voices`);
        const res = await axios.get(`${ELEVENLABS_BASE_URL}/voices`, {
            headers: { 'xi-api-key': ELEVENLABS_API_KEY },
            timeout: 15000,
        });
        const voices = res.data?.voices;
        if (Array.isArray(voices) && voices.length > 0) {
            console.log(`[Voices] ${voices.length} voces encontradas en ElevenLabs`);
            return voices;
        }
    } catch (err) {
        if (err.response?.status === 401) {
            console.error('[Voices] ELEVENLABS_API_KEY inválida');
        } else {
            console.error('[Voices] Error al consultar ElevenLabs:', err.message);
        }
    }
    return null;
}

function categorizeVoices(voices, accentKeywords) {
    if (!voices) return [];
    return voices.filter(v => {
        const text = JSON.stringify(v).toLowerCase();
        return accentKeywords.some(kw => text.includes(kw));
    });
}

function filterSpanishVoices(voices) {
    if (!voices) return [];
    return voices.filter(v => {
        const text = JSON.stringify(v).toLowerCase();
        return text.includes('spanish') || text.includes(' es') ||
               text.includes('_es') || text.includes('-es') ||
               text.includes('español') || text.includes('spa') ||
               text.includes('es-mx') || text.includes('es-es') ||
               text.includes('latino') || text.includes('latin');
    });
}

function printVoiceTable(voices) {
    if (!voices || voices.length === 0) {
        console.log('\n  No voices found. Set ELEVENLABS_FERNANDO_VOICE_ID and ELEVENLABS_YOLANDA_VOICE_ID manually.');
        return;
    }

    const spanish = filterSpanishVoices(voices);
    const display = spanish.length > 0 ? spanish : voices;

    console.log(`\n${'─'.repeat(70)}`);
    if (spanish.length > 0) {
        console.log(`  VOCES EN ESPAÑOL (${spanish.length} de ${voices.length} total):`);
    } else {
        console.log(`  TODAS LAS VOCES disponibles (${voices.length}) — no se encontraron voces es-*:`);
    }
    console.log(`${'─'.repeat(70)}`);

    for (const avatarKey of ['fernando', 'yolanda']) {
        const cfg = AVATAR_CONFIG[avatarKey];
        const matches = categorizeVoices(display, cfg.accentKeywords);
        const suggested = matches[0];

        console.log(`\n  ${cfg.label} (${cfg.accent}):`);
        if (suggested) {
            const id = suggested.id || suggested.voice_id || suggested.voiceId || JSON.stringify(suggested).substring(0, 60);
            console.log(`    ** SUGERIDO **: ${id}`);
        }
        if (matches.length > 1) {
            matches.slice(1).forEach(v => {
                const id = v.id || v.voice_id || v.voiceId || JSON.stringify(v).substring(0, 60);
                console.log(`    Alternativa:   ${id}`);
            });
        }
        if (matches.length === 0) {
            console.log(`    (sin match exacto — revisar lista completa arriba)`);
        }
    }

    // Show all as raw if needed
    if (spanish.length === 0) {
        console.log('\n  Lista completa (IDs):');
        voices.slice(0, 30).forEach(v => {
            const id = v.id || v.voice_id || v.voiceId || v.name || JSON.stringify(v).substring(0, 80);
            console.log(`    - ${id}`);
        });
    }
    console.log(`${'─'.repeat(70)}\n`);
}

// ─── Image Generation ────────────────────────────────────────────────────────────

async function createImageTask(prompt) {
    const res = await axios.post(
        `${KIE_AI_BASE_URL}/jobs/createTask`,
        {
            model: KIE_IMAGE_MODEL,
            input: {
                prompt,
                aspect_ratio: '1:1',
                resolution: '1K',
                output_format: 'jpg',
            },
        },
        {
            headers: {
                'Authorization': `Bearer ${KIE_AI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        }
    );

    if (res.data.code !== 200) {
        throw new Error(`Task creation failed: ${res.data.msg}`);
    }

    const taskId = res.data.data?.taskId || res.data.data?.task_id;
    if (!taskId) throw new Error('No taskId returned from KIE AI');
    return taskId;
}

async function pollAndDownload(taskId, label, timeoutMs = 120000) {
    const start = Date.now();
    let attempts = 0;

    while (Date.now() - start < timeoutMs) {
        await new Promise(r => setTimeout(r, 3000));
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
        console.log(`[${label}] Poll #${attempts}: ${state}`);

        if (state === 'success') {
            let cdnUrl;
            try {
                const parsed = JSON.parse(data.resultJson || '{}');
                cdnUrl = (parsed.resultUrls || [])[0];
            } catch { /* ignore */ }

            if (!cdnUrl) throw new Error(`No CDN URL in resultJson for ${label}`);

            console.log(`[${label}] CDN URL: ${cdnUrl}`);

            // Download image buffer for local save
            const imgRes = await axios.get(cdnUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
            });

            return { cdnUrl, buffer: Buffer.from(imgRes.data) };
        }

        if (state === 'fail') {
            throw new Error(data.failMsg || `KIE AI generation failed for ${label}`);
        }
        // states: waiting, queuing, generating → continue polling
    }

    throw new Error(`Generation timeout after ${timeoutMs / 1000}s for ${label}`);
}

async function generateAvatar(avatarKey) {
    const cfg = AVATAR_CONFIG[avatarKey];
    console.log(`\n[${cfg.label}] Iniciando generación de imagen...`);

    const taskId = await createImageTask(cfg.prompt);
    console.log(`[${cfg.label}] Task ID: ${taskId}`);

    const { cdnUrl, buffer } = await pollAndDownload(taskId, cfg.label);

    // Save locally to avatars dir
    await fs.mkdir(AVATARS_DIR, { recursive: true });
    const localPath = path.join(AVATARS_DIR, cfg.imageFile);
    await fs.writeFile(localPath, buffer);

    console.log(`[${cfg.label}] Imagen guardada: ${localPath}`);
    return { cdnUrl, localPath };
}

// ─── Audio Sample Generation ─────────────────────────────────────────────────────

async function generateAudioSample(avatarKey, voiceId) {
    const cfg = AVATAR_CONFIG[avatarKey];
    console.log(`\n[${cfg.label}] Generando audio sample con voz: ${voiceId}`);

    const result = await generateTTS({
        script: cfg.sampleScript,
        voiceId,
        speed: 1.0,
    });

    // Copy from generated/ to avatars/ with avatar filename
    const destPath = path.join(AVATARS_DIR, cfg.audioFile);
    await fs.mkdir(AVATARS_DIR, { recursive: true });
    await fs.copyFile(result.path, destPath);

    console.log(`[${cfg.label}] Audio guardado: ${destPath}`);
    return destPath;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    const voicesOnly = process.argv.includes('--voices-only');
    const skipImages = process.argv.includes('--skip-images');
    const skipAudio  = process.argv.includes('--skip-audio');

    console.log('\n' + '═'.repeat(70));
    console.log('  SETUP AVATARES — Fernando & Yolanda');
    console.log('  Emiralia Creative Studio');
    console.log('═'.repeat(70));

    if (!KIE_AI_API_KEY) {
        console.error('\n❌  KIE_AI_API_KEY no configurado en .env (necesario para imágenes)\n');
        if (!voicesOnly) process.exit(1);
    }

    // ── Step 1: List voices ────────────────────────────────────────────────────
    console.log('\n📢  Consultando voces disponibles en ElevenLabs...');
    const voices = await fetchVoices();

    if (!voices) {
        console.log('\n⚠️   No se pudo obtener lista de voces. Posibles motivos:');
        console.log('     - ELEVENLABS_API_KEY no configurada en .env');
        console.log('     - Añade tu API key de ElevenLabs (elevenlabs.io → Profile → API Key)');
        console.log('     - Puedes configurar manualmente ELEVENLABS_FERNANDO_VOICE_ID y ELEVENLABS_YOLANDA_VOICE_ID\n');
    } else {
        printVoiceTable(voices);
    }

    // Extract suggested voice IDs — env vars toman precedencia sobre auto-detección
    let fernandoVoiceId = process.env.ELEVENLABS_FERNANDO_VOICE_ID || '<SET_MANUALLY>';
    let yolandaVoiceId  = process.env.ELEVENLABS_YOLANDA_VOICE_ID  || '<SET_MANUALLY>';

    if (voices) {
        const spanish = filterSpanishVoices(voices);
        const display = spanish.length > 0 ? spanish : voices;

        // Solo auto-detectar si no hay env var configurada
        if (fernandoVoiceId === '<SET_MANUALLY>') {
            const fernandoMatches = categorizeVoices(display, AVATAR_CONFIG.fernando.accentKeywords);
            if (fernandoMatches[0]) {
                const v = fernandoMatches[0];
                fernandoVoiceId = v.id || v.voice_id || v.voiceId || JSON.stringify(v);
            }
        }
        if (yolandaVoiceId === '<SET_MANUALLY>') {
            const yolandaMatches = categorizeVoices(display, AVATAR_CONFIG.yolanda.accentKeywords);
            if (yolandaMatches[0]) {
                const v = yolandaMatches[0];
                yolandaVoiceId = v.id || v.voice_id || v.voiceId || JSON.stringify(v);
            }
        }
    }

    if (voicesOnly) {
        console.log('\nModo --voices-only completado.');
        console.log('Ejecuta sin flags para generar imágenes y audio samples.\n');
        return;
    }

    // ── Step 2: Generate images in parallel ───────────────────────────────────
    let fernandoImageUrl = '<ERROR>';
    let yolandaImageUrl  = '<ERROR>';

    if (!skipImages) {
        console.log('\n🖼️   Generando imágenes de avatar (paralelo)...');
        const [fernandoResult, yolandaResult] = await Promise.all([
            generateAvatar('fernando'),
            generateAvatar('yolanda'),
        ]);
        fernandoImageUrl = fernandoResult.cdnUrl;
        yolandaImageUrl  = yolandaResult.cdnUrl;
        console.log('\n✅  Imágenes generadas');
    } else {
        console.log('\n⏭️   --skip-images: omitiendo generación de imágenes');
    }

    // ── Step 3: Generate audio samples in parallel ────────────────────────────
    if (!skipAudio) {
        // Only generate audio if we have valid voice IDs
        if (fernandoVoiceId === '<SET_MANUALLY>' || yolandaVoiceId === '<SET_MANUALLY>') {
            console.log('\n⚠️   Voice IDs no detectados automáticamente — omitiendo audio samples.');
            console.log('     Configura ELEVENLABS_FERNANDO_VOICE_ID y ELEVENLABS_YOLANDA_VOICE_ID en .env,');
            console.log('     luego ejecuta: node tools/images/setup-avatars.js --skip-images');
        } else {
            console.log('\n🎙️   Generando audio samples (paralelo)...');
            await Promise.all([
                generateAudioSample('fernando', fernandoVoiceId),
                generateAudioSample('yolanda',  yolandaVoiceId),
            ]);
            console.log('\n✅  Audio samples generados');
        }
    } else {
        console.log('\n⏭️   --skip-audio: omitiendo generación de audio');
    }

    // ── Step 4: Print .env block ───────────────────────────────────────────────
    console.log('\n' + '═'.repeat(70));
    console.log('  RESULTADO — Añade estas 4 líneas a tu .env:');
    console.log('═'.repeat(70));
    console.log('');
    console.log(`FERNANDO_AVATAR_URL=${fernandoImageUrl}`);
    console.log(`ELEVENLABS_FERNANDO_VOICE_ID=${fernandoVoiceId}`);
    console.log(`YOLANDA_AVATAR_URL=${yolandaImageUrl}`);
    console.log(`ELEVENLABS_YOLANDA_VOICE_ID=${yolandaVoiceId}`);
    console.log('');
    console.log('═'.repeat(70));
    console.log('');
    console.log('Archivos locales:');
    console.log(`  Fernando imagen: ${path.join(AVATARS_DIR, 'fernando.jpg')}`);
    console.log(`  Yolanda imagen:  ${path.join(AVATARS_DIR, 'yolanda.jpg')}`);
    console.log(`  Fernando audio:  ${path.join(AVATARS_DIR, 'fernando-sample.mp3')}`);
    console.log(`  Yolanda audio:   ${path.join(AVATARS_DIR, 'yolanda-sample.mp3')}`);
    console.log('');
    console.log('⚠️  NOTA: Las CDN URLs pueden expirar (días/semanas).');
    console.log('   Si el LipSync falla, re-ejecuta este script para regenerar.');
    console.log('');
    console.log('Siguiente paso:');
    console.log('  1. Pega las 4 líneas en tu .env');
    console.log('  2. Reinicia el servidor: node apps/dashboard/server.js');
    console.log('  3. Verifica: curl http://localhost:3001/api/creative/config');
    console.log('');
}

main().catch(err => {
    console.error('\n❌  Error fatal:', err.message);
    process.exit(1);
});
