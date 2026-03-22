/**
 * Nano Banana — AI Image Generator for Marketing Content
 *
 * Uses KIE AI Nano Banana 2 (Google Gemini) to generate
 * professional visual content for social media, web banners, and editorial.
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const KIE_AI_API_KEY = process.env.KIE_AI_API_KEY;
const KIE_AI_BASE_URL = 'https://api.kie.ai/api/v1';
const KIE_AI_MODEL = 'nano-banana-2';
const GENERATED_IMAGES_DIR = process.env.GENERATED_IMAGES_DIR || 'apps/website/public/generated';

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
    filename = null
  } = options;

  const aspectRatio = ASPECT_RATIOS[size] || '1:1';
  const resolution = RESOLUTIONS[quality] || '1K';

  console.log(`[Nano Banana] Generating ${size} (${aspectRatio}) image...`);
  console.log(`[Nano Banana] Quality: ${quality} (${resolution})`);
  console.log(`[Nano Banana] Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);

  try {
    // Step 1: Create generation task
    const createRes = await axios.post(
      `${KIE_AI_BASE_URL}/jobs/createTask`,
      {
        model: KIE_AI_MODEL,
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

    const taskId = createRes.data.data?.task_id;
    if (!taskId) {
      throw new Error('No task_id returned from KIE AI');
    }

    console.log(`[Nano Banana] Task created: ${taskId}`);

    // Step 2: Poll for result
    const result = await pollResult(taskId);

    // Step 3: Download image from URL
    const imageUrl = result.result[0]?.image;
    if (!imageUrl) {
      throw new Error('No image URL in KIE AI result');
    }

    console.log(`[Nano Banana] Downloading image from: ${imageUrl}`);
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 60000
    });
    const imageBuffer = Buffer.from(imageResponse.data);

    // Step 4: Save to filesystem
    const savedPath = await saveImage(imageBuffer, filename);
    const publicUrl = `/generated/${path.basename(savedPath)}`;

    console.log(`[Nano Banana] ✓ Image saved: ${savedPath}`);
    console.log(`[Nano Banana] ✓ Public URL: ${publicUrl}`);

    return {
      success: true,
      path: savedPath,
      url: publicUrl,
      filename: path.basename(savedPath),
      prompt,
      revisedPrompt: null,
      size: aspectRatio,
      model: KIE_AI_MODEL,
      quality,
      generatedAt: new Date()
    };

  } catch (error) {
    console.error('[Nano Banana] Generation failed:', error.message);

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

    const res = await axios.post(
      `${KIE_AI_BASE_URL}/image/nano-banana/result`,
      { taskId },
      {
        headers: {
          'Authorization': `Bearer ${KIE_AI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const { status, status_reason } = res.data;
    console.log(`[Nano Banana] Poll #${attempts}: ${status}`);

    if (status === 'success') {
      return res.data;
    }
    if (status === 'failed') {
      throw new Error(status_reason?.message || 'KIE AI generation failed');
    }
    // status === 'processing' → continue polling
  }

  throw new Error('Generation timeout after 120s');
}

/**
 * Save image buffer to filesystem
 *
 * @param {Buffer} imageBuffer - Image data as buffer
 * @param {string|null} customFilename - Optional custom filename
 * @returns {Promise<string>} Absolute path to saved file
 */
async function saveImage(imageBuffer, customFilename = null) {
  // Ensure output directory exists
  const outputDir = path.resolve(GENERATED_IMAGES_DIR);
  await fs.mkdir(outputDir, { recursive: true });

  // Generate unique filename if not provided
  let filename;
  if (customFilename) {
    filename = customFilename;
  } else {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const hash = crypto.createHash('md5').update(imageBuffer).digest('hex').substring(0, 8);
    filename = `${timestamp}_${hash}.jpg`;
  }

  const filePath = path.join(outputDir, filename);

  // Write file
  await fs.writeFile(filePath, imageBuffer);

  return filePath;
}

/**
 * Get information about generated images directory
 *
 * @returns {Promise<Object>} Directory stats
 */
export async function getDirectoryStats() {
  const outputDir = path.resolve(GENERATED_IMAGES_DIR);

  try {
    const files = await fs.readdir(outputDir);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

    let totalSize = 0;
    for (const file of imageFiles) {
      const stats = await fs.stat(path.join(outputDir, file));
      totalSize += stats.size;
    }

    return {
      count: imageFiles.length,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      avgSizeKB: imageFiles.length > 0
        ? ((totalSize / imageFiles.length) / 1024).toFixed(2)
        : 0,
      directory: outputDir
    };
  } catch (error) {
    return {
      count: 0,
      totalSizeMB: 0,
      avgSizeKB: 0,
      directory: outputDir,
      error: error.message
    };
  }
}
