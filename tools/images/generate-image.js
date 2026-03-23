/**
 * Nano Banana — AI Image Generator for Marketing Content
 *
 * Uses KIE AI Nano Banana 2 (Google Gemini) to generate
 * professional visual content for social media, web banners, and editorial.
 */

import axios from 'axios';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { upload, generateKey } from '../storage/storage-service.js';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const KIE_AI_API_KEY = process.env.KIE_AI_API_KEY;
const KIE_AI_BASE_URL = 'https://api.kie.ai/api/v1';
const FLUX_MODELS = ['flux-kontext-pro', 'flux-kontext-max'];

// Aspect ratios for KIE AI (mapped from size names)
const ASPECT_RATIOS = {
  square: '1:1',       // Instagram posts
  landscape: '16:9',   // Facebook, LinkedIn, web banners
  portrait: '9:16',    // Instagram stories
  wide: '16:9'         // Hero images, headers
};

// Resolution by quality tier
const RESOLUTIONS = {
  standard: '1K',
  hd: '2K'
};

/**
 * Generate AI image from text prompt using KIE AI Nano Banana 2
 *
 * @param {string} prompt - Text description of image to generate
 * @param {Object} options - Generation options
 * @param {string} options.size - Image size: square|landscape|portrait|wide
 * @param {string} options.quality - Quality level: standard|hd
 * @param {string} options.filename - Custom filename (optional)
 * @returns {Promise<Object>} Generation result with path, URL, metadata
 */
export async function generateImage(prompt, options = {}) {
  if (!KIE_AI_API_KEY) {
    throw new Error('KIE_AI_API_KEY not configured in .env');
  }

  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Valid prompt is required');
  }

  const {
    size = 'square',
    quality = 'standard',
    model = 'nano-banana-2',
  } = options;

  const aspectRatio = ASPECT_RATIOS[size] || '1:1';
  const resolution = RESOLUTIONS[quality] || '1K';
  const isFlux = FLUX_MODELS.includes(model);
  const logPrefix = isFlux ? `[${model}]` : '[Nano Banana]';

  console.log(`${logPrefix} Generating ${size} (${aspectRatio}) image...`);
  console.log(`${logPrefix} Model: ${model}, Quality: ${quality}`);
  console.log(`${logPrefix} Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);

  try {
    let taskId;

    if (isFlux) {
      // Flux Kontext models use a different endpoint with camelCase params
      // POST /flux/kontext/generate → returns taskId, then poll /jobs/recordInfo
      const createRes = await axios.post(
        `${KIE_AI_BASE_URL}/flux/kontext/generate`,
        {
          model,
          input: {
            prompt,
            aspectRatio,         // camelCase for flux endpoint
            outputFormat: 'jpg', // camelCase for flux endpoint
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${KIE_AI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (createRes.data.code !== 200) {
        throw new Error(`Task creation failed: ${createRes.data.msg}`);
      }

      taskId = createRes.data.data?.taskId || createRes.data.data?.task_id;
      if (!taskId) {
        throw new Error('No taskId returned from KIE AI flux endpoint');
      }
    } else {
      // Standard KIE AI models: POST /jobs/createTask
      const createRes = await axios.post(
        `${KIE_AI_BASE_URL}/jobs/createTask`,
        {
          model,
          input: {
            prompt,
            aspect_ratio: aspectRatio,
            resolution,
            output_format: 'jpg'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${KIE_AI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (createRes.data.code !== 200) {
        throw new Error(`Task creation failed: ${createRes.data.msg}`);
      }

      taskId = createRes.data.data?.taskId || createRes.data.data?.task_id;
      if (!taskId) {
        throw new Error('No taskId returned from KIE AI');
      }
    }

    console.log(`${logPrefix} Task created: ${taskId}`);

    // Step 2: Poll for result (same /jobs/recordInfo endpoint for all models)
    const result = await pollResult(taskId);

    // Step 3: Download image from URL
    const imageUrl = result.result[0]?.image;
    if (!imageUrl) {
      throw new Error('No image URL in KIE AI result');
    }

    console.log(`${logPrefix} Downloading image from: ${imageUrl}`);
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 60000
    });
    const imageBuffer = Buffer.from(imageResponse.data);

    // Step 4: Upload via storage service (local or R2)
    const key = generateKey('creative', 'jpg');
    const { url: publicUrl } = await upload(imageBuffer, key, 'image/jpeg');

    // Step 5: Generate thumbnail (400x300) if sharp is available
    let thumbnailUrl = publicUrl;
    try {
      const sharp = (await import('sharp')).default;
      const thumbBuffer = await sharp(imageBuffer)
        .resize(400, 300, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();
      const thumbKey = key.replace(/\.jpg$/, '_thumb.jpg');
      const { url: thumbUrl } = await upload(thumbBuffer, thumbKey, 'image/jpeg');
      thumbnailUrl = thumbUrl;
      console.log(`${logPrefix} ✓ Thumbnail: ${thumbnailUrl}`);
    } catch {
      // sharp not installed — thumbnail falls back to full-res URL
    }

    console.log(`${logPrefix} ✓ Public URL: ${publicUrl}`);

    return {
      success: true,
      url: publicUrl,
      thumbnailUrl,
      storageKey: key,
      filename: path.basename(key),
      prompt,
      revisedPrompt: null,
      size: aspectRatio,
      model,
      quality,
      generatedAt: new Date()
    };

  } catch (error) {
    console.error(`${logPrefix} Generation failed:`, error.message);

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

    throw new Error(`Generation failed: ${error.message}`);
  }
}

/**
 * Poll KIE AI for task result until success or timeout
 *
 * @param {string} taskId - Task ID from createTask
 * @param {number} timeoutMs - Max wait time in ms (default 120s)
 * @returns {Promise<Object>} Result data with image URL
 */
async function pollResult(taskId, timeoutMs = 120000) {
  const start = Date.now();
  let attempts = 0;

  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 3000));
    attempts++;

    const res = await axios.get(
      `${KIE_AI_BASE_URL}/jobs/recordInfo?taskId=${taskId}`,
      {
        headers: { 'Authorization': `Bearer ${KIE_AI_API_KEY}` },
        timeout: 15000
      }
    );

    const data = res.data?.data || {};
    const state = data.state;
    console.log(`[Nano Banana] Poll #${attempts}: ${state}`);

    if (state === 'success') {
      // resultJson is a JSON string: parse it to get resultUrls
      let resultUrls = [];
      try {
        const parsed = JSON.parse(data.resultJson || '{}');
        resultUrls = parsed.resultUrls || [];
      } catch { /* ignore parse errors */ }
      return { result: resultUrls.map(url => ({ image: url })) };
    }
    if (state === 'fail') {
      throw new Error(data.failMsg || 'KIE AI generation failed');
    }
    // states: waiting, queuing, generating → continue polling
  }

  throw new Error('Generation timeout after 120s');
}

