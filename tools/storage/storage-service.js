/**
 * Storage Service — Abstraction layer for asset storage
 *
 * Backends:
 *   local — saves to local filesystem, served via express.static (development)
 *   r2    — Cloudflare R2 via S3-compatible API (production)
 *
 * Selector: STORAGE_BACKEND=local|r2 (default: local)
 *
 * R2 config (required when STORAGE_BACKEND=r2):
 *   R2_ACCOUNT_ID         — Cloudflare account ID
 *   R2_ACCESS_KEY_ID      — R2 API token access key
 *   R2_SECRET_ACCESS_KEY  — R2 API token secret
 *   R2_BUCKET_NAME        — Bucket name (default: emiralia-assets)
 *   R2_PUBLIC_URL         — Public CDN URL, e.g. https://assets.emiralia.com
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const STORAGE_BACKEND    = process.env.STORAGE_BACKEND || 'local';
const R2_ACCOUNT_ID      = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID   = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME     = process.env.R2_BUCKET_NAME || 'emiralia-assets';
const R2_PUBLIC_URL      = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

const _defaultGeneratedDir = path.resolve(__dirname, '../../apps/website/public/generated');
const LOCAL_DIR = process.env.GENERATED_IMAGES_DIR
    ? path.isAbsolute(process.env.GENERATED_IMAGES_DIR)
        ? process.env.GENERATED_IMAGES_DIR
        : path.resolve(__dirname, '../../', process.env.GENERATED_IMAGES_DIR)
    : _defaultGeneratedDir;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a date-bucketed storage key.
 * Format: {prefix}/{YYYY}/{MM}/{DD}/{uuid}.{ext}
 *
 * @param {string} prefix - e.g. 'creative', 'audio', 'video'
 * @param {string} ext    - extension without dot, e.g. 'jpg', 'mp3', 'mp4'
 * @returns {string}
 */
export function generateKey(prefix, ext) {
    const d = new Date();
    const year  = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day   = String(d.getDate()).padStart(2, '0');
    const uuid  = crypto.randomUUID();
    return `${prefix}/${year}/${month}/${day}/${uuid}.${ext}`;
}

/**
 * Upload a buffer to the configured storage backend.
 *
 * @param {Buffer} buffer      - File content
 * @param {string} key         - Storage key (use generateKey() to create one)
 * @param {string} contentType - MIME type, e.g. 'image/jpeg'
 * @returns {Promise<{ url: string, key: string }>}
 */
export async function upload(buffer, key, contentType) {
    if (STORAGE_BACKEND === 'r2') {
        return uploadToR2(buffer, key, contentType);
    }
    return uploadToLocal(buffer, key);
}

/**
 * Delete an asset from storage by key.
 *
 * @param {string} key - Storage key returned by upload()
 */
export async function deleteAsset(key) {
    if (STORAGE_BACKEND === 'r2') {
        return deleteFromR2(key);
    }
    return deleteFromLocal(key);
}

/**
 * Returns the public URL for a given key without uploading.
 * Useful for constructing thumbnail URLs from existing keys.
 *
 * @param {string} key
 * @returns {string}
 */
export function getPublicUrl(key) {
    if (STORAGE_BACKEND === 'r2') {
        return `${R2_PUBLIC_URL}/${key}`;
    }
    return `/generated/${path.basename(key)}`;
}

/**
 * Returns which backend is active.
 * @returns {'local'|'r2'}
 */
export function getBackend() {
    return STORAGE_BACKEND;
}

// ─── Local Backend ────────────────────────────────────────────────────────────

async function uploadToLocal(buffer, key) {
    await fs.mkdir(LOCAL_DIR, { recursive: true });
    // Flatten key to filename — keeps /generated/ express.static serving working
    const filename = path.basename(key);
    const filePath = path.join(LOCAL_DIR, filename);
    await fs.writeFile(filePath, buffer);
    const url = `/generated/${filename}`;
    console.log(`[Storage:local] ✓ ${key} → ${filePath}`);
    return { url, key };
}

async function deleteFromLocal(key) {
    const filename = path.basename(key);
    const filePath = path.join(LOCAL_DIR, filename);
    try {
        await fs.unlink(filePath);
        console.log(`[Storage:local] Deleted ${filePath}`);
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
    }
}

// ─── R2 Backend ───────────────────────────────────────────────────────────────

let _s3Client = null;

async function getS3Client() {
    if (_s3Client) return _s3Client;

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
        throw new Error(
            'R2 credentials not configured. Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY'
        );
    }
    if (!R2_PUBLIC_URL) {
        throw new Error('R2_PUBLIC_URL not configured — needed to build public asset URLs');
    }

    const { S3Client } = await import('@aws-sdk/client-s3');
    _s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
    });
    return _s3Client;
}

async function uploadToR2(buffer, key, contentType) {
    const client = await getS3Client();
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');

    await client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // Assets are immutable — set long-lived cache
        CacheControl: 'public, max-age=31536000, immutable',
    }));

    const url = `${R2_PUBLIC_URL}/${key}`;
    console.log(`[Storage:r2] ✓ ${key} → ${url}`);
    return { url, key };
}

async function deleteFromR2(key) {
    const client = await getS3Client();
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');

    await client.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
    }));
    console.log(`[Storage:r2] Deleted ${key}`);
}
