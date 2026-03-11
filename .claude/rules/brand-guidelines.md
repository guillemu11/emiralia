# Brand Guidelines — Emiralia 🇦🇪

## 1. Core Identity

Emiralia es una plataforma PropTech premium para inversores hispanohablantes interesados en el mercado inmobiliario de Emiratos Árabes Unidos.

La marca debe transmitir:
- **Confianza**
- **Claridad**
- **Datos**
- **Simplicidad**
- **Tecnología accesible**

**Inspiración visual:** Airbnb, Stripe, Apple.

**Sistema de diseño:** Light-First Design System

---

## 2. Design Strategy: The 80/20 Light-First Rule ⚡

**REGLA CRÍTICA:** 80% fondos claros, 20% fondos oscuros.

El sitio usa **fondo blanco dominante** con **secciones oscuras SOLO en casos estratégicos** para crear jerarquía visual y destacar CTAs críticos.

### Fondos Claros (usar el 80% del tiempo)

- **Main background**: `bg-white` — fondo principal de todas las páginas
- **Section alternating**: `bg-slate-50` — usar para alternar secciones y crear jerarquía visual
- **Card containers**: `bg-white` — **TODAS** las cards (propiedades, developers, features)

### Fondos Oscuros (SOLO el 20% del tiempo) — LISTA EXHAUSTIVA ⚠️

**Solo usar fondos oscuros (`bg-slate-900`) en:**

1. **Hero con overlay de imagen** — `bg-black/40` o `bg-slate-900/60` sobre imagen de fondo
2. **Footer** — `bg-slate-900` con `text-white`
3. **(Opcional) CTA final antes del footer** — `bg-slate-900` SOLO si es la última sección antes del footer y es un CTA de conversión crítico

### PROHIBIDO usar fondos oscuros en:

- ❌ Secciones de contenido (features, beneficios, estadísticas)
- ❌ Directorio de developers
- ❌ Listados de propiedades
- ❌ Simulador financiero
- ❌ Newsletter signup
- ❌ Timeline, KPIs, gráficos
- ❌ Formularios (excepto dentro de un CTA final oscuro permitido)

### Validación Rápida

**Si tu página tiene más de 2-3 secciones oscuras, está mal diseñada.**

---

## 3. Color System — Simplified Palette

Paleta de 12 tokens con asignaciones claras y específicas.

### Backgrounds (3 tokens)

| Token | Hex | Tailwind | Uso Específico | Prohibido en |
|-------|-----|----------|----------------|--------------|
| **Main BG** | `#FFFFFF` | `bg-white` | Fondo principal del sitio, cards, secciones de contenido | Hero overlay |
| **Section BG Alt** | `#F8FAFC` | `bg-slate-50` | Alternar secciones para jerarquía visual sutil | Más de 50% del sitio |
| **Dark Section** | `#0F172A` | `bg-slate-900` | **SOLO** hero overlay, footer, (opcional) CTA final | Contenido, features, developers, simulator, newsletter |

### Text (5 tokens)

#### Para Fondos Claros (bg-white, bg-slate-50)

| Token | Hex | Tailwind | Uso | Contrast sobre blanco |
|-------|-----|----------|-----|-----------------------|
| **Primary Text** | `#0F172A` | `text-slate-900` | Títulos, valores destacados, texto principal | 16:1 (AAA) ✅ |
| **Secondary Text** | `#475569` | `text-slate-600` | Descripciones, body text, labels de formularios | 7.5:1 (AAA) ✅ |
| **Muted Text** | `#94A3B8` | `text-slate-400` | Timestamps, metadata, placeholders | 4.6:1 (AA) ✅ |

#### Para Fondos Oscuros (bg-slate-900) SOLAMENTE

| Token | Hex | Tailwind | Uso | Contrast sobre oscuro |
|-------|-----|----------|-----|-----------------------|
| **White Text** | `#FFFFFF` | `text-white` | Títulos sobre hero/footer oscuros | 16:1 (AAA) ✅ |
| **Light Text** | `#CBD5E1` | `text-slate-300` | Descripciones sobre hero/footer oscuros | 8.2:1 (AAA) ✅ |

⚠️ **ADVERTENCIA CRÍTICA:**
- **NUNCA usar `text-white` o `text-slate-300` sobre fondos claros** → contraste 0:1, completamente ilegible
- **NUNCA usar `text-slate-900` o `text-slate-600` sobre fondos oscuros** → contraste insuficiente

### Interactive (2 tokens)

| Token | Hex | Tailwind | Uso |
|-------|-----|----------|-----|
| **Primary Action** | `#2563EB` | `bg-primary`, `text-primary`, `border-primary` | Botones CTA, links activos, iconos destacados |
| **Success** | `#16A34A` | `text-green-600` | ROI positivo, scores altos, badges de éxito |

### Borders & Surfaces (4 tokens)

| Token | Hex | Tailwind | Uso |
|-------|-----|----------|-----|
| **Border Default** | `#E5E7EB` | `border-gray-200` | Bordes de cards, separadores sutiles |
| **Border Emphasis** | `#CBD5E1` | `border-slate-300` | Hover state de cards, campos de formulario activos |
| **Light Fill** | `#F1F5F9` | `bg-slate-100` | Fondos de logos de developers, hover states suaves |
| **Card Background** | `#FFFFFF` | `bg-white` | Todas las cards (propiedades, developers, features) |

### Anti-Patterns Críticos de Contraste ⚠️

**NUNCA hacer esto:**

```html
<!-- ❌ ILEGIBLE: text-white sobre fondo blanco -->
<div class="bg-white p-4">
  <h3 class="text-white">Título</h3> <!-- Contraste 0:1 - INVISIBLE -->
  <p class="text-slate-300">Descripción</p> <!-- Contraste 1.5:1 - ILEGIBLE -->
</div>

<!-- ❌ ILEGIBLE: text-slate-900 sobre fondo oscuro -->
<div class="bg-slate-900 p-4">
  <h3 class="text-slate-900">Título</h3> <!-- Contraste 0:1 - INVISIBLE -->
  <p class="text-slate-600">Descripción</p> <!-- Contraste 2.3:1 - ILEGIBLE -->
</div>
```

**Hacer esto:**

```html
<!-- ✅ LEGIBLE: texto oscuro sobre fondo blanco -->
<div class="bg-white p-4">
  <h3 class="text-slate-900">Título</h3> <!-- Contraste 16:1 - PERFECTO -->
  <p class="text-slate-600">Descripción</p> <!-- Contraste 7.5:1 - PERFECTO -->
</div>

<!-- ✅ LEGIBLE: texto claro sobre fondo oscuro -->
<div class="bg-slate-900 p-4">
  <h3 class="text-white">Título</h3> <!-- Contraste 16:1 - PERFECTO -->
  <p class="text-slate-300">Descripción</p> <!-- Contraste 8.2:1 - PERFECTO -->
</div>
```

### Tokens Deprecados (no usar)

- ❌ `background-dark` → usar `bg-slate-900` solo en casos permitidos
- ❌ `section-bg` → usar `bg-slate-50` más consistente
- ❌ `secondary` → usar `primary` para todo lo interactivo
- ❌ `warning`, `danger` → solo usar cuando sea estrictamente necesario

---

## 4. Components Library

### 4.1 Section Container (Light — Default)

**Usar por defecto para todas las secciones de contenido.**

```html
<!-- Light Section (usar por defecto) -->
<section class="py-12 sm:py-24 bg-white">
  <div class="max-w-7xl mx-auto px-4 sm:px-6">
    <h2 class="text-3xl font-bold text-slate-900 mb-12">Título de Sección</h2>
    <!-- contenido -->
  </div>
</section>
```

**Alternar con fondo gris claro:**

```html
<!-- Light Section Alternating (usar para alternar con la anterior) -->
<section class="py-12 sm:py-24 bg-slate-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6">
    <h2 class="text-3xl font-bold text-slate-900 mb-12">Título de Sección</h2>
    <!-- contenido -->
  </div>
</section>
```

### 4.2 Section Container (Dark — SOLO hero/footer)

**SOLO para hero overlay, footer, o CTA final estratégico.**

```html
<section class="py-12 sm:py-24 bg-slate-900 text-white">
  <div class="max-w-7xl mx-auto px-4 sm:px-6">
    <h2 class="text-3xl font-bold text-white mb-12">Título de Sección</h2>
    <p class="text-slate-300">Descripción...</p>
  </div>
</section>
```

### 4.3 Property Card

```html
<div class="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer">
  <!-- Image -->
  <div class="mb-4 relative">
    <img src="property.jpg" alt="Property" class="w-full h-48 object-cover rounded-xl" />
    <div class="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
      Off-Plan
    </div>
  </div>

  <!-- Content -->
  <h3 class="text-lg font-bold text-slate-900 mb-2">Marina Bay Residences</h3>
  <p class="text-slate-600 text-sm mb-4">Dubai Marina • 2 BR</p>

  <!-- Metrics -->
  <div class="flex justify-between items-center">
    <div>
      <span class="text-slate-400 text-xs">Precio</span>
      <p class="text-slate-900 font-bold text-lg">$850,000</p>
    </div>
    <div class="text-right">
      <span class="text-slate-400 text-xs">ROI</span>
      <p class="text-green-600 font-bold text-lg">7.2%</p>
    </div>
  </div>
</div>
```

### 4.4 Developer Card

**IMPORTANTE: Developer cards siempre tienen fondo blanco con texto oscuro.**

```html
<div class="bg-white p-8 rounded-2xl border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer">
  <!-- Logo Container -->
  <div class="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center mb-6">
    <span class="text-2xl font-black text-slate-700">EMAAR</span>
  </div>

  <!-- Info -->
  <h4 class="font-bold text-slate-900 mb-2">Emaar Properties</h4>
  <div class="space-y-1 text-sm">
    <p class="flex justify-between">
      <span class="text-slate-600">Proyectos Activos</span>
      <span class="font-semibold text-slate-900">42</span>
    </p>
    <p class="flex justify-between">
      <span class="text-slate-600">Yield Promedio</span>
      <span class="font-semibold text-primary">6.8%</span>
    </p>
  </div>
</div>
```

**ANTI-PATTERN (NUNCA hacer esto):**

```html
<!-- ❌ INCORRECTO — NO hacer esto -->
<div class="bg-white p-8 rounded-2xl">
  <h4 class="font-bold text-white mb-2">Emaar</h4> <!-- ❌ text-white sobre bg-white = ilegible -->
  <span class="text-slate-300">Label</span> <!-- ❌ text-slate-300 sobre bg-white = bajo contraste -->
</div>
```

### 4.5 Feature Card (3-column grid)

```html
<div class="grid md:grid-cols-3 gap-6">
  <div class="p-6 bg-white rounded-2xl border border-gray-200 hover:border-slate-300 transition-all">
    <!-- Icon -->
    <div class="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
      <i data-lucide="trending-up" class="w-6 h-6 text-primary"></i>
    </div>

    <!-- Content -->
    <h3 class="font-bold text-slate-900 mb-2">Análisis en Tiempo Real</h3>
    <p class="text-slate-600 text-sm">Datos actualizados cada hora desde PropertyFinder.</p>
  </div>

  <!-- repetir 2 veces más -->
</div>
```

### 4.6 Buttons

```html
<!-- Primary CTA -->
<button class="bg-primary text-white px-8 py-4 rounded-full font-semibold shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all active:scale-[0.98]">
  Explorar Propiedades
</button>

<!-- Secondary Button -->
<button class="bg-white text-slate-900 px-8 py-4 rounded-full font-semibold border border-gray-200 hover:border-slate-300 hover:bg-slate-50 transition-all">
  Ver Desarrolladores
</button>

<!-- Ghost Button -->
<button class="bg-transparent text-slate-600 px-6 py-3 rounded-full font-medium hover:bg-slate-100 transition-all">
  Más Información
</button>
```

### 4.7 Form Inputs

```html
<!-- Hero Search Input (rounded-full) -->
<input
  type="text"
  placeholder="Buscar propiedades en Dubai, Abu Dhabi..."
  class="w-full px-6 py-4 rounded-full border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-white text-slate-900 placeholder:text-slate-400"
/>

<!-- Standard Form Input (rounded-xl) -->
<div class="space-y-2">
  <label class="text-sm font-medium text-slate-600">Email</label>
  <input
    type="email"
    placeholder="tu@correo.com"
    class="w-full px-5 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 bg-white text-slate-900 placeholder:text-slate-400"
  />
</div>
```

### 4.8 Navigation Bar

```html
<nav class="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
    <!-- Logo -->
    <a href="/" class="flex items-center gap-2">
      <i data-lucide="building-2" class="w-8 h-8 text-primary"></i>
      <span class="text-xl font-bold text-slate-900">EMIRALIA</span>
    </a>

    <!-- Nav Links (desktop) -->
    <div class="hidden md:flex items-center gap-8">
      <a href="/propiedades" class="text-slate-600 hover:text-slate-900 font-medium transition-colors">
        Propiedades
      </a>
      <a href="/desarrolladores" class="text-slate-600 hover:text-slate-900 font-medium transition-colors">
        Desarrolladores
      </a>
      <a href="/blog" class="text-slate-600 hover:text-slate-900 font-medium transition-colors">
        Blog
      </a>
    </div>

    <!-- CTA -->
    <button class="bg-primary text-white px-6 py-2.5 rounded-full font-semibold hover:bg-blue-700 transition-all">
      Contactar
    </button>
  </div>
</nav>
```

### 4.9 Footer (Dark)

```html
<footer class="bg-slate-900 text-white py-16 border-t border-slate-800">
  <div class="max-w-7xl mx-auto px-4 sm:px-6">
    <!-- Logo -->
    <div class="mb-12">
      <a href="/" class="flex items-center gap-2">
        <i data-lucide="building-2" class="w-8 h-8 text-primary"></i>
        <span class="text-xl font-bold text-white">EMIRALIA</span>
      </a>
      <p class="text-slate-400 mt-3 max-w-md">
        La primera plataforma en español que analiza el mercado inmobiliario de Emiratos en tiempo real.
      </p>
    </div>

    <!-- Columns -->
    <div class="grid md:grid-cols-4 gap-12 mb-12">
      <div>
        <h4 class="font-bold text-white mb-4">Propiedades</h4>
        <ul class="space-y-3 text-slate-400">
          <li><a href="#" class="hover:text-white transition-colors">Dubai</a></li>
          <li><a href="#" class="hover:text-white transition-colors">Abu Dhabi</a></li>
          <li><a href="#" class="hover:text-white transition-colors">Off-Plan</a></li>
        </ul>
      </div>
      <!-- repetir 3 veces más -->
    </div>

    <!-- Bottom -->
    <div class="pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-400 text-sm">
      <p>© 2024 Emiralia. Todos los derechos reservados.</p>
      <div class="flex gap-6">
        <a href="#" class="hover:text-white transition-colors">Privacidad</a>
        <a href="#" class="hover:text-white transition-colors">Términos</a>
        <a href="#" class="hover:text-white transition-colors">Contacto</a>
      </div>
    </div>
  </div>
</footer>
```

---

## 5. Layout Patterns

### Ejemplo Correcto: Home Page Layout ✅

```
Estructura ideal de index.html:

1. Hero (dark overlay sobre imagen)     → bg-gradient overlay sobre imagen ✅
2. Search Bar Section (light)           → bg-white ✅
3. Featured Properties (light)          → bg-slate-50 (alternar) ✅
4. Developers Section (light)           → bg-white ✅
5. Map/Stats Section (light)            → bg-slate-50 (alternar) ✅
6. Simulator Section (light)            → bg-white ✅
7. Newsletter CTA (light)               → bg-slate-50 (alternar) ✅
8. Footer (dark)                        → bg-slate-900 ✅

Total: 6 secciones light, 2 dark = 75% light ✅
```

### Anti-Pattern: Estado Actual (INCORRECTO) ❌

```
Estado anterior de index.html (ANTES del rediseño):

1. Hero (dark)                          → OK ✅
2. Search inline hero                   → OK ✅
3. Featured Properties (light)          → OK ✅
4. Developers Section (DARK)            → ❌ bg-slate-800 — NO hay razón para dark aquí
5. Map Section (light)                  → OK ✅
6. Simulator Section (DARK)             → ❌ bg-slate-900 — NO hay razón para dark aquí
7. Newsletter CTA (DARK)                → ❌ bg-slate-800 implícito — NO hay razón
8. Footer (dark)                        → OK ✅

Total: 3 light, 5 dark = 37.5% light ❌
```

**Por qué es un anti-pattern:**
- Developers section no necesita fondo oscuro (es contenido informativo, no un CTA)
- Simulator section debería ser light para que las cards blancas destaquen naturalmente
- Newsletter CTA puede ser light con botón primary destacado

---

## 6. Typography

**Font:** Inter

**Weights:**
- `font-bold` (600) → títulos
- `font-semibold` (600) → valores destacados, botones
- `font-medium` (500) → UI, navegación
- `font-normal` (400) → body text

**Line-height:**
- `leading-tight` → títulos grandes (hero)
- `leading-relaxed` → body text, descripciones

---

## 7. Iconography

**Librería:** Lucide icons

**Style:**
- Stroke width: light
- Color por defecto: `text-slate-500` (secondary text)
- Color en interactive states: `text-primary`

**Uso:**
```html
<i data-lucide="trending-up" class="w-6 h-6 text-primary"></i>
```

---

## 8. Border Radius & Shadow System

### Border Radius

| Tamaño | Tailwind | Uso |
|--------|----------|-----|
| **2xl** | `rounded-2xl` (24px) | Tarjetas, cards de propiedades, cards de developers |
| **3xl** | `rounded-3xl` (32px) | Contenedores grandes (mapa, simulator card) |
| **full** | `rounded-full` | Inputs, buscadores, botones, badges |
| **xl** | `rounded-xl` (12px) | Elementos internos (logos developer, icon containers, imágenes) |

### Shadow System

| Shadow | Tailwind | Uso |
|--------|----------|-----|
| **sm** | `shadow-sm` | Estado base de tarjetas (sutil) |
| **xl** | `shadow-xl` | Hover en tarjetas, simulator card |
| **2xl** | `shadow-2xl` | Buscador hero, dark section cards |
| **glow** | `shadow-lg shadow-primary/20` | Botones CTA principales (glow azul) |

---

## 9. Contrast & Accessibility

### Tabla de Contrastes WCAG

| Combinación | Contrast Ratio | WCAG Level | Uso |
|-------------|----------------|------------|-----|
| `#0F172A` sobre `#FFFFFF` | 16:1 | AAA | Títulos principales |
| `#475569` sobre `#FFFFFF` | 7.5:1 | AAA | Texto body |
| `#94A3B8` sobre `#FFFFFF` | 4.6:1 | AA | Metadata, placeholders |
| `#FFFFFF` sobre `#0F172A` | 16:1 | AAA | Texto en footer/hero |
| `#CBD5E1` sobre `#0F172A` | 8.2:1 | AAA | Texto secundario en dark |
| `#2563EB` sobre `#FFFFFF` | 6.4:1 | AA | Botones, links |

**Herramienta de verificación:** https://webaim.org/resources/contrastchecker/

**Criterio mínimo:** 4.5:1 para texto normal (WCAG AA)

---

## 10. Pre-Implementation Checklist

**Antes de diseñar cualquier página, verificar:**

- [ ] **80/20 Rule**: Contar secciones dark. Si > 2-3 → REJECT, rediseñar
- [ ] **Componentes**: Solo usar componentes documentados en sección 4
- [ ] **Paleta**: Solo usar los 12 tokens del Color System (sección 3)
- [ ] **Texto sobre blanco**: `text-slate-900` títulos, `text-slate-600` body
- [ ] **Texto sobre oscuro**: `text-white` títulos, `text-slate-300` body
- [ ] **Cards**: Siempre `bg-white` con `border-gray-200`, NUNCA `text-white` dentro
- [ ] **Contrast WCAG**: Verificar 4.5:1 mínimo (usar WebAIM Contrast Checker)
- [ ] **No emojis**: Solo Lucide icons
- [ ] **Responsive**: Probar en 375px (mobile), 768px (tablet), 1440px (desktop)
- [ ] **Alternation**: Sections alternan `bg-white` → `bg-slate-50` → `bg-white`

---

## 11. Validation Rules (Automatizables)

### Rule 1: Dark Section Audit

**Antes de implementar cualquier diseño:**

```bash
# Contar secciones con fondo oscuro
grep -c "bg-slate-[89]00\|bg-black" index.html
```

**Criterio de aprobación:**
- ✅ 0-2 secciones oscuras → PASS
- ⚠️ 3 secciones oscuras → REVIEW (solo si la 3ra es CTA final válido)
- ❌ 4+ secciones oscuras → REJECT, rediseñar

### Rule 2: Developer Cards Text Color Audit

**Validar que developer cards NO tengan text-white:**

```bash
# Buscar el anti-pattern
grep -A 10 "Proyectos por Desarrollador" index.html | grep "text-white"
```

**Código correcto de developer card:**
- Background: `bg-white`
- Title: `text-slate-900` (NO `text-white`)
- Metrics label: `text-slate-600`
- Metrics value: `text-slate-900` o `text-primary`

### Rule 3: Section Alternation Consistency

**Verificar que las secciones alternen correctamente:**

**Patrón válido:**
```
bg-white → bg-slate-50 → bg-white → bg-slate-50 → ... → bg-slate-900 (footer)
```

**Patrón inválido:**
```
bg-white → bg-slate-800 → bg-white → bg-slate-900 → ... ❌
```

---

## 12. UX Principles

- **Clean layouts** — Mucho whitespace, no apretar contenido
- **Clear hierarchy** — Títulos grandes, secciones bien separadas
- **Mobile-first** — Diseñar primero para móvil, luego desktop
- **Large tap targets** — Mínimo 44px de altura en botones/links
- **Search-centric navigation** — El buscador es el elemento más importante

---

## 13. Tone of Voice

**Profesional**
**Claro**
**Basado en datos**

Evitar lenguaje excesivamente técnico.
Usar español natural para mercado hispanohablante (España y Latinoamérica).

---

## Application

Esta regla se aplica a:
- UI generation
- Landing pages
- Dashboards
- Marketing sections
- Banners
- Cualquier diseño de interfaz de Emiralia
