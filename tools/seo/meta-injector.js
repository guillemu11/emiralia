/**
 * tools/seo/meta-injector.js
 * Inyecta meta tags SEO y JSON-LD en el HTML shell de propiedad.html
 * para que los crawlers reciban contenido enriquecido.
 *
 * Uso: injectPropertyMeta(row, htmlShell) → string HTML enriquecido
 */

import { buildPropertySchema, toScriptTag } from './schema-builder.js';

const BASE_URL = process.env.SITE_URL || 'https://emiralia.com';

/**
 * Genera el HTML enriquecido para una propiedad.
 * @param {Object} row - fila de la tabla properties
 * @param {string} htmlShell - contenido de propiedad.html
 * @returns {string} HTML con meta tags + JSON-LD inyectados
 */
export function injectPropertyMeta(row, htmlShell) {
  const title = row.title
    ? `${row.title} — Emiralia`
    : `Propiedad en ${row.community || row.city || 'EAU'} — Emiralia`;

  const description = buildDescription(row);
  const image = row.photos?.[0] || `${BASE_URL}/og-image.jpg`;
  const url = `${BASE_URL}/propiedad.html?id=${row.pf_id}`;
  const price = row.price ? `${Number(row.price).toLocaleString('es-ES')} ${row.currency || 'AED'}` : null;

  const metaBlock = `
    <!-- SEO injected by bot-detection middleware -->
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:locale" content="es_ES" />
    <meta property="og:site_name" content="Emiralia" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    ${toScriptTag(buildPropertySchema(row))}`;

  // Replace existing <title> and description, inject after <head>
  let enriched = htmlShell
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description"[^>]*\/>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<\/head>/, `${metaBlock}\n</head>`);

  return enriched;
}

/**
 * Genera la meta description de una propiedad desde sus datos.
 */
function buildDescription(row) {
  const parts = [];

  if (row.property_type) parts.push(row.property_type);
  if (row.bedrooms) parts.push(`${row.bedrooms} dormitorios`);
  if (row.community) parts.push(`en ${row.community}`);
  if (row.city) parts.push(row.city);
  if (row.price) parts.push(`por ${Number(row.price).toLocaleString('es-ES')} ${row.currency || 'AED'}`);
  if (row.size_sqft) parts.push(`(${row.size_sqft} ft²)`);

  const base = parts.join(' ');
  const suffix = 'Análisis con IA, ROI estimado y datos verificados en Emiralia.';

  return base ? `${base}. ${suffix}` : `Propiedad en Emiratos Árabes Unidos. ${suffix}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
