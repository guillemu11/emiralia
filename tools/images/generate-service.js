/**
 * Shared Image Generation Service
 *
 * Wraps KIE AI Nano Banana 2 generation + DB tracking + agent memory update.
 * Used by both Dashboard and Telegram channels.
 */

import { generateImage } from './generate-image.js';
import { trackGeneration } from './track-generation.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Cost per image by quality tier (KIE AI Nano Banana 2 pricing)
const COST_MAP = {
  standard: 0.04, // 1K resolution
  hd: 0.06,       // 2K resolution
};

/**
 * Parse image generation arguments from a string.
 * Extracts --size and --quality flags, rest is the prompt.
 *
 * @param {string} argsString - Raw arguments (e.g. '"luxury villa" --size=square --quality=hd')
 * @returns {{ prompt: string, size: string, quality: string }}
 */
export function parseImageArgs(argsString) {
  if (!argsString) return { prompt: '', size: 'square', quality: 'standard' };

  let remaining = argsString.trim();
  let size = 'square';
  let quality = 'standard';

  // Extract --size=...
  const sizeMatch = remaining.match(/--size=(\S+)/);
  if (sizeMatch) {
    size = sizeMatch[1];
    remaining = remaining.replace(sizeMatch[0], '');
  }

  // Extract --quality=...
  const qualityMatch = remaining.match(/--quality=(\S+)/);
  if (qualityMatch) {
    quality = qualityMatch[1];
    remaining = remaining.replace(qualityMatch[0], '');
  }

  // Clean up prompt: remove extra whitespace and surrounding quotes
  let prompt = remaining.trim().replace(/^["']|["']$/g, '');

  return { prompt, size, quality };
}

/**
 * Generate an image end-to-end: DALL-E 3 + tracking + memory.
 *
 * @param {Object} params
 * @param {string} params.prompt - Image description
 * @param {string} [params.size='square'] - square|landscape|portrait|wide
 * @param {string} [params.quality='standard'] - standard|hd
 * @param {string} [params.generatedBy='unknown'] - Source identifier (e.g. 'dashboard-user', 'telegram:123')
 * @param {string} [params.agentId='content-agent'] - Agent that triggered the generation
 * @returns {Promise<Object>} Full result with url, filename, path, cost, etc.
 */
export async function generateImageService({ prompt, size = 'square', quality = 'standard', model = 'nano-banana-2', generatedBy = 'unknown', agentId = 'content-agent' }) {
  if (!prompt) {
    throw new Error('Prompt is required');
  }

  // 1. Generate image via KIE AI
  const result = await generateImage(prompt, { size, quality, model });

  // 2. Calculate cost
  const cost = COST_MAP[quality] || 0.04;

  // 3. Track in database (non-blocking — failure here shouldn't break the flow)
  await trackGeneration({
    filename: result.filename,
    prompt: result.prompt,
    model: result.model,
    size: result.size,
    path: result.path,
    url: result.url,
    generatedBy,
    estimatedCost: cost,
  });

  // 4. Update agent memory (best-effort)
  try {
    const now = new Date().toISOString();
    await execAsync(`node tools/db/memory.js set ${agentId} last_image_url "${JSON.stringify(result.url)}" shared`, { cwd: process.cwd(), timeout: 5000 });
    await execAsync(`node tools/db/memory.js set ${agentId} last_image_generated_at "${JSON.stringify(now)}" shared`, { cwd: process.cwd(), timeout: 5000 });
    await execAsync(`node tools/db/memory.js set ${agentId} last_task_completed '"generar-imagen"' shared`, { cwd: process.cwd(), timeout: 5000 });
  } catch (err) {
    console.warn('[GenerateService] Memory update failed (non-critical):', err.message);
  }

  return {
    success: true,
    url: result.url,
    filename: result.filename,
    path: result.path,
    prompt: result.prompt,
    revisedPrompt: result.revisedPrompt,
    size: result.size,
    model: result.model,
    quality: result.quality,
    cost,
    generatedAt: result.generatedAt,
  };
}
