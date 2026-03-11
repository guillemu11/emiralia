/**
 * Translation tool for Emiralia — UAE real estate content.
 * Uses Claude API (Sonnet 4.6) with injected real estate glossary.
 *
 * Usage (single text):
 *   node tools/translate/translate.js --text="3BR apartment" --from=en --to=es-ES
 *
 * Usage (stdin pipe):
 *   echo "Long description" | node tools/translate/translate.js --from=en --to=es-MX
 *
 * Usage (batch):
 *   node tools/translate/translate.js --batch=input.json --from=en --to=es-CO --output=output.json
 *
 * Run: node tools/translate/translate.js --help
 */

import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { REAL_ESTATE_GLOSSARY, VARIANTS } from './glossary.js';
import { trackSkill } from '../workspace-skills/skill-tracker.js';

// ── Config ──────────────────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;

const SUPPORTED_PAIRS = new Set([
    'en→es-ES', 'en→es-MX', 'en→es-CO',
    'es→en', 'es-ES→en', 'es-MX→en', 'es-CO→en',
]);

// ── Prompt building ─────────────────────────────────────────────────────────

function buildGlossaryContext(targetVariant) {
    if (!targetVariant.startsWith('es')) return '';

    const lines = Object.entries(REAL_ESTATE_GLOSSARY)
        .map(([en, variants]) => {
            const local = variants[targetVariant] ?? variants['es-ES'];
            return `- "${en}" → "${local}"`;
        });

    return `\nGlosario inmobiliario para ${VARIANTS[targetVariant]}:\n${lines.join('\n')}`;
}

const VOICE_RULES = {
    'es-ES': 'Usa "vosotros" para el plural informal. Usa "piso" para apartamento. Usa "promotora" para developer. Tono formal pero cercano, natural para Espana.',
    'es-MX': 'Usa "ustedes" siempre. Usa "departamento" para apartamento. Usa "desarrolladora" para developer. Usa "enganche" para down payment. Tono profesional, natural para Mexico.',
    'es-CO': 'Usa "ustedes" siempre. Usa "apartamento". Usa "constructora" para developer. Usa "cuota inicial" para down payment. Usa "parqueadero" para parking. Tono formal, natural para Colombia.',
    'en': 'Use professional British/American English. Keep real estate terminology precise.',
};

function buildSystemPrompt(from, to, mode) {
    const glossary = buildGlossaryContext(to);
    const voice = VOICE_RULES[to] ?? '';

    const modeInstruction = mode === 'property'
        ? 'Este es contenido inmobiliario. La precision en datos (precio, superficie, numero de habitaciones) es CRITICA. Nunca interpretes ni redondees valores numericos. Copia los numeros exactamente. Manten los nombres de zonas y developers sin traducir (ej: "Dubai Marina", "Emaar").'
        : 'Este es contenido general de marketing inmobiliario. Prioriza naturalidad y fluidez.';

    return `Eres un traductor especializado en contenido inmobiliario del mercado de Emiratos Arabes Unidos (EAU).

${modeInstruction}

Idioma destino: ${VARIANTS[to] ?? to}
${voice}
${glossary}

REGLAS:
1. Traduce UNICAMENTE lo solicitado. No anadas comentarios, explicaciones ni texto adicional.
2. Conserva el formato original (saltos de linea, listas, etc.).
3. Los numeros, precios en AED, porcentajes y fechas NO se modifican.
4. Los nombres propios (zonas de Dubai, developers, edificios) NO se traducen.
5. Los acronimos UAE, RERA, DLD, AED, ROI se mantienen en ingles.
6. Si el texto contiene HTML basico, conservalo tal cual.
7. Responde SOLO con la traduccion, sin explicaciones ni comentarios.`;
}

// ── Core translation ────────────────────────────────────────────────────────

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Translate a single text.
 * @param {object} opts
 * @param {string} opts.text   - Text to translate (required)
 * @param {string} opts.from   - Source language: en | es (default: en)
 * @param {string} opts.to     - Target variant: es-ES | es-MX | es-CO | en (default: es-ES)
 * @param {string} opts.mode   - property | general (default: property)
 * @returns {Promise<string>}  - Translated text
 */
export async function translate({ text, from = 'en', to = 'es-ES', mode = 'property' }) {
    trackSkill('translation-agent', 'traducir', 'content', 'completed').catch(() => {});
    if (!text?.trim()) throw new Error('El texto a traducir no puede estar vacio.');

    // Normalize: es-ES/es-MX/es-CO → es for pair validation when going to English
    const fromNorm = from.startsWith('es') ? 'es' : from;
    const toNorm = to.startsWith('es') ? to : to;
    const pair = `${fromNorm}→${toNorm}`;

    if (!SUPPORTED_PAIRS.has(pair) && !SUPPORTED_PAIRS.has(`${from}→${to}`)) {
        throw new Error(`Par no soportado: ${from}→${to}. Soportados: ${[...SUPPORTED_PAIRS].join(', ')}`);
    }

    const systemPrompt = buildSystemPrompt(from, to, mode);

    const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: 'user', content: text }],
    });

    return response.content[0].text;
}

/**
 * Translate a batch of items.
 * @param {object} opts
 * @param {Array<{id: string, text: string}>} opts.items - Items to translate
 * @param {string} opts.from   - Source language
 * @param {string} opts.to     - Target variant
 * @param {string} opts.mode   - property | general
 * @returns {Promise<Array<{id: string, original: string, translated: string, variant: string}>>}
 */
export async function translateBatch({ items, from = 'en', to = 'es-ES', mode = 'property' }) {
    const results = [];
    const total = items.length;

    for (let i = 0; i < total; i++) {
        const item = items[i];
        console.log(`[Batch] ${i + 1}/${total} — id: ${item.id}`);

        try {
            const translated = await translate({ text: item.text, from, to, mode });
            results.push({
                id: item.id,
                original: item.text,
                translated,
                variant: to,
            });
        } catch (err) {
            console.error(`[Batch] Error en item ${item.id}: ${err.message}`);
            results.push({
                id: item.id,
                original: item.text,
                translated: null,
                variant: to,
                error: err.message,
            });
        }
    }

    return results;
}

// ── File I/O helpers ────────────────────────────────────────────────────────

async function readBatchFile(filePath) {
    const ext = extname(filePath).toLowerCase();
    const raw = await readFile(filePath, 'utf8');

    if (ext === '.json') {
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) throw new Error('El JSON debe ser un array de {id, text}.');
        return data;
    }

    if (ext === '.csv') {
        const lines = raw.trim().split('\n');
        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        const idIdx = header.indexOf('id');
        const textIdx = header.indexOf('text');
        if (idIdx === -1 || textIdx === -1) throw new Error('CSV debe tener columnas: id,text');

        return lines.slice(1).map(line => {
            // Simple CSV parsing (handles quoted fields with commas)
            const match = line.match(/^([^,]*),(.*)$/);
            if (!match) return null;
            return {
                id: match[1].trim().replace(/^"|"$/g, ''),
                text: match[2].trim().replace(/^"|"$/g, ''),
            };
        }).filter(Boolean);
    }

    throw new Error(`Formato no soportado: ${ext}. Usa .json o .csv`);
}

async function writeBatchOutput(filePath, results) {
    const ext = extname(filePath).toLowerCase();

    if (ext === '.json') {
        await writeFile(filePath, JSON.stringify(results, null, 2), 'utf8');
        return;
    }

    if (ext === '.csv') {
        const header = 'id,original,translated,variant,error';
        const rows = results.map(r => {
            const escape = (s) => s ? `"${String(s).replace(/"/g, '""')}"` : '';
            return [escape(r.id), escape(r.original), escape(r.translated), escape(r.variant), escape(r.error || '')].join(',');
        });
        await writeFile(filePath, [header, ...rows].join('\n'), 'utf8');
        return;
    }

    // Default to JSON
    await writeFile(filePath + '.json', JSON.stringify(results, null, 2), 'utf8');
}

// ── CLI ─────────────────────────────────────────────────────────────────────

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('translate/translate.js');

if (isDirectRun) {
    const args = process.argv.slice(2);

    // Parse --flag=value args
    const getArg = (flag) => {
        const entry = args.find(a => a.startsWith(`${flag}=`));
        return entry ? entry.split('=').slice(1).join('=') : null;
    };

    // Help
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Emiralia Translation Tool
=========================

Traduccion individual:
  node tools/translate/translate.js --text="texto" --from=en --to=es-ES [--mode=property|general]

Pipe (textos largos):
  echo "texto largo" | node tools/translate/translate.js --from=en --to=es-MX

Traduccion por lotes:
  node tools/translate/translate.js --batch=input.json --from=en --to=es-CO --output=output.json

Opciones:
  --text=TEXT       Texto a traducir
  --from=LANG       Idioma origen: en | es (default: en)
  --to=VARIANT      Variante destino: es-ES | es-MX | es-CO | en (default: es-ES)
  --mode=MODE       property (precision numerica) | general (default: property)
  --batch=FILE      Archivo JSON o CSV con items a traducir [{id, text}]
  --output=FILE     Archivo de salida para batch (JSON o CSV)

Pares soportados: en→es-ES, en→es-MX, en→es-CO, es→en
`);
        process.exit(0);
    }

    const from = getArg('--from') ?? 'en';
    const to = getArg('--to') ?? 'es-ES';
    const mode = getArg('--mode') ?? 'property';
    const batchFile = getArg('--batch');
    const outputFile = getArg('--output');

    try {
        // ── Batch mode ──
        if (batchFile) {
            console.log(`[Translate] Batch mode: ${batchFile} → ${to} (${mode})`);
            const items = await readBatchFile(batchFile);
            console.log(`[Translate] ${items.length} items a traducir\n`);

            const results = await translateBatch({ items, from, to, mode });

            const outPath = outputFile ?? batchFile.replace(/\.[^.]+$/, `-${to}.json`);
            await writeBatchOutput(outPath, results);

            const ok = results.filter(r => r.translated).length;
            const fail = results.filter(r => r.error).length;
            console.log(`\n[Translate] Completado: ${ok} ok, ${fail} errores → ${outPath}`);
            process.exit(0);
        }

        // ── Single text mode ──
        let text = getArg('--text');

        // Read from stdin if no --text and stdin is piped
        if (!text && !process.stdin.isTTY) {
            const chunks = [];
            for await (const chunk of process.stdin) chunks.push(chunk);
            text = Buffer.concat(chunks).toString('utf8').trim();
        }

        if (!text) {
            console.error('Error: Proporciona --text="..." o envía texto por stdin.');
            console.error('Usa --help para ver todas las opciones.');
            process.exit(1);
        }

        console.log(`[Translate] ${from} → ${to} (${mode})`);
        console.log(`[Translate] Input: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}\n`);

        const result = await translate({ text, from, to, mode });

        console.log('--- TRADUCCION ------------------------------------------------\n');
        console.log(result);
        console.log('\n----------------------------------------------------------------');
    } catch (err) {
        console.error(`[Translate] Error: ${err.message}`);
        process.exit(1);
    }
}
