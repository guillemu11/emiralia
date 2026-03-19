/**
 * DALL-E 3 Image Generator for Marketing Content
 *
 * Uses OpenAI DALL-E 3 to generate professional visual content
 * for social media, web banners, and editorial.
 */

import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const GENERATED_IMAGES_DIR = process.env.GENERATED_IMAGES_DIR || 'apps/website/public/generated';

// Supported image sizes (DALL-E 3 format)
const SIZES = {
  square: '1024x1024',      // Instagram posts
  landscape: '1792x1024',   // Facebook, LinkedIn, web banners
  portrait: '1024x1792',    // Instagram stories
  wide: '1792x1024'         // Hero images, headers (same as landscape)
};

/**
 * Generate AI image from text prompt using DALL-E 3
 *
 * @param {string} prompt - Text description of image to generate
 * @param {Object} options - Generation options
 * @param {string} options.size - Image size: square|landscape|portrait|wide
 * @param {string} options.quality - Quality level: standard|hd
 * @param {string} options.filename - Custom filename (optional)
 * @returns {Promise<Object>} Generation result with path, URL, metadata
 */
export async function generateImage(prompt, options = {}) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured in .env');
  }

  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Valid prompt is required');
  }

  const {
    size = 'square',
    quality = 'standard',
    filename = null
  } = options;

  const dalleSize = SIZES[size] || '1024x1024';

  console.log(`[DALL-E Generator] Generating ${size} (${dalleSize}) image...`);
  console.log(`[DALL-E Generator] Quality: ${quality}`);
  console.log(`[DALL-E Generator] Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);

  try {
    // Call DALL-E 3 API
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: dalleSize,
      quality: quality, // 'standard' or 'hd'
      response_format: 'b64_json' // Base64 for direct saving
    });

    // Extract image data
    const imageBase64 = response.data[0].b64_json;
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const revisedPrompt = response.data[0].revised_prompt;

    // Save to filesystem
    const savedPath = await saveImage(imageBuffer, filename);
    const publicUrl = `/generated/${path.basename(savedPath)}`;

    console.log(`[DALL-E Generator] ✓ Image saved: ${savedPath}`);
    console.log(`[DALL-E Generator] ✓ Public URL: ${publicUrl}`);
    if (revisedPrompt && revisedPrompt !== prompt) {
      console.log(`[DALL-E Generator] ℹ Revised prompt: "${revisedPrompt.substring(0, 100)}${revisedPrompt.length > 100 ? '...' : ''}"`);
    }

    return {
      success: true,
      path: savedPath,
      url: publicUrl,
      filename: path.basename(savedPath),
      prompt: prompt,
      revisedPrompt: revisedPrompt,
      size: dalleSize,
      model: 'dall-e-3',
      quality: quality,
      generatedAt: new Date()
    };

  } catch (error) {
    console.error('[DALL-E Generator] Generation failed:', error.message);

    // Check for specific error types
    if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI quota exceeded - check billing at https://platform.openai.com/account/billing');
    }
    if (error.status === 400) {
      throw new Error(`Invalid prompt - DALL-E safety system blocked: ${error.message}`);
    }
    if (error.status === 429) {
      throw new Error('Rate limit exceeded - try again in a few moments');
    }

    throw new Error(`Generation failed: ${error.message}`);
  }
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
