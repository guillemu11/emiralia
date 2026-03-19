---
name: estrategia-producto
description: >
  Usar cuando se necesite definir o revisar la estrategia de producto de Emiralia:
  visión, segmentos objetivo, propuesta de valor, métricas clave y defensibilidad.
  Genera un Product Strategy Canvas completo de 9 secciones adaptado al mercado
  inmobiliario de EAU para el segmento hispanohablante.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[area: vision|segmentos|metricas|defensibilidad|completo]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - FOCUS: Área de estrategia a trabajar (opcional, default: completo)
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Estrategia de Producto

## ¿Qué hace este skill?

Genera un **Product Strategy Canvas** de 9 secciones para Emiralia, adaptado al contexto PropTech de Emiratos Árabes Unidos y dirigido al mercado hispanohablante. El canvas funciona como el documento estratégico maestro que alinea a todos los agentes.

## Cuándo usarlo

- Al inicio del proyecto para definir la dirección estratégica.
- Cuando se necesite pivotar o ajustar la estrategia ante cambios de mercado.
- Antes de un fundraising o pitch que requiera articular la visión.
- Cuando un nuevo agente necesite entender el "por qué" de Emiralia.

---

## Proceso paso a paso

Actúa como un **Product Strategist senior** especializado en PropTech y marketplaces. Para `$ARGUMENTS`:

### Paso 1: Consultar estado actual
```bash
node tools/db/wat-memory.js status
node tools/db/memory.js get pm-agent strategy_canvas_version
```

### Paso 2: Generar las 9 secciones del canvas

Para cada sección, analiza el contexto de Emiralia y produce contenido específico y accionable.

**Contexto del mercado a considerar:**
- Mercado inmobiliario de EAU: Dubai, Abu Dhabi, Sharjah, Ajman, RAK
- Compradores internacionales representan ~40% de transacciones en Dubai
- Golden Visa disponible para inversiones inmobiliarias desde 750,000 AED
- Comunidades principales: Dubai Marina, Downtown, JVC, Business Bay, Palm Jumeirah, Dubai Hills, Creek Harbour
- Developers principales: Emaar, Nakheel, DAMAC, Sobha, Aldar, Meraas, Dubai Properties
- Regulador: RERA (Real Estate Regulatory Agency), DLD (Dubai Land Department)
- Moneda: AED (1 EUR ≈ 4 AED)

### Paso 3: Validar coherencia entre secciones
- La visión debe ser alcanzable con las capacidades descritas.
- Los trade-offs deben ser coherentes con los segmentos elegidos.
- Las métricas deben medir el progreso hacia la visión.

### Paso 4: Persistir resultado

---

## Plantilla de output

```markdown
# Product Strategy Canvas — Emiralia
**Fecha**: [fecha]
**Versión**: [N]

## 1. Visión
[Declaración de visión a 3-5 años. Debe inspirar y ser alcanzable.]

Ejemplo base: "Ser el buscador de referencia de propiedades en EAU para compradores e inversores hispanohablantes, ofreciendo la experiencia de búsqueda más completa, transparente y culturalmente adaptada del mercado."

## 2. Segmentos Objetivo
| Segmento | Descripción | Tamaño estimado | Prioridad |
|----------|-------------|-----------------|-----------|
| Inversores España | Profesionales/empresarios que buscan diversificar en Dubai | [N] | [Alta/Media] |
| Inversores LatAm | Protección de capital desde Venezuela, Argentina, Colombia | [N] | [Alta/Media] |
| Expats hispanos EAU | Ya viven en Dubai, quieren comprar vs alquilar | [N] | [Alta/Media] |

## 3. Propuesta de Valor Diferencial
[¿Por qué Emiralia y no PropertyFinder + Google Translate?]
- Búsqueda 100% en español con terminología inmobiliaria precisa
- Contexto legal y fiscal de EAU explicado para extranjeros
- Comparativas de rentabilidad por zona y tipo de propiedad
- Asesoramiento cultural: qué esperar del proceso de compra en EAU

## 4. Trade-offs (Qué NO hacemos)
| Hacemos | NO hacemos |
|---------|-----------|
| Buscador de propiedades | Agencia inmobiliaria (no vendemos directamente) |
| Mercado EAU | Otros mercados (no cubrimos Turquía, Portugal, etc.) |
| Público hispanohablante | Público anglófono o árabe (ya tienen PropertyFinder/Bayut) |
| Contenido educativo | Asesoría legal vinculante |

## 5. Métricas Norte
| Métrica | Tipo | Target Q1 | Target Q4 |
|---------|------|-----------|-----------|
| Propiedades indexadas en español | Cobertura | [N] | [N] |
| Leads cualificados / semana | North Star | [N] | [N] |
| Tasa contacto agente | Conversión | [%] | [%] |
| Tráfico orgánico mensual | Adquisición | [N] | [N] |

## 6. Defensibilidad
| Barrera | Descripción | Fortaleza |
|---------|-------------|-----------|
| Marca | Primera marca PropTech en español para EAU | Media (en construcción) |
| Datos propietarios | Dataset limpio y enriquecido en español | Alta |
| Audiencia nicho | Comunidad de inversores hispanos fidelizada | Alta (a largo plazo) |
| SEO | Dominio de keywords en español para real estate EAU | Alta |

## 7. Estrategia de Crecimiento
[Canales prioritarios y loops de crecimiento]
- SEO en español: contenido de alto valor sobre inversión en EAU
- Partnerships con promotoras: Emaar, DAMAC (leads bidireccionales)
- Comunidades: Telegram/WhatsApp de inversores hispanohablantes
- YouTube: análisis de mercado y tours de propiedades

## 8. Capacidades Críticas
| Capacidad | Estado actual | Agente responsable |
|-----------|---------------|-------------------|
| Scraping en tiempo real | ✅ Activo (PropertyFinder) | Data Agent |
| Contenido en español | ✅ Activo | Content Agent |
| Agentes IA coordinados | ✅ Framework WAT | Todos |
| UI/UX premium | 🔧 En desarrollo | Frontend Agent |
| SEO técnico y contenido | ⏳ Pendiente | SEO Agent |

## 9. Estructura de Costes
| Concepto | Coste mensual estimado | Tipo |
|----------|----------------------|------|
| Apify (scraping) | $49-99/mes | Variable |
| Hosting (VPS/Cloud) | $20-50/mes | Fijo |
| APIs IA (Claude, etc.) | $50-200/mes | Variable |
| Dominio + DNS | $2/mes | Fijo |
| PostgreSQL hosting | $0 (Docker local) / $15 (cloud) | Fijo |
```

---

## Persistencia

```bash
# Guardar en pm_reports
node tools/db/save_research.js --title "Product Strategy Canvas v[N]" --summary "Canvas estratégico de 9 secciones"

# Actualizar memoria compartida
node tools/db/memory.js set pm-agent strategy_canvas_version '"[N]"' shared
node tools/db/memory.js set pm-agent strategy_canvas_updated_at '"[timestamp]"' shared
```

---

## Notas

- El canvas debe revisarse **trimestralmente** o ante cambios significativos del mercado.
- Si se genera un canvas parcial (solo una sección), indicar claramente qué secciones faltan.
- Las métricas deben ser cuantificables y tener un target temporal.
- Consultar `/analisis-competidores` y `/tamanio-mercado` como inputs complementarios.
