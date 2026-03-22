# Workflow: SEO Optimization

## Objetivo

Auditar, optimizar y monitorear el SEO técnico y AEO de Emiralia. Asegura que las 10 páginas del website sean indexables, tengan structured data correcto y aparezcan en respuestas de motores de IA cuando inversores hispanohablantes buscan propiedades en EAU.

## Agentes Involucrados

- **SEO Agent** (líder): auditoría, structured data, bot-detection, keyword research
- **Frontend Agent**: implementación de cambios HTML, OG image
- **Dev Agent**: middleware bot-detection, endpoint sitemap.xml, nginx proxy
- **Content Agent**: contenido FAQ/HowTo en español, meta descriptions

## Inputs

- URL o lista de páginas a auditar
- Palabras clave objetivo (opcional — SEO Agent las genera si no se proporcionan)
- Datos de propiedades en DB (para sitemap dinámico)

## Outputs

- `robots.txt` accesible en producción
- `sitemap.xml` dinámico con todas las URLs + propiedades
- OG tags + canonical en todas las páginas
- JSON-LD schemas por tipo de página
- Score de auditoría por página (`audit_scores` en memoria WAT)
- Middleware bot-detection operativo para `propiedad.html`

## Steps

### Step 1 — Auditoría inicial (SEO Agent)
```bash
node tools/seo/audit.js
```
- Score por página (0-100)
- Gaps detectados: falta OG, canonical, structured data, noindex
- Priorización automática por impacto

### Step 2 — Technical SEO Foundation (Dev Agent + Frontend Agent)
1. Crear `apps/website/public/robots.txt`
2. Añadir OG tags + canonical + `<link rel="canonical">` a todas las páginas
3. Subir `og-image.jpg` (1200×630px) a `public/`
4. Añadir `noindex` en `interes.html`

### Step 3 — Structured Data por página (SEO Agent)
Ejecutar `/structured-data-generator` para cada tipo:
- `index.html` → Organization JSON-LD
- `articulo.html` → Article JSON-LD
- `invertir.html` → FAQPage + HowTo JSON-LD
- `blog.html` → FAQPage JSON-LD
- `propiedad.html` → Property JSON-LD (vía bot-detection middleware)

### Step 4 — Sitemap dinámico (Dev Agent)
1. `node tools/seo/sitemap-generator.js` → genera XML base
2. Endpoint `GET /sitemap.xml` en dashboard → incluye propiedades de DB
3. Proxy nginx: `/sitemap.xml` → dashboard

### Step 5 — Bot-Detection (Dev Agent)
1. Middleware en `apps/dashboard/server.js` que detecta User-Agent de crawlers
2. Si crawler: responde con HTML enriched vía `meta-injector.js` + `schema-builder.js`
3. Nginx proxy: `/propiedad.html` → dashboard (antes del static serve)

### Step 6 — Verificación (SEO Agent)
- Google Rich Results Test para cada página con JSON-LD
- Google Search Console URL Inspection
- `node tools/seo/audit.js` → score final ≥ 80 en todas las páginas
- Persistir `audit_scores` en WAT Memory

## Edge Cases

- **Propiedad no encontrada en DB:** Bot-detection responde con meta genéricos + `noindex` para esa URL
- **Crawler desconocido:** Fallback a HTML estático normal (no enriquecer si no es bot conocido)
- **sitemap.xml muy grande:** Generar sitemap index + sub-sitemaps si > 50,000 URLs
- **OG image no disponible:** Usar image placeholder (logo Emiralia sobre fondo azul)

## Memoria WAT

Keys compartidas:

| Key | Scope | Propósito |
|-----|-------|-----------|
| `last_audit_at` | shared | Timestamp del último audit — para saber si el score está fresco |
| `audit_scores` | shared | JSON con score por página — consultable por PM Agent para priorizar |
| `sitemap_last_generated` | shared | Saber cuándo regenerar sitemap |
| `pages_with_og` | shared | Lista de páginas con OG implementados — para tracking de progreso |

## Trigger

**Manual:** Al publicar nueva página, añadir propiedades, o cambiar contenido relevante

**Event-driven (futuro):**
- `content_published` → regenerar sitemap + revisar meta
- `properties_updated` → regenerar sitemap
- `new_article` → añadir Article JSON-LD

## Métricas de éxito

- robots.txt y sitemap.xml accesibles vía `curl https://emiralia.com/robots.txt`
- OG tags presentes en todas las páginas (verificar con `og:validator`)
- Rich Results Test: PASS en `invertir.html` (FAQPage + HowTo)
- Google Search Console: `propiedad.html?id=X` indexable (no shell vacío)
- SEO Audit score ≥ 80 en todas las páginas
