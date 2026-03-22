/**
 * tools/seo/audit.js
 * CLI de auditoría SEO para Emiralia.
 * Analiza los 10 HTML del website y genera un score por página.
 *
 * Uso: node tools/seo/audit.js [--page index.html]
 */

import fs from 'fs';
import path from 'path';

const WEBSITE_DIR = path.resolve(process.cwd(), 'apps/website');

const PAGES = [
  { file: 'index.html', url: '/', expectNoindex: false, expectJsonLd: true },
  { file: 'propiedades.html', url: '/propiedades.html', expectNoindex: false, expectJsonLd: false },
  { file: 'propiedad.html', url: '/propiedad.html', expectNoindex: false, expectJsonLd: false },
  { file: 'desarrolladores.html', url: '/desarrolladores.html', expectNoindex: false, expectJsonLd: false },
  { file: 'desarrollador.html', url: '/desarrollador.html', expectNoindex: false, expectJsonLd: false },
  { file: 'invertir.html', url: '/invertir.html', expectNoindex: false, expectJsonLd: true },
  { file: 'blog.html', url: '/blog.html', expectNoindex: false, expectJsonLd: false },
  { file: 'articulo.html', url: '/articulo.html', expectNoindex: false, expectJsonLd: true },
  { file: 'ai-insights.html', url: '/ai-insights.html', expectNoindex: false, expectJsonLd: false },
  { file: 'interes.html', url: '/interes.html', expectNoindex: true, expectJsonLd: false },
];

function auditPage(page) {
  const filePath = path.join(WEBSITE_DIR, page.file);
  let html;
  try {
    html = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return { file: page.file, score: 0, issues: ['File not found'], checks: {} };
  }

  const checks = {};
  const issues = [];
  let score = 0;

  // Title (15 pts)
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;
  if (title && title.length > 0) {
    checks.title = { ok: true, value: title, length: title.length };
    score += 15;
    if (title.length > 60) issues.push(`title demasiado largo (${title.length} chars, max 60)`);
  } else {
    checks.title = { ok: false };
    issues.push('Falta <title>');
  }

  // Description (15 pts)
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() : null;
  if (description && description.length > 0) {
    checks.description = { ok: true, length: description.length };
    score += 15;
    if (description.length > 160) issues.push(`description demasiado larga (${description.length} chars, max 160)`);
  } else {
    checks.description = { ok: false };
    issues.push('Falta <meta name="description">');
  }

  // Canonical (15 pts)
  const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html);
  checks.canonical = { ok: hasCanonical };
  if (hasCanonical) {
    score += 15;
  } else {
    issues.push('Falta <link rel="canonical">');
  }

  // OG tags (20 pts)
  const hasOgTitle = /property=["']og:title["']/i.test(html);
  const hasOgDesc = /property=["']og:description["']/i.test(html);
  const hasOgImage = /property=["']og:image["']/i.test(html);
  const ogComplete = hasOgTitle && hasOgDesc && hasOgImage;
  checks.og = { ok: ogComplete, title: hasOgTitle, description: hasOgDesc, image: hasOgImage };
  if (ogComplete) {
    score += 20;
  } else {
    if (!hasOgTitle) issues.push('Falta og:title');
    if (!hasOgDesc) issues.push('Falta og:description');
    if (!hasOgImage) issues.push('Falta og:image');
  }

  // Twitter card (10 pts)
  const hasTwitterCard = /name=["']twitter:card["']/i.test(html);
  checks.twitter = { ok: hasTwitterCard };
  if (hasTwitterCard) {
    score += 10;
  } else {
    issues.push('Falta <meta name="twitter:card">');
  }

  // JSON-LD (20 pts)
  const hasJsonLd = /type=["']application\/ld\+json["']/i.test(html);
  checks.jsonLd = { ok: hasJsonLd };
  if (hasJsonLd) {
    score += 20;
  } else if (page.expectJsonLd) {
    issues.push('Falta JSON-LD structured data (requerido para esta página)');
  }

  // noindex (5 pts — solo para interes.html)
  const hasNoindex = /content=["'][^"']*noindex[^"']*["']/i.test(html);
  checks.noindex = { ok: hasNoindex };
  if (page.expectNoindex) {
    if (hasNoindex) {
      score += 5;
    } else {
      issues.push('Falta noindex (esta página debe estar excluida de indexación)');
    }
  } else if (hasNoindex) {
    issues.push('⚠️ Tiene noindex pero no debería estar excluida de indexación');
  }

  return { file: page.file, url: page.url, score, issues, checks };
}

function renderTable(results) {
  const header = '| Página | Score | Title | Desc | Canonical | OG | Twitter | JSON-LD | Issues |';
  const sep =    '|--------|-------|-------|------|-----------|-----|---------|---------|--------|';
  const rows = results.map(r => {
    const icon = v => v ? '✅' : '❌';
    return `| ${r.file} | ${r.score}/100 | ${icon(r.checks.title?.ok)} | ${icon(r.checks.description?.ok)} | ${icon(r.checks.canonical?.ok)} | ${icon(r.checks.og?.ok)} | ${icon(r.checks.twitter?.ok)} | ${icon(r.checks.jsonLd?.ok)} | ${r.issues.length} |`;
  });
  return [header, sep, ...rows].join('\n');
}

// CLI
const pageFilter = process.argv.includes('--page')
  ? process.argv[process.argv.indexOf('--page') + 1]
  : null;

const pagesToAudit = pageFilter
  ? PAGES.filter(p => p.file === pageFilter)
  : PAGES;

const results = pagesToAudit.map(auditPage);
const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);

console.log('\n📊 EMIRALIA — SEO AUDIT REPORT\n');
console.log(`Fecha: ${new Date().toISOString().split('T')[0]}`);
console.log(`Score promedio: ${avgScore}/100\n`);
console.log(renderTable(results));
console.log('\n--- Issues detallados ---\n');

results.forEach(r => {
  if (r.issues.length > 0) {
    console.log(`\n❌ ${r.file} (${r.score}/100):`);
    r.issues.forEach(issue => console.log(`   • ${issue}`));
  } else {
    console.log(`✅ ${r.file} (${r.score}/100): sin issues`);
  }
});

console.log(`\n🎯 Score total: ${avgScore}/100`);
if (avgScore >= 90) console.log('Estado: EXCELENTE');
else if (avgScore >= 75) console.log('Estado: BUENO — algunos issues menores');
else if (avgScore >= 60) console.log('Estado: MEJORABLE — revisar issues críticos');
else console.log('Estado: CRÍTICO — implementar SEO básico urgente');
