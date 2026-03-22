/**
 * tools/seo/sitemap-generator.js
 * Genera sitemap.xml estático para Emiralia.
 * Incluye páginas estáticas + propiedades desde DB.
 *
 * Uso: node tools/seo/sitemap-generator.js [--output path/to/sitemap.xml]
 */

import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const BASE_URL = process.env.SITE_URL || 'https://emiralia.com';

// Páginas estáticas del sitio (excluye interes.html = noindex)
const STATIC_PAGES = [
  { url: '/', priority: '1.0', changefreq: 'weekly' },
  { url: '/propiedades.html', priority: '0.9', changefreq: 'daily' },
  { url: '/desarrolladores.html', priority: '0.8', changefreq: 'weekly' },
  { url: '/invertir.html', priority: '0.8', changefreq: 'monthly' },
  { url: '/blog.html', priority: '0.7', changefreq: 'weekly' },
  { url: '/articulo.html', priority: '0.7', changefreq: 'monthly' },
  { url: '/ai-insights.html', priority: '0.6', changefreq: 'daily' },
];

function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

function buildSitemapXml(entries) {
  const today = formatDate(new Date());
  const urls = entries.map(({ url, priority, changefreq, lastmod }) => `
  <url>
    <loc>${BASE_URL}${url}</loc>
    <lastmod>${lastmod || today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

async function getPropertyUrls(pool) {
  try {
    const result = await pool.query(
      `SELECT pf_id, updated_at FROM properties WHERE status != 'inactive' ORDER BY updated_at DESC LIMIT 10000`
    );
    return result.rows.map(row => ({
      url: `/propiedad.html?id=${row.pf_id}`,
      priority: '0.6',
      changefreq: 'weekly',
      lastmod: formatDate(row.updated_at || new Date()),
    }));
  } catch (err) {
    console.warn('[sitemap] Could not fetch properties:', err.message);
    return [];
  }
}

export async function generateSitemap(pool) {
  const propertyUrls = await getPropertyUrls(pool);
  const allEntries = [...STATIC_PAGES, ...propertyUrls];
  return buildSitemapXml(allEntries);
}

// CLI: run directly
if (process.argv[1].endsWith('sitemap-generator.js')) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  const outputArg = process.argv.indexOf('--output');
  const outputPath = outputArg !== -1
    ? process.argv[outputArg + 1]
    : path.join(process.cwd(), 'apps/website/public/sitemap.xml');

  try {
    const xml = await generateSitemap(pool);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, xml, 'utf-8');
    console.log(`[sitemap] Generated ${xml.split('<url>').length - 1} URLs → ${outputPath}`);
  } catch (err) {
    console.error('[sitemap] Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
