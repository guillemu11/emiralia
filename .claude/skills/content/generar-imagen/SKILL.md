---
name: generar-imagen
description: >
  Genera imágenes AI con KIE AI Nano Banana 2 para contenido inmobiliario: posts sociales,
  banners web, headers, creatividades de campañas. Invocar cuando pidan generar
  imagen, crear visual, diseño AI, banner, creatividad, ilustración, o /generar-imagen.
disable-model-invocation: false
argument-hint: "[descripción de imagen] [--size=square|landscape|portrait|wide] [--quality=standard|hd]"
allowed-tools:
  - Bash
  - Read
tools:
  - tools/images/generate-image.js
  - tools/images/track-generation.js
  - tools/db/memory.js
inputs:
  - PROMPT: Descripción detallada de la imagen a generar
  - SIZE: Tamaño/formato (square|landscape|portrait|wide). Default: square
  - QUALITY: Calidad de generación (standard|hd). Default: standard
outputs:
  type: file
  destination:
    category: filesystem
    target: apps/website/public/generated/
  write_mode: create_new
---

# Skill: Generar Imagen

## Qué hace este skill

Genera imágenes profesionales usando DALL-E 3 de OpenAI para contenido inmobiliario de Emiralia. Crea visuals para:

- Posts de Instagram/Facebook (square, portrait)
- Banners web y headers (landscape, wide)
- Creatividades de campañas de marketing
- Ilustraciones editoriales para blog

**Motor:** DALL-E 3 vía OpenAI API
**Tracking:** Todas las generaciones se registran en la tabla `generated_images` con prompt, costo y metadatos.

## Cuándo usar este skill

- Usuario solicita "generar una imagen de..."
- Necesitan visual para campaña o post específico
- Requieren ilustración conceptual de propiedad/zona
- Quieren banner hero para landing page
- Piden creatividad para redes sociales

## Tamaños disponibles

| Alias | Dimensiones | Ratio | Uso ideal |
|-------|-------------|-------|-----------|
| `square` | 1024×1024 | 1:1 | Instagram feed, thumbnails |
| `landscape` | 1792×1024 | 16:9 | Facebook cover, blog headers |
| `portrait` | 1024×1792 | 9:16 | Instagram/Facebook stories |
| `wide` | 1792×1024 | 16:9 | Website banners, hero sections |

## Calidad

- `standard`: $0.04 por imagen, generación rápida
- `hd`: $0.08 por imagen, mayor detalle y fidelidad

**Recomendación:** Usar `standard` para borradores/testing, `hd` para assets finales de campaña.

## Ejecución

### Paso 1: Validar inputs

- Verificar que el usuario proporcionó una descripción clara
- Si no hay `--size`, usar `square` por defecto
- Si no hay `--quality`, usar `standard` por defecto
- Si el prompt es muy corto (<10 palabras), pedir más detalles al usuario

### Paso 2: Construir prompt optimizado

DALL-E 3 funciona mejor con prompts descriptivos y específicos. Mejorar el input del usuario agregando contexto inmobiliario:

**Template para propiedades de lujo:**
```
[USER_PROMPT], professional real estate marketing photography,
high-end Dubai architecture, luxury lifestyle, modern design,
photorealistic, architectural visualization, 8k quality
```

**Template para conceptos abstractos:**
```
[USER_PROMPT], elegant minimalist design, professional marketing,
Dubai aesthetic, modern luxury, clean composition
```

**Ejemplo:**
- Input: "villa con piscina"
- Prompt mejorado: "Luxury beachfront villa with infinity pool overlooking Dubai Marina, professional real estate marketing photography, high-end Dubai architecture, modern design, sunset lighting, photorealistic, architectural visualization, 8k quality"

### Paso 3: Ejecutar generación

```bash
node tools/images/cli.js generate "$PROMPT_MEJORADO" --size=$SIZE --quality=$QUALITY
```

El CLI incluye tracking automático vía `track-generation.js`.

### Paso 4: Presentar resultado

Mostrar al usuario:
1. URL pública de la imagen: `/generated/{filename}`
2. Ruta en filesystem: `apps/website/public/generated/{filename}`
3. Prompt revisado (DALL-E puede modificar prompts por seguridad)
4. Costo de generación
5. Recordar que la imagen está disponible en el website público

**Formato de respuesta:**

```
✅ Imagen generada exitosamente

📸 Archivo: {filename}
🔗 URL: https://emiralia.com/generated/{filename}
📐 Tamaño: {size} ({dimensions})
🎨 Modelo: DALL-E 3 ({quality})
💰 Costo: ${cost} USD

📝 Prompt usado:
{original_prompt}

ℹ️  Prompt revisado por DALL-E:
{revised_prompt}

💡 Tip: La imagen está disponible públicamente en /generated/{filename}
```

### Paso 5: Persistir memoria

```bash
node tools/db/memory.js set content-agent last_image_generated_at "\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" shared
node tools/db/memory.js set content-agent last_image_url "\"/generated/{filename}\"" shared
node tools/db/memory.js set content-agent last_task_completed "\"generar-imagen\"" shared
```

## Comportamiento ante errores

| Error | Causa | Acción |
|-------|-------|--------|
| `OPENAI_API_KEY not configured` | API key falta en .env | Pedir al usuario configurar la key |
| `OpenAI quota exceeded` | Límite de billing agotado | Notificar al usuario, sugerir revisar billing en OpenAI |
| `Invalid prompt - safety system blocked` | DALL-E rechazó el prompt por políticas | Reformular prompt evitando contenido prohibido |
| Timeout | Generación tardó >60s | Reintentar una vez |
| Invalid size | Tamaño no soportado | Mostrar lista de tamaños válidos |

## Restricciones de contenido (DALL-E 3 Content Policy)

DALL-E 3 bloquea:
- Nombres de personas reales (celebridades, políticos)
- Marcas registradas explícitas (logos, nombres comerciales)
- Contenido violento, sexual, odio
- Intentos de generar rostros de personas específicas

**Estrategia:** Usar descripciones genéricas ("luxury villa" en vez de "Burj Khalifa replica", "businessman" en vez de "Elon Musk").

## Ejemplos de uso

```bash
# Post de Instagram para nueva propiedad
/generar-imagen Luxury 2-bedroom apartment in Dubai Marina with sea view, modern interior --size=square --quality=hd

# Banner web para landing page
/generar-imagen Dubai skyline at sunset with Palm Jumeirah, aerial photography --size=wide --quality=hd

# Story de Instagram para tour virtual
/generar-imagen Modern living room with floor-to-ceiling windows, Dubai cityscape view --size=portrait --quality=standard

# Header de blog sobre off-plan
/generar-imagen Construction site of luxury residential tower in Downtown Dubai, cranes, blue sky --size=landscape --quality=standard

# Creatividad abstracta para campaña
/generar-imagen Golden key on marble surface, luxury real estate concept, minimalist --size=square --quality=hd
```

## Prompts efectivos para inmobiliario

**Propiedades específicas:**
- "Luxury villa with private pool and garden, Dubai Hills Estate, modern architecture, drone view"
- "Penthouse living room with panoramic windows, Burj Khalifa view, sunset, interior design"
- "Off-plan apartment building under construction, Downtown Dubai, architectural visualization"

**Conceptos de marketing:**
- "Golden key on marble surface with Dubai skyline in background, luxury real estate concept"
- "Modern family in elegant living room, Dubai lifestyle, professional photography"
- "Investment growth chart with Dubai Marina in background, business concept"

**Estilos arquitectónicos:**
- "Contemporary Arabic architecture villa with geometric patterns, Dubai desert, luxury design"
- "Minimalist modern apartment interior, white and gold accents, floor-to-ceiling windows"
- "Traditional Arabic courtyard with modern touches, water feature, palm trees"

## Notas importantes

- **Una imagen a la vez:** DALL-E 3 solo genera 1 imagen por request (n=1 fijo)
- **Revised prompt:** DALL-E puede modificar tu prompt para mejorar calidad o cumplir políticas. Siempre mostrar el prompt revisado al usuario.
- **Costos:** Tracking automático en DB. Revisar costos acumulados con `node tools/images/cli.js stats`
- **Storage:** Imágenes se guardan en `apps/website/public/generated/` (accesibles vía web)
- **Formato:** Siempre JPEG (PNG para imágenes con transparencia no soportado por DALL-E 3)
- **Caché:** No hay caché de prompts. Cada generación consume crédito incluso si el prompt es idéntico.
- **Rate limits:** DALL-E tiene límites por minuto según tier de OpenAI. Si se excede, esperar 1-2 minutos.

## Delegación y batch

Si el usuario pide múltiples imágenes (batch):
1. Confirmar el número de imágenes y costo estimado total
2. Ejecutar secuencialmente (no paralelo, para evitar rate limits)
3. Mostrar progreso: "Generando 3/10..."
4. Recopilar URLs al final y presentar tabla resumen

**Ejemplo de batch:**
```
Usuario: "Genera 5 imágenes de villas de lujo en Dubai"

Respuesta:
"Voy a generar 5 imágenes. Costo estimado: $0.20 USD (5 × $0.04 standard).

Generando 1/5... ✓
Generando 2/5... ✓
Generando 3/5... ✓
Generando 4/5... ✓
Generando 5/5... ✓

Imágenes generadas:
1. /generated/2026-03-20_abc123.jpg - Modern villa with pool
2. /generated/2026-03-20_def456.jpg - Arabian style villa
..."
```

## Auditoría y monitoreo

Ver historial de generaciones:
```bash
node tools/images/cli.js list --limit=20
```

Ver estadísticas de uso:
```bash
node tools/images/cli.js stats
```

Ambos comandos consultan la tabla `generated_images`.

## Troubleshooting

**Problema:** Imagen no se muestra en el navegador
- **Solución:** Verificar que el servidor web esté sirviendo `apps/website/public/generated/`

**Problema:** Prompt rechazado constantemente
- **Solución:** Simplificar el prompt, evitar nombres propios, usar descripciones genéricas

**Problema:** Costos inesperadamente altos
- **Solución:** Verificar que se está usando `quality=standard` por defecto, no `hd`

**Problema:** Generación muy lenta
- **Solución:** DALL-E 3 puede tardar 10-30 segundos. Si tarda más, verificar conexión a internet y status de OpenAI API.