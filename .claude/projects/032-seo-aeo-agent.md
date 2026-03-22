---
id: "032"
status: Completed
created: 2026-03-22
completed: 2026-03-22
agents: [seo-agent, frontend-agent, dev-agent, content-agent]
---

# SEO & AEO Agent

## Problema

Emiralia no tiene infraestructura SEO. Las 10 páginas del website tienen solo `<title>` y `<meta description>` básicos — sin robots.txt, sitemap, Open Graph, canonical tags ni structured data (JSON-LD). Las páginas de detalle de propiedad (`propiedad.html?id=123`) cargan contenido vía JS, por lo que los crawlers ven un shell vacío.

No existe el SEO Agent en el framework WAT.

## Solución

Crear el SEO & AEO Agent en el framework WAT e implementar la infraestructura SEO completa del website. AEO (Answer Engine Optimization) = optimizar para motores IA (Perplexity, ChatGPT Search, Google AI Overview) con FAQ/HowTo schemas y contenido estructurado en español sobre inversión en EAU.

## Métricas de éxito

- robots.txt y sitemap.xml accesibles en producción ✅
- OG tags + canonical en las 10 páginas ✅
- Property pages indexables por Google (bot-detection middleware) ✅
- `FAQPage` + `HowTo` JSON-LD en invertir.html — pasar Google Rich Results Test ✅
- `/seo-audit` skill operativa con score por página ✅ (score: 83/100)

## Fases y tareas

### Fase 0 — Registro WAT del Agente
- [x] Crear `.claude/agents/seo/seo-agent.md`
- [x] Actualizar `.claude/AGENTS.md` — mover de Planificados → Activos
- [x] Actualizar `.claude/SKILLS.md` — añadir sección SEO & AEO con 4 skills
- [x] Actualizar `.claude/WORKFLOWS.md` — mover SEO Optimization a Activos
- [x] Crear `.claude/workflows/seo-optimization.md`

### Fase 1 — Technical SEO Foundation (Quick Wins)
- [x] Crear `apps/website/public/robots.txt`
- [x] Añadir OG tags + canonical a las 10 páginas HTML
- [x] Añadir Organization JSON-LD en `index.html`
- [x] Añadir Article JSON-LD en `articulo.html`
- [x] Añadir `noindex` en `interes.html`

### Fase 2 — Sitemap Dinámico
- [x] Crear `tools/seo/sitemap-generator.js`
- [x] Añadir `GET /sitemap.xml` en `apps/dashboard/server.js`
- [x] Actualizar `apps/website/nginx.conf` — proxy `/sitemap.xml` a dashboard

### Fase 3 — Bot-Detection para Property Pages
- [x] Crear `tools/seo/meta-injector.js` — `injectPropertyMeta(row)` → HTML enriched
- [x] Crear `tools/seo/schema-builder.js` — builders para Property/Article/FAQ/Org schemas
- [x] Añadir endpoint `/seo/propiedad` en `apps/dashboard/server.js`
- [x] Actualizar `apps/website/nginx.conf` — proxy `/propiedad.html` bots → dashboard

### Fase 4 — Skills SEO
- [x] Crear `.claude/skills/seo/seo-audit/SKILL.md`
- [x] Crear `.claude/skills/seo/generar-keywords/SKILL.md`
- [x] Crear `.claude/skills/seo/meta-optimizer/SKILL.md`
- [x] Crear `.claude/skills/seo/structured-data-generator/SKILL.md`
- [x] Crear `tools/seo/audit.js` — CLI de auditoría (score: 83/100)

### Fase 5 — AEO Content (FAQ + HowTo)
- [x] Añadir FAQPage JSON-LD en `invertir.html` (4 Q&As sobre inversión en Dubai)
- [x] Añadir HowTo JSON-LD en `invertir.html` (4 pasos de compra)
- [x] Añadir FAQPage JSON-LD en `blog.html` (3 Q&As inversión EAU)

## Resultado Final

| Métrica | Valor |
|---------|-------|
| SEO Audit Score | **83/100** |
| Páginas con OG tags | 10/10 |
| Páginas con canonical | 10/10 |
| Páginas con JSON-LD | 4/10 (index, articulo, invertir, blog) |
| robots.txt | ✅ |
| sitemap.xml dinámico | ✅ (endpoint /sitemap.xml en dashboard) |
| bot-detection propiedad.html | ✅ (/seo/propiedad endpoint) |
| Skills SEO creadas | 4 (/seo-audit, /generar-keywords, /meta-optimizer, /structured-data-generator) |

## Post-MVP / Hoja de Ruta

- Clean URL slugs para propiedades (`/propiedades/dubai-marina-3br-pf123`) — requiere routing strategy + 301 redirects
- Blog CMS dinámico con artículos en Supabase + slug-based URLs
- Google Search Console API integration para monitorear indexación
- Breadcrumb JSON-LD en todas las páginas
- hreflang para variantes es-ES / es-MX
- og-image.jpg (1200×630px) — pendiente generación con `/generar-imagen`
- Twitter card en interes.html (actualmente noindex, baja prioridad)
