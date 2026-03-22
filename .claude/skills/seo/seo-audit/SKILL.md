---
name: seo-audit
description: Auditoría SEO completa de Emiralia — score por página, gaps detectados, issues priorizados por impacto
model: sonnet
context: fork
allowed-tools: [Bash, Read, Grep, Glob]
---

Eres el SEO Agent de Emiralia. Ejecuta una auditoría SEO completa del website.

## Pasos

### 1. Inventario de páginas

Localiza los 10 HTML del website en `apps/website/`:
- index.html, propiedades.html, propiedad.html, desarrolladores.html, desarrollador.html
- invertir.html, blog.html, articulo.html, ai-insights.html, interes.html

### 2. Verificación por página (checklist binario)

Para cada página, verifica (usa Grep sobre el archivo):

| Check | Comando |
|-------|---------|
| `<title>` presente y < 60 chars | grep -o `<title>[^<]*</title>` |
| `<meta name="description">` presente y < 160 chars | grep -o `content="[^"]*"` |
| `<link rel="canonical">` | grep `rel="canonical"` |
| `og:title`, `og:description`, `og:image` | grep `og:title\|og:description\|og:image` |
| `twitter:card` | grep `twitter:card` |
| JSON-LD `application/ld+json` | grep `ld+json` |
| `noindex` (solo interes.html) | grep `noindex` |

### 3. Verificación de archivos SEO base

```bash
# robots.txt
cat apps/website/public/robots.txt 2>/dev/null || echo "MISSING"

# sitemap endpoint en nginx
grep sitemap apps/website/nginx.conf

# bot-detection endpoint
grep "seo/propiedad" apps/dashboard/server.js | head -3
```

### 4. Verificación de tools SEO

```bash
ls tools/seo/
```

### 5. Score por página

Calcula score (0–100) por página usando esta fórmula:
- title presente y bien formado: +15
- description presente y bien formada: +15
- canonical: +15
- OG tags completos (og:title + og:description + og:image): +20
- Twitter card: +10
- JSON-LD: +20
- noindex correcto (interes.html): +5

### 6. Output

Presenta el resultado como tabla markdown:

```
| Página | Score | Title | Desc | Canonical | OG | JSON-LD | Issues |
|--------|-------|-------|------|-----------|-----|---------|--------|
| index.html | 85/100 | ✅ | ✅ | ✅ | ✅ | ✅ | ... |
```

Luego lista los **Top 3 issues** por impacto con acción concreta para resolverlos.

### 7. Persistir resultado en memoria WAT

```bash
node tools/db/memory.js set seo-agent audit_scores '{"last_run":"2026-03-22","pages":{...}}' shared
node tools/db/memory.js set seo-agent last_audit_at '"2026-03-22"' shared
```
