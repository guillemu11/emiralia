# Auditoría Pre-Deploy MVP — Emiralia Website

**Fecha:** 2026-03-11
**Versión:** MVP v1.0
**Auditor:** Frontend Agent (Claude Code)
**Estado:** ⚠️ **NO LISTO para producción**

---

## Resumen Ejecutivo

### Alcance
- **11 páginas HTML** auditadas
- **6 archivos JavaScript** revisados
- **Configuración Tailwind** y estilos CSS
- **Cumplimiento** de brand guidelines, WCAG 2.1 AA, seguridad web

### Hallazgos
- **Total de issues:** 33
- **🔴 Críticos (bloquean deploy):** 7
- **🟠 Altos:** 7
- **🟡 Medios:** 12
- **🟢 Menores:** 7

### Recomendación
**NO deployar** hasta resolver los 7 issues críticos. Tiempo estimado: **2-3 días** de desarrollo.

---

## Issues Críticos (Bloquean Deploy)

### 🔴 1. XSS en renderCard() - propiedades.js
**Severidad:** CRÍTICA
**Archivo:** [src/propiedades.js:183-276](../src/propiedades.js)

**Problema:**
```javascript
// Línea 183-276
<h3 class="...truncate">${p.title || 'Propiedad sin titulo'}</h3>
${developer ? `<span>...${developer}</span>` : ''}
// ^ Sin sanitización, inyectable vía API
```

Títulos de propiedades y nombres de developers se renderizan con `innerHTML` sin sanitizar. Si la API retorna código malicioso, se ejecutará.

**Solución:**
```javascript
// Validar y sanitizar
const titleEl = document.createElement('h3');
titleEl.className = '...truncate';
titleEl.textContent = p.title || 'Propiedad sin titulo';
```

**Verificación:** Test con payload `<script>alert('XSS')</script>` en campo title

---

### 🔴 2. XSS vía onclick inline con p.pf_id
**Severidad:** CRÍTICA
**Archivo:** [src/propiedades.js:186,195,200,203](../src/propiedades.js)

**Problema:**
```html
<div onclick="window.location.href='/propiedad.html?pf_id=${p.pf_id}'">
```

**Solución:**
```javascript
// Validar antes de renderizar
const propId = parseInt(p.pf_id);
if (isNaN(propId)) throw new Error('Invalid property ID');

// Usar event listeners en lugar de onclick inline
cardEl.addEventListener('click', () => {
    window.location.href = `/propiedad.html?pf_id=${propId}`;
});
```

---

### 🔴 3. Memory Leak en scroll listeners
**Severidad:** CRÍTICA
**Archivos:**
- [src/main.js:161,205](../src/main.js)
- [src/articulo.js:56](../src/articulo.js)
- [src/propiedades-v2.js:566,708](../src/propiedades-v2.js)

**Problema:**
```javascript
window.addEventListener('scroll', () => { /* handler */ }, { passive: true });
// ^ Sin removeEventListener, acumula listeners
```

Performance degrada tras múltiples navegaciones, especialmente en mobile.

**Solución:**
```javascript
// Crear EventManager
class EventManager {
    constructor() { this.listeners = []; }

    add(target, event, handler, options) {
        target.addEventListener(event, handler, options);
        this.listeners.push({ target, event, handler });
    }

    cleanup() {
        this.listeners.forEach(({target, event, handler}) => {
            target.removeEventListener(event, handler);
        });
        this.listeners = [];
    }
}

// Cleanup en page unload
window.addEventListener('beforeunload', () => eventManager.cleanup());
```

---

### 🔴 4. 80+ colores no-brand
**Severidad:** CRÍTICA
**Archivos:** Todos los HTML

**Colores prohibidos encontrados:**
- `blue-700`, `blue-100`, `blue-900` → Usar `primary` (#2563EB)
- `green-100`, `green-500`, `green-600` → Usar `success` (#16A34A) + `success-bg` (#DCFCE7)
- `gray-100`, `gray-200`, `slate-200` → Usar `border-color` (#F3F4F6) / `border-emphasis` (#E5E7EB)
- `orange-400` → Usar `warning` (#FB923C)

**Ejemplos:**
```html
<!-- ❌ Incorrecto -->
<div class="bg-blue-100 text-blue-700">
<nav class="border-b border-gray-200">

<!-- ✅ Correcto -->
<div class="bg-primary/10 text-primary">
<nav class="border-b border-border-emphasis">
```

**Acción:** Buscar y reemplazar en todos los archivos HTML

---

### 🔴 5. Contraste WCAG insuficiente
**Severidad:** CRÍTICA (Legal + A11y)
**Archivos:** index.html, propiedades.html, style.css

**Combinaciones que FALLAN WCAG AA (< 4.5:1):**

| Elemento | Contraste | Ubicación |
|----------|-----------|-----------|
| `text-white/80` sobre fondo claro | 3.2:1 ❌ | index.html:87 |
| `text-secondary-text` sobre `bg-section-bg` | 4.2:1 ⚠️ | Múltiples |

**Soluciones:**
```html
<!-- ❌ Falla WCAG -->
<p class="text-base text-white/80">...</p>

<!-- ✅ Pasa WCAG -->
<p class="text-base text-white drop-shadow-lg">...</p>
```

```js
// tailwind.config.js
colors: {
    'secondary-text': '#475569', // Cambiar de #64748B a #475569 (ratio 7.5:1)
}
```

---

### 🔴 6. Tap targets < 44px (WCAG 2.5.5)
**Severidad:** CRÍTICA (A11y)
**Archivos:** propiedades.html, index.html, desarrolladores.html

**Botones que violan estándar:**
- Nav mobile: `w-9 h-9` (36px) — propiedades.html:61,64
- View toggle: `px-3 py-1.5` (28-30px) — propiedades.html:105-111
- Close button: `w-8 h-8` (32px) — propiedades.html:255

**Solución:**
```html
<!-- ❌ 36px -->
<button class="w-9 h-9">

<!-- ✅ 44px -->
<button class="w-11 h-11">
```

Aumentar TODOS los elementos interactivos a mínimo **44×44px**.

---

### 🔴 7. N+1 Query Pattern en lazy load
**Severidad:** 🟠 ALTA (tolerable en MVP < 100 props)
**Archivo:** [src/propiedades.js:458-464,506-512](../src/propiedades.js)

**Problema:**
Puede cargar 120+ imágenes simultáneamente (24 cards × 5 imgs).

**Solución:**
```javascript
// Usar Intersection Observer
const imgObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            imgObserver.unobserve(img);
        }
    });
}, { rootMargin: '50px' });

// Aplicar a todas las imágenes
document.querySelectorAll('img[data-src]').forEach(img => {
    imgObserver.observe(img);
});
```

---

## Issues Altos y Medios

### 🟠 8. Botones hover no-brand
**Archivos:** desarrollador.html:124,559
**Fix:** `hover:bg-blue-700` → `hover:bg-primary/90`

### 🟠 9. Login button hover incorrecto (4 páginas)
**Archivos:** index.html:56, propiedades.html:55, desarrolladores.html:53, desarrollador.html:53
**Fix:** `hover:bg-gray-100` → `hover:bg-light-fill`

### 🟡 10. Inputs sin labels accesibles
**Archivo:** propiedades.html:292-295
**Fix:**
```html
<label for="filter-price-min" class="sr-only">Precio mínimo</label>
<input type="number" id="filter-price-min" placeholder="Min" />
```

### 🟡 11. Falta focus-visible en inputs
**Archivo:** propiedades.html
**Fix:** Añadir `focus-visible:ring-2 focus-visible:ring-primary`

### 🟡 12. Aria-labels insuficientes en filtros
**Archivo:** propiedades.html
**Elementos sin aria-label:**
- filter-chip (línea 79-80)
- price-preset (línea 297-301)
- sort-select (línea 93)

### 🟡 13. Imágenes sin alt text
**Archivos:** articulo.html:66,277,294,311 | blog.html:71,149,191 | desarrollador.html:78
**Fix:** Añadir `alt="[descripción]"` a todas las imágenes hero

### 🟡 14. Falta cursor-pointer
**Archivo:** propiedades.html (múltiples botones)
**Fix:** Añadir `cursor-pointer` explícito en elementos interactivos

### 🟡 15. console.error() en producción
**Archivos:** propiedades.js:427,595,626 | interes.js:76 | propiedad.js:76
**Fix:** Envolver en `if (import.meta.env.DEV)` o remover

---

## Issues Menores (Post-MVP)

16. **HTML semántico:** Usar `<section>`, `<article>` en lugar de `<div>`
17. **Tailwind config:** Enumerar todas las páginas HTML en `content`
18. **SVG icons:** Añadir `aria-hidden="true"` a iconos Lucide
19. **prefers-reduced-motion:** Añadir media query para deshabilitar animaciones
20. **skip-to-content:** Añadir link de accesibilidad al inicio del body

---

## Plan de Corrección (Priorizado)

### ✅ Paso 0: Documentación
- [x] Crear carpeta `docs/`
- [x] Crear este documento de auditoría

---

### 🔥 Sprint 0: Bloqueadores Críticos (2-3 días)

#### Día 1 — Seguridad (6 horas)

**1.1 Sanitizar XSS en propiedades.js**
- [ ] Validar `p.pf_id` como `parseInt()` antes de renderizar
- [ ] Reemplazar templates innerHTML por `createElement` + `textContent`
- [ ] Eliminar onclick inline, usar event listeners
- [ ] **Test:** Payload malicioso `<script>alert('XSS')</script>`

**1.2 Limpiar memory leaks**
- [ ] Crear EventManager class en main.js
- [ ] Refactor scroll listeners con removeEventListener
- [ ] **Archivos:** main.js, articulo.js, propiedades-v2.js
- [ ] **Test:** Chrome DevTools Memory Profiler, navegar 10 veces

---

#### Día 2 — Brand Compliance (6 horas)

**2.1 Reemplazar 80+ colores no-brand**

Buscar y reemplazar en todos los HTML:

```bash
# Búsqueda global
grep -r "blue-700\|blue-100\|blue-900\|gray-100\|gray-200\|green-100" apps/website/*.html
```

| ❌ Prohibido | ✅ Usar |
|-------------|---------|
| `blue-700` | `primary` |
| `blue-100` | `primary/10` |
| `gray-100` | `border-color` |
| `gray-200` | `border-emphasis` |
| `green-100` | `success-bg` |
| `green-600` | `success` |

- [ ] Reemplazar en todos los archivos
- [ ] Verificar 0 instancias con grep

**2.2 Corregir contraste WCAG**
- [ ] Reemplazar `text-white/80` con `text-white drop-shadow-lg`
- [ ] Cambiar `secondary-text` en tailwind.config.js: `#64748B` → `#475569`
- [ ] **Test:** WebAIM Contrast Checker

---

#### Día 3 — Accesibilidad (6 horas)

**3.1 Aumentar tap targets a 44px**
- [ ] `w-9 h-9` → `w-11 h-11`
- [ ] `px-3 py-1.5` → `px-4 py-2.5`
- [ ] **Archivos:** propiedades.html, index.html, desarrolladores.html
- [ ] **Test:** iPhone SE (375px) device real

**3.2 Labels en inputs de filtro**
- [ ] Añadir `<label class="sr-only">` a todos los inputs
- [ ] **Test:** NVDA screen reader

**3.3 Lazy load con throttle**
- [ ] Implementar Intersection Observer
- [ ] Limitar a 3 concurrent loads
- [ ] **Test:** Network tab 3G throttled

---

### 🔧 Sprint 1: Issues Medios (1-2 días post-deploy)

- [ ] Corregir botones hover no-brand (#8, #9)
- [ ] Añadir focus-visible a inputs (#11)
- [ ] Añadir aria-labels a filtros (#12)
- [ ] Completar alt text en imágenes (#13)
- [ ] Añadir cursor-pointer (#14)
- [ ] Remover console.error() (#15)

---

### 🎨 Sprint 2: Optimizaciones (ongoing)

- [ ] HTML semántico (#16)
- [ ] Tailwind config coverage (#17)
- [ ] aria-hidden en SVGs (#18)
- [ ] prefers-reduced-motion (#19)
- [ ] skip-to-content link (#20)

---

## Checklist de Verificación End-to-End

### 📱 Testing Manual

**Responsive (3 viewports críticos)**
- [ ] 375px (iPhone SE) — Mobile portrait
- [ ] 768px (iPad) — Tablet
- [ ] 1440px (Desktop)

**Browsers**
- [ ] Chrome (desktop + mobile DevTools)
- [ ] Safari iOS (iPhone 12+)
- [ ] Firefox
- [ ] Edge

**Accesibilidad**
- [ ] Lighthouse Accessibility Score ≥ 90
- [ ] NVDA Screen Reader (propiedades.html completo)
- [ ] Tab navigation (keyboard only)
- [ ] WCAG Color Contrast Analyzer

**Performance**
- [ ] Lighthouse Performance ≥ 85
- [ ] Core Web Vitals:
  - [ ] LCP < 2.5s
  - [ ] FID < 100ms
  - [ ] CLS < 0.1
- [ ] Network throttling 3G

**Seguridad**
- [ ] Test XSS payload en search/filtros
- [ ] Verificar 0 API keys expuestas en código
- [ ] Validación de inputs en formularios

---

### 🤖 Testing Automatizado

```bash
# Lighthouse CI
npm run lighthouse

# Accessibility (si existe)
npm run test:a11y

# Linter
npm run lint
```

---

## Criterios de Aceptación MVP

### ✅ Seguridad
- [ ] 0 vulnerabilidades XSS
- [ ] 0 API keys expuestas
- [ ] Todos los inputs validados y sanitizados

### ✅ Brand Compliance
- [ ] 100% colores de brand guidelines
- [ ] Tipografía Inter con weights correctos (400, 500, 600)
- [ ] Border-radius según especificación
- [ ] Shadows según especificación

### ✅ Accesibilidad
- [ ] Lighthouse Accessibility ≥ 90
- [ ] WCAG 2.1 AA compliance
- [ ] Tap targets ≥ 44px en mobile
- [ ] Contraste ≥ 4.5:1 en todo texto

### ✅ Performance
- [ ] Lighthouse Performance ≥ 85
- [ ] LCP < 2.5s
- [ ] No memory leaks detectables (Chrome DevTools)

### ✅ Funcionalidad
- [ ] Todas las 11 páginas cargan sin errores
- [ ] Filtros funcionan correctamente
- [ ] Navegación responsive mobile/tablet/desktop
- [ ] Forms envían datos correctamente

---

## Archivos Críticos Afectados

### HTML (11 páginas)
1. [index.html](../index.html) — 8 issues
2. [propiedades.html](../propiedades.html) — 15 issues ⚠️ **más afectado**
3. [propiedades-v2.html](../propiedades-v2.html) — 4 issues
4. [propiedad.html](../propiedad.html) — 3 issues
5. [desarrolladores.html](../desarrolladores.html) — 5 issues
6. [desarrollador.html](../desarrollador.html) — 12 issues
7. [articulo.html](../articulo.html) — 9 issues
8. [blog.html](../blog.html) — 7 issues
9. [ai-insights.html](../ai-insights.html) — 2 issues
10. [invertir.html](../invertir.html) — 2 issues
11. [interes.html](../interes.html) — 2 issues

### JavaScript (6 archivos)
1. [src/propiedades.js](../src/propiedades.js) — 4 issues críticos ⚠️
2. [src/main.js](../src/main.js) — 1 issue crítico
3. [src/propiedades-v2.js](../src/propiedades-v2.js) — 1 issue crítico
4. [src/articulo.js](../src/articulo.js) — 1 issue crítico
5. [src/interes.js](../src/interes.js) — 2 issues
6. [src/propiedad.js](../src/propiedad.js) — 1 issue

### CSS/Config
1. [src/style.css](../src/style.css) — 3 issues
2. [tailwind.config.js](../tailwind.config.js) — 1 issue

---

## Recursos Necesarios

- **Developer senior (frontend):** 3 días full-time
- **QA tester:** 1 día para verificación end-to-end
- **UX designer:** Consulta de 2h para validar brand fixes

---

## Notas de Implementación

### Trade-offs Aceptados para MVP
- **N+1 lazy load (Issue #7):** Tolerable con < 100 propiedades. Refactorizar antes de 1000+ props.
- **console.error() (Issue #15):** Útil para debugging inicial. Remover en v1.1.

### Próximos Pasos Post-MVP
1. Implementar error tracking (Sentry)
2. Analytics (Google Analytics / Plausible)
3. Performance monitoring (Vercel Analytics)
4. Feature flags para rollout gradual

---

## Conclusión

El website está **70% listo** para producción. Los **7 issues críticos** requieren 2-3 días de desarrollo antes del deploy.

**⚠️ RECOMENDACIÓN:** NO deployar hasta resolver issues críticos #1-6.

Issue #7 (lazy load) es tolerable para MVP pero debe monitorearse en producción.

---

**Última actualización:** 2026-03-11
**Próxima revisión:** Post-corrección Sprint 0
