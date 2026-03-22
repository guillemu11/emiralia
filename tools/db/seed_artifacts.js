/**
 * Seed artifacts for Agent Workspaces (Project 039)
 * Usage:
 *   node tools/db/seed_artifacts.js          → insert seed data
 *   node tools/db/seed_artifacts.js --clean  → remove all seeded artifacts
 */

import pool from './pool.js';

// ─── ARTIFACT IDs (fijos para poder hacer --clean) ───────────────────────────

const IDS = {
  // Content Agent
  C1: 'a0000001-0000-0000-0000-000000000001',
  C2: 'a0000001-0000-0000-0000-000000000002',
  C3: 'a0000001-0000-0000-0000-000000000003',
  C4: 'a0000001-0000-0000-0000-000000000004',
  C5: 'a0000001-0000-0000-0000-000000000005',
  C6: 'a0000001-0000-0000-0000-000000000006',
  // Social Media Agent
  S1: 'a0000002-0000-0000-0000-000000000001',
  S2: 'a0000002-0000-0000-0000-000000000002',
  S3: 'a0000002-0000-0000-0000-000000000003',
  S4: 'a0000002-0000-0000-0000-000000000004',
  // Marketing Agent
  M1: 'a0000003-0000-0000-0000-000000000001',
  M2: 'a0000003-0000-0000-0000-000000000002',
  M3: 'a0000003-0000-0000-0000-000000000003',
  M4: 'a0000003-0000-0000-0000-000000000004',
  // Analytics Agent
  A1: 'a0000004-0000-0000-0000-000000000001',
  A2: 'a0000004-0000-0000-0000-000000000002',
  A3: 'a0000004-0000-0000-0000-000000000003',
  A4: 'a0000004-0000-0000-0000-000000000004',
  // Legal Agent
  L1: 'a0000005-0000-0000-0000-000000000001',
  L2: 'a0000005-0000-0000-0000-000000000002',
  L3: 'a0000005-0000-0000-0000-000000000003',
  L4: 'a0000005-0000-0000-0000-000000000004',
  L5: 'a0000005-0000-0000-0000-000000000005',
  L6: 'a0000005-0000-0000-0000-000000000006',
  L7: 'a0000005-0000-0000-0000-000000000007',
  // Data Agent
  D1: 'a0000006-0000-0000-0000-000000000001',
  D2: 'a0000006-0000-0000-0000-000000000002',
  D3: 'a0000006-0000-0000-0000-000000000003',
  D4: 'a0000006-0000-0000-0000-000000000004',
  // Frontend Agent
  F1: 'a0000007-0000-0000-0000-000000000001',
  F2: 'a0000007-0000-0000-0000-000000000002',
  F3: 'a0000007-0000-0000-0000-000000000003',
  // Dev Agent
  V1: 'a0000008-0000-0000-0000-000000000001',
  V2: 'a0000008-0000-0000-0000-000000000002',
  V3: 'a0000008-0000-0000-0000-000000000003',
  // SEO Agent
  E1: 'a0000009-0000-0000-0000-000000000001',
  E2: 'a0000009-0000-0000-0000-000000000002',
  E3: 'a0000009-0000-0000-0000-000000000003',
  E4: 'a0000009-0000-0000-0000-000000000004',
  E5: 'a0000009-0000-0000-0000-000000000005',
  // PM Agent
  P1: 'a0000010-0000-0000-0000-000000000001',
  P2: 'a0000010-0000-0000-0000-000000000002',
  P3: 'a0000010-0000-0000-0000-000000000003',
  P4: 'a0000010-0000-0000-0000-000000000004',
  // WAT Auditor
  W1: 'a0000011-0000-0000-0000-000000000001',
  W2: 'a0000011-0000-0000-0000-000000000002',
  // Research Agent
  R1: 'a0000012-0000-0000-0000-000000000001',
  R2: 'a0000012-0000-0000-0000-000000000002',
  R3: 'a0000012-0000-0000-0000-000000000003',
  R4: 'a0000012-0000-0000-0000-000000000004',
};

const ALL_IDS = Object.values(IDS);

// ─── ARTIFACTS ───────────────────────────────────────────────────────────────

const ARTIFACTS = [

  // ── CONTENT AGENT ──────────────────────────────────────────────────────────

  {
    id: IDS.C1,
    agent_id: 'content-agent',
    type: 'blog_post',
    status: 'published',
    title: 'Guía Completa para Invertir en Dubai Marina en 2026',
    content: `# Guía Completa para Invertir en Dubai Marina en 2026

Dubai Marina es uno de los barrios más codiciados por inversores hispanohablantes. Con un rendimiento bruto promedio del **7.1%** y una apreciación del 18% en los últimos 24 meses, las cifras hablan por sí solas.

## ¿Por qué Dubai Marina?

Dubai Marina es un distrito residencial premium ubicado junto al mar, con más de 200 torres residenciales y una marina que alberga yates de hasta 50 metros. Es el hogar de más de 45.000 residentes de más de 100 nacionalidades.

**Datos clave (marzo 2026):**
- Precio medio por m²: AED 2.847 (≈ €712)
- Rendimiento bruto: 6.8% – 8.2%
- Apreciación acumulada 2024-2026: +18.3%
- Tiempo medio de venta: 34 días

## Tipos de propiedad más rentables

### Studios y 1 Bedroom (inversión de entrada)
Precio: AED 650.000 – 1.100.000 (€163.000 – €275.000)
Rendimiento: 7.8% – 8.2% bruto
Perfil ideal: inversor que busca cash flow inmediato.

### 2 Bedrooms (sweet spot)
Precio: AED 1.300.000 – 2.200.000 (€325.000 – €550.000)
Rendimiento: 6.8% – 7.4% bruto
Mayor liquidez en el mercado de alquiler.

## Proceso de compra paso a paso

1. Reserva con 5-10% del precio
2. MOU (Memorandum of Understanding) y due diligence
3. NOC del developer (3-5 días hábiles)
4. Registro en DLD — pago del 4% DLD fee
5. Escritura de propiedad (Title Deed)

## Gastos adicionales a contemplar

| Concepto | Importe |
|----------|---------|
| DLD Registration Fee | 4% del precio |
| Agency Fee | 2% del precio |
| Trustee Fee | AED 4.000 – 10.000 |
| Mantenimiento anual | AED 15 – 25/m² |

## Zonas con mejor ROI en Dubai Marina

1. **Marina Walk** — acceso directo al paseo marítimo
2. **JBR (Jumeirah Beach Residence)** — demanda turística alta
3. **Media City lado** — perfil profesional, menor rotación

*Datos actualizados a marzo 2026. Consulta siempre con un agente RERA certificado.*`,
    metadata: {
      slug: 'guia-invertir-dubai-marina-2026',
      keywords: ['invertir dubai marina', 'propiedades dubai marina', 'rendimiento dubai 2026'],
      language: 'es-ES',
      tone: 'informativo',
      word_count: 680,
      seo_score: 87,
      reading_time_min: 4,
    },
    created_at: '2026-03-10 09:00:00',
    updated_at: '2026-03-14 11:30:00',
  },

  {
    id: IDS.C2,
    agent_id: 'content-agent',
    type: 'blog_post',
    status: 'approved',
    title: 'Golden Visa UAE: Todo lo que Necesitas Saber como Inversor Hispano',
    content: `# Golden Visa UAE: Todo lo que Necesitas Saber

La Golden Visa de Emiratos Árabes Unidos ha transformado las reglas del juego para inversores extranjeros. Desde 2022, cualquier persona que invierta un mínimo de **AED 2.000.000** (≈ €500.000) en propiedades puede optar a esta residencia de 10 años renovable.

## ¿Qué es la Golden Visa?

Es un permiso de residencia de larga duración (10 años, renovable automáticamente) que permite vivir, trabajar y estudiar en los UAE sin necesidad de sponsor local.

## Requisitos para inversores inmobiliarios

- Propiedad con valor mínimo de AED 2.000.000
- La propiedad puede estar en construcción (off-plan) si el developer está aprobado por DLD
- No es necesario ser residente permanente
- Puede incluir propiedades con hipoteca si el equity supera AED 2M

## Beneficios principales

✅ Residencia de 10 años renovable
✅ Sin requisito de permanencia mínima en UAE
✅ Incluye familia directa (cónyuge e hijos)
✅ Acceso a cuenta bancaria UAE
✅ Sin impuesto sobre la renta personal
✅ Libre circulación por los 7 emiratos`,
    metadata: {
      slug: 'golden-visa-uae-inversores-hispanos',
      keywords: ['golden visa dubai', 'residencia dubai inversión', 'visa inversor dubai'],
      language: 'es-ES',
      tone: 'informativo',
      word_count: 420,
      seo_score: 91,
    },
    created_at: '2026-03-15 10:00:00',
    updated_at: '2026-03-18 14:00:00',
  },

  {
    id: IDS.C3,
    agent_id: 'content-agent',
    type: 'blog_post',
    status: 'pending_review',
    title: 'Off-Plan vs Ready: ¿Cuál es la Mejor Opción para Invertir en Dubai en 2026?',
    content: `# Off-Plan vs Ready: ¿Cuál es la Mejor Opción?

Una de las preguntas más frecuentes entre inversores hispanohablantes que se acercan al mercado de Dubai es: ¿compro sobre plano o busco una propiedad lista para habitar?

La respuesta depende de tu perfil inversor, horizonte temporal y tolerancia al riesgo. En esta guía analizamos ambas opciones con datos reales del mercado de marzo 2026.

## Off-Plan: Ventajas

- **Precio de entrada inferior:** 15-25% por debajo del precio de mercado
- **Planes de pago flexibles:** 20/80, 30/70, 40/60 con pagos durante construcción
- **Apreciación durante construcción:** promedio 12-18% en proyectos Emaar/DAMAC
- **Personalización:** elección de acabados y orientación

## Off-Plan: Riesgos

- Riesgo de retraso en entrega (promedio 8-14 meses en Dubai)
- Sin ingresos de alquiler durante construcción
- Dependencia del developer (seleccionar solo RERA Grade A)

## Ready: Ventajas

- Ingresos de alquiler desde el día 1
- Menor riesgo (propiedad tangible)
- Posibilidad de hipoteca para no residentes

## Veredicto por perfil

| Perfil | Recomendación |
|--------|---------------|
| Cash flow inmediato | Ready |
| Horizonte 3-5 años | Off-Plan en proyecto top |
| Presupuesto limitado | Off-Plan con buen developer |
| Primera compra | Ready (menor complejidad) |`,
    metadata: {
      slug: 'off-plan-vs-ready-dubai-2026',
      keywords: ['off-plan dubai', 'comprar sobre plano dubai', 'inversión inmobiliaria dubai'],
      language: 'es-ES',
      tone: 'comparativo',
      word_count: 380,
    },
    created_at: '2026-03-20 08:30:00',
    updated_at: '2026-03-20 08:30:00',
  },

  {
    id: IDS.C4,
    agent_id: 'content-agent',
    type: 'property_listing',
    status: 'published',
    title: 'Apartamento 2BR en Business Bay — Vistas al Canal de Dubai',
    content: `Apartamento de 2 dormitorios en Business Bay con vistas directas al Dubai Water Canal. Acabados de lujo, cocina equipada Siemens, suelos de mármol italiano. Acceso a piscina infinity, gimnasio y zona de coworking.

**Proyecto:** Canal Crown by DAMAC
**Entrega:** Q4 2026
**Tipo:** Off-Plan`,
    metadata: {
      price_aed: 1850000,
      price_eur: 462500,
      area_sqft: 1240,
      bedrooms: 2,
      bathrooms: 2,
      zone: 'Business Bay',
      emirate: 'Dubai',
      developer: 'DAMAC Properties',
      project: 'Canal Crown',
      delivery: 'Q4 2026',
      type: 'off_plan',
      roi_gross: 7.4,
      floor: 28,
      view: 'Canal View',
      amenities: ['infinity pool', 'gym', 'coworking', 'concierge', 'valet parking'],
      images: ['canal-crown-exterior.jpg', 'canal-crown-living.jpg', 'canal-crown-view.jpg'],
      rera_number: 'RERA-2024-BBC-7821',
    },
    created_at: '2026-03-08 12:00:00',
    updated_at: '2026-03-12 09:00:00',
  },

  {
    id: IDS.C5,
    agent_id: 'content-agent',
    type: 'property_listing',
    status: 'draft',
    title: 'Villa 4BR en Palm Jumeirah — Acceso Privado a Playa y Piscina',
    content: `Villa independiente de 4 dormitorios en The Fronds, Palm Jumeirah. La única zona de villas con acceso privado a playa. Piscina privada, jardín de 400m², garaje para 3 vehículos.`,
    metadata: {
      price_aed: 18500000,
      price_eur: 4625000,
      area_sqft: 5800,
      bedrooms: 4,
      bathrooms: 5,
      zone: 'Palm Jumeirah',
      emirate: 'Dubai',
      developer: 'Nakheel',
      type: 'ready',
      roi_gross: 4.8,
      view: 'Sea View + Beach Access',
      amenities: ['private pool', 'private beach', 'garden', 'maid room', 'driver room'],
    },
    created_at: '2026-03-22 16:00:00',
    updated_at: '2026-03-22 16:00:00',
  },

  {
    id: IDS.C6,
    agent_id: 'content-agent',
    type: 'email_template',
    status: 'published',
    title: 'Newsletter Mensual: Oportunidades de Inversión en Dubai — Marzo 2026',
    content: `Asunto: 🏙️ Dubai Marzo 2026: Las 3 mejores oportunidades que hemos encontrado

Hola {{nombre}},

Este mes hemos analizado más de 2.800 propiedades en el mercado de Dubai para traerte solo las que realmente valen la pena.

**Top 3 oportunidades de marzo:**

1. **Business Bay — 2BR desde €462.000** | ROI 7.4% | Entrega Q4 2026
2. **JVC — Studio desde €118.000** | ROI 8.7% | Entrega completada
3. **Dubai Marina — 1BR desde €235.000** | ROI 7.8% | Vista al mar

[Ver propiedades →]

**Mercado en datos:**
- Transacciones DLD marzo: +23% vs marzo 2025
- Precio medio m²: AED 1.847 (+8.1% YoY)
- Alquileres: subida del 12% en zonas prime

¿Tienes dudas sobre la Golden Visa o el proceso de compra? Nuestro Legal Agent responde en menos de 24h.

Un abrazo,
Equipo Emiralia`,
    metadata: {
      subject: '🏙️ Dubai Marzo 2026: Las 3 mejores oportunidades que hemos encontrado',
      language: 'es-ES',
      segment: 'all_subscribers',
      platform: 'brevo',
      campaign_name: 'newsletter-marzo-2026',
      variables: ['nombre'],
    },
    created_at: '2026-03-18 09:00:00',
    updated_at: '2026-03-20 10:00:00',
  },

  // ── SOCIAL MEDIA AGENT ─────────────────────────────────────────────────────

  {
    id: IDS.S1,
    agent_id: 'social-media-agent',
    type: 'video_script',
    status: 'published',
    title: 'Fernando 60s IG Reel: ¿Por qué Dubai es el mejor mercado inmobiliario del mundo?',
    content: `HOOK (0-3s):
"Si te dijera que puedes comprar un apartamento en Dubai por menos de lo que cuesta uno en Madrid... ¿me creerías?"

[Fernando aparece frente a la skyline de Dubai Marina al atardecer]

DESARROLLO (3-45s):
"Hola, soy Fernando, y llevo 3 años analizando mercados inmobiliarios en todo el mundo. Y hoy te voy a explicar por qué Dubai no es solo la moda del momento, es el mercado más sólido del planeta ahora mismo."

"Primero: los números. Rentabilidad bruta del 7 al 9 por ciento. En Madrid estamos hablando de un 3 o 4. En Barcelona, menos. Y eso sin contar que en Dubai no pagas impuesto sobre la renta. Cero."

"Segundo: la seguridad jurídica. El DLD, que es el equivalente al registro de la propiedad, es uno de los más transparentes del mundo. Todo queda registrado, todo queda protegido."

"Tercero: la Golden Visa. Si inviertes 500.000 euros, tienes residencia durante 10 años. Renovable automáticamente. Para ti y para tu familia."

CTA (45-60s):
"Si quieres saber más, en la bio tienes el enlace a nuestra guía gratuita. O escríbeme directamente. Nos vemos en Dubai."

[Logo Emiralia + música de fade]

NOTAS DE PRODUCCIÓN:
- Avatar: Fernando (traje azul marino, fondo skyline Dubai)
- Plataforma: Instagram Reels
- Duración objetivo: 58 segundos
- Subtítulos: sí, español
- CTA overlay: "Link en bio → Guía gratuita"`,
    metadata: {
      avatar: 'fernando',
      platform: 'instagram',
      duration_seconds: 58,
      tone: 'educativo-aspiracional',
      hook_type: 'pregunta_retórica',
      cta: 'link_bio',
      hashtags: ['#DubaiRealEstate', '#InvertirenDubai', '#GoldenVisaDubai', '#PropiedadesEmirates'],
      week: 13,
      heygen_job_id: 'hg_2026031_fer_001',
    },
    created_at: '2026-03-10 11:00:00',
    updated_at: '2026-03-13 09:00:00',
  },

  {
    id: IDS.S2,
    agent_id: 'social-media-agent',
    type: 'video_script',
    status: 'approved',
    title: 'Yolanda 30s TikTok: El error más común al invertir en Dubai',
    content: `HOOK (0-3s):
"El error número 1 que cometen los inversores españoles en Dubai... y que les cuesta miles de euros"

[Yolanda en interior minimalista, tono urgente pero cálido]

DESARROLLO (3-22s):
"El error es comprar off-plan a un developer que no está aprobado por RERA."

"RERA es el regulador inmobiliario de Dubai. Si el developer no tiene licencia RERA, tu dinero no está protegido por el escrow obligatorio."

"He visto casos de personas que perdieron el 30% de su depósito por no verificar esto antes."

"La solución es simple: antes de firmar nada, busca el número RERA del developer en el registro oficial. En 2 minutos sabes si es de fiar."

CTA (22-30s):
"Sígueme para más tips de inversión en Dubai. Y en la bio tienes nuestra lista de developers RERA verificados."

NOTAS:
- Avatar: Yolanda (outfit casual premium, fondo neutro)
- Plataforma: TikTok
- Duración: 28 segundos
- Formato: talking head con texto overlay en momentos clave`,
    metadata: {
      avatar: 'yolanda',
      platform: 'tiktok',
      duration_seconds: 28,
      tone: 'educativo-alerta',
      hook_type: 'problema_dolor',
      cta: 'follow_bio',
      hashtags: ['#Dubai', '#InversionInmobiliaria', '#RERA', '#ErroresInversion'],
      week: 13,
    },
    created_at: '2026-03-15 14:00:00',
    updated_at: '2026-03-17 10:30:00',
  },

  {
    id: IDS.S3,
    agent_id: 'social-media-agent',
    type: 'social_post',
    status: 'pending_review',
    title: 'Post IG: Propiedad destacada Business Bay — ROI 8.2%',
    content: `📍 Business Bay, Dubai

2 dormitorios | 115 m² | Vistas al Canal

Precio: AED 1.850.000 (≈ €462.000)
Rentabilidad bruta: 8.2% anual
Entrega: Q4 2026

Lo que incluye:
✅ Acabados premium DAMAC
✅ Acceso a 5 piscinas
✅ Gym + Spa + Coworking
✅ Concierge 24h

¿Quieres los datos completos de esta propiedad? Escríbenos por DM o visita el enlace en bio.

#BusinessBay #DubaiRealEstate #PropiedadesDubai #InvertirenDubai #OffPlan`,
    metadata: {
      platform: 'instagram',
      post_type: 'property_highlight',
      property_id: IDS.C4,
      image_style: 'property_card',
      cta: 'dm_bio',
    },
    created_at: '2026-03-21 10:00:00',
    updated_at: '2026-03-21 10:00:00',
  },

  {
    id: IDS.S4,
    agent_id: 'social-media-agent',
    type: 'content_calendar',
    status: 'draft',
    title: 'Calendario Semanal Social Media — Semana 14 (24-30 Marzo 2026)',
    content: `# Calendario Semana 14 — 24-30 Marzo 2026

## Lunes 24/03
- **IG Reel (Fernando):** "¿Cuánto necesitas ahorrar para comprar en Dubai?" — 60s educativo
- **TikTok:** repost del Reel de Fernando

## Martes 25/03
- **IG Post:** Propiedad destacada — JVC Studio desde €118.000 (ROI 8.7%)
- **IG Stories (3 slides):** Quiz "¿Cuánto sabes de la Golden Visa?"

## Miércoles 26/03
- **TikTok (Yolanda):** "Por qué Dubai supera a España como destino inversor" — 30s

## Jueves 27/03
- **IG Carrusel:** Comparativa zonas — Dubai Marina vs Business Bay vs JVC
- **IG Stories:** Poll "¿Cuál es tu presupuesto de inversión?"

## Viernes 28/03
- **IG Post:** Dato de mercado — "Transacciones DLD: +23% vs marzo 2025"
- **TikTok:** Behind the scenes análisis de propiedades

## Sábado 29/03
- **IG Reel (Yolanda):** "El proceso de compra en Dubai en 5 pasos" — 45s

## Domingo 30/03
- **IG Stories:** Recap semana + CTA newsletter`,
    metadata: {
      week: 14,
      year: 2026,
      platforms: ['instagram', 'tiktok'],
      total_posts: 12,
      avatars: ['fernando', 'yolanda'],
    },
    created_at: '2026-03-22 17:00:00',
    updated_at: '2026-03-22 17:00:00',
  },

  // ── MARKETING AGENT ────────────────────────────────────────────────────────

  {
    id: IDS.M1,
    agent_id: 'marketing-agent',
    type: 'campaign_brief',
    status: 'approved',
    title: 'Campaña LinkedIn Q2 2026 — Captación Inversores Latinoamérica',
    content: `# Campaign Brief: LinkedIn Q2 2026

## Objetivo
Captación de leads cualificados (AUM >€200K) en México, Colombia y Argentina interesados en inversión inmobiliaria en Dubai.

## Segmentación
- **Geo:** México DF, Bogotá, Buenos Aires, Medellín
- **Cargo:** CEO, Director Financiero, Empresario, Socio
- **Industria:** Tecnología, Finanzas, Construcción, Retail
- **Criterio adicional:** Conectados con grupos de inversión o finanzas personales

## Mensajes clave
1. "Tu dinero en España rinde un 3%. En Dubai, un 8%. Sin impuestos."
2. "Golden Visa incluida con tu inversión en Dubai desde €500.000"
3. "Emiralia: el primer buscador de propiedades en Dubai en español"

## Assets requeridos
- 3 creatividades estáticas (property highlight)
- 1 carrusel educativo "Cómo invertir en Dubai desde México"
- 1 vídeo Fernando 45s (adaptar reel IG)

## Budget
- Total Q2: €8.000
- CPL objetivo: <€45
- Leads meta: 180 leads cualificados

## KPIs
| Métrica | Objetivo |
|---------|---------|
| Impresiones | 320.000 |
| CTR | >1.2% |
| CPL | <€45 |
| Leads totales | 180 |
| Lead-to-meeting | >12% |`,
    metadata: {
      platform: 'linkedin',
      budget_eur: 8000,
      target_markets: ['MX', 'CO', 'AR'],
      start_date: '2026-04-01',
      end_date: '2026-06-30',
      cpl_target: 45,
      leads_target: 180,
    },
    created_at: '2026-03-12 10:00:00',
    updated_at: '2026-03-16 14:00:00',
  },

  {
    id: IDS.M2,
    agent_id: 'marketing-agent',
    type: 'campaign_brief',
    status: 'pending_review',
    title: 'Google Ads — Captación Propiedades Off-Plan Dubai para Inversores Hispanos',
    content: `# Campaign Brief: Google Ads — Off-Plan Dubai

## Objetivo
Capturar demanda de búsqueda activa de inversores hispanohablantes interesados en propiedades off-plan en Dubai.

## Estructura de campañas

### Campaña 1: Branded
- Keywords: emiralia, emiralia.com, emiralia dubai
- Budget: €500/mes | CPC objetivo: €0.80

### Campaña 2: Off-Plan Dubai
- Keywords: off-plan dubai, comprar propiedad dubai sobre plano, pisos dubai en construcción
- Budget: €2.500/mes | CPC objetivo: €2.50

### Campaña 3: Golden Visa
- Keywords: golden visa dubai, residencia dubai inversión, visa inversor emiratos
- Budget: €1.500/mes | CPC objetivo: €3.00

### Campaña 4: Competidores
- Keywords: propertyfinder en español, bayut español, propiedades dubai en español
- Budget: €800/mes | CPC objetivo: €1.80

## Landing pages requeridas
- /off-plan-dubai (crear)
- /golden-visa (existe, optimizar)
- /propiedades/dubai-marina (existe)`,
    metadata: {
      platform: 'google_ads',
      monthly_budget_eur: 5300,
      campaigns: 4,
      target_markets: ['ES', 'MX', 'CO', 'AR', 'CL', 'PE'],
    },
    created_at: '2026-03-19 11:00:00',
    updated_at: '2026-03-19 11:00:00',
  },

  {
    id: IDS.M3,
    agent_id: 'marketing-agent',
    type: 'gtm_strategy',
    status: 'draft',
    title: 'GTM Strategy Q2 2026 — Entrada al Mercado Colombiano y Mexicano',
    content: `# GTM Strategy: Colombia y México Q2 2026

## Contexto
Colombia y México representan los mercados con mayor intención de inversión inmobiliaria en UAE entre los hispanohablantes, según datos de Google Trends y encuestas de leads existentes.

## Segmento de entrada: "El Empresario Digital Latam"
- Edad: 35-55 años
- Patrimonio: $500K - $3M USD
- Motivación principal: diversificación geográfica + Golden Visa
- Pain point: desconfianza en mercados locales, búsqueda de activos en USD/AED

## Canales por mercado

### Colombia (Bogotá, Medellín)
- LinkedIn Ads (cargo: CEO, Director)
- WhatsApp Business (nurture de leads)
- Podcast "inversión en el extranjero" (patrocinio)
- Alianza con family offices locales

### México (CDMX, Guadalajara, Monterrey)
- LinkedIn Ads
- YouTube Ads (Fernando & Yolanda)
- Alianza con contadores y asesores fiscales
- Presencia en Expo Real Estate México (junio 2026)

## Métricas de éxito Q2
- 300 leads cualificados (≥150 CO + ≥150 MX)
- 25 reuniones concertadas
- 3 transacciones cerradas`,
    metadata: {
      target_markets: ['CO', 'MX'],
      q: 'Q2 2026',
      budget_estimate_eur: 15000,
    },
    created_at: '2026-03-21 09:00:00',
    updated_at: '2026-03-21 09:00:00',
  },

  {
    id: IDS.M4,
    agent_id: 'marketing-agent',
    type: 'channel_report',
    status: 'approved',
    title: 'Informe de Rendimiento por Canal — Febrero 2026',
    content: `# Channel Performance Report — Febrero 2026

## Resumen ejecutivo
Febrero registró un total de **847 leads** (+31% vs enero), con el canal orgánico superando por primera vez a paid en volumen de leads cualificados.

## Por canal

| Canal | Leads | Cualificados | CPL | Conv. Lead→Meeting |
|-------|-------|-------------|-----|-------------------|
| Organic SEO | 312 | 78 (25%) | €0 | 14% |
| Instagram Organic | 198 | 42 (21%) | €0 | 11% |
| LinkedIn Ads | 156 | 47 (30%) | €38 | 18% |
| Google Ads | 131 | 31 (24%) | €52 | 13% |
| Referral | 50 | 22 (44%) | €0 | 28% |

## Highlights
- SEO orgánico: blog "Golden Visa" posiciona #3 en Google ES para "golden visa dubai"
- LinkedIn: CPL bajó de €55 → €38 tras optimización de audiencias
- Referral: canal con mayor tasa de cualificación — priorizar en Q2

## Próximos pasos
1. Escalar LinkedIn Ads con budget adicional de €2.000/mes
2. Lanzar programa de referral formal (comisión €500/lead cualificado)
3. SEO: publicar 4 artículos adicionales en cluster "off-plan dubai"`,
    metadata: {
      period: '2026-02',
      total_leads: 847,
      qualified_leads: 220,
      total_spend_eur: 9800,
      avg_cpl: 44.5,
    },
    created_at: '2026-03-05 10:00:00',
    updated_at: '2026-03-08 15:00:00',
  },

  // ── ANALYTICS AGENT ────────────────────────────────────────────────────────

  {
    id: IDS.A1,
    agent_id: 'analytics-agent',
    type: 'report',
    status: 'published',
    title: 'Informe Mensual KPIs — Marzo 2026',
    content: `# Monthly KPI Report — Marzo 2026

## North Star Metrics

| Métrica | Marzo 2026 | Feb 2026 | ΔMoM |
|---------|-----------|---------|------|
| Leads totales | 1.024 | 847 | +21% |
| Leads cualificados | 287 | 220 | +30% |
| Propiedades activas en DB | 2.847 | 2.341 | +22% |
| Developers registrados | 18 | 15 | +20% |
| Revenue B2B | €0 | €0 | — |

## Funnel Conversion

Visitas (18.400) → Leads (1.024) → Cualificados (287) → Reuniones (34) → En negociación (8)

Tasa Visita→Lead: 5.6% (+0.8pp MoM)
Tasa Lead→Cualificado: 28% (+5pp MoM)
Tasa Cualificado→Reunión: 11.8%

## Top páginas por leads generados
1. /blog/guia-invertir-dubai-marina-2026 — 312 visitas, 38 leads (12.2%)
2. /blog/golden-visa-uae — 287 visitas, 35 leads (12.2%)
3. /propiedades (listado general) — 4.200 visitas, 89 leads (2.1%)

## Alertas
⚠️ Revenue B2B = €0. Meta Q1: primera transacción developer pagante.
✅ Orgánico superando paid por segundo mes consecutivo.`,
    metadata: {
      period: '2026-03',
      total_leads: 1024,
      qualified_leads: 287,
      total_visits: 18400,
      properties_db: 2847,
      revenue_b2b_eur: 0,
    },
    created_at: '2026-03-23 08:00:00',
    updated_at: '2026-03-23 08:00:00',
  },

  {
    id: IDS.A2,
    agent_id: 'analytics-agent',
    type: 'kpi_snapshot',
    status: 'approved',
    title: 'KPI Snapshot Semanal — Semana 12 (17-23 Marzo)',
    content: `# Weekly KPI Snapshot — Semana 12

**Período:** 17-23 marzo 2026

| Métrica | Esta semana | Semana anterior | Δ |
|---------|------------|----------------|---|
| Visitas | 4.812 | 4.234 | +13.6% |
| Leads nuevos | 267 | 221 | +20.8% |
| Leads cualificados | 71 | 58 | +22.4% |
| Reuniones agendadas | 9 | 7 | +28.6% |
| Tiempo medio en site | 3m 42s | 3m 18s | +12.6% |

**Propiedades añadidas esta semana:** 127 (PropertyFinder: 89 · Bayut: 31 · Manual: 7)

**Top fuente de leads:** Instagram Organic (94 leads, 35.2% del total)`,
    metadata: {
      week: 12,
      year: 2026,
      visits: 4812,
      new_leads: 267,
      qualified_leads: 71,
    },
    created_at: '2026-03-23 09:00:00',
    updated_at: '2026-03-23 09:00:00',
  },

  {
    id: IDS.A3,
    agent_id: 'analytics-agent',
    type: 'funnel_analysis',
    status: 'approved',
    title: 'Análisis de Funnel — Q1 2026 (Enero-Marzo)',
    content: `# Funnel Analysis Q1 2026

## Visión general del funnel

\`\`\`
Visitas únicas        48.200   (100%)
       ↓ 5.1% conv.
Leads generados        2.458   (100%)
       ↓ 27.3% conv.
Leads cualificados       671   (27.3%)
       ↓ 11.9% conv.
Reuniones realizadas      80   (11.9%)
       ↓ 10.0% conv.
En negociación             8   (10.0%)
       ↓ 0% conv.
Cierre (transacción)       0   (0%)
\`\`\`

## Análisis por etapa

### Visitas → Leads (5.1%)
Benchmark sector: 3-7%. Estamos en rango correcto.
Palanca: mejorar CTAs en páginas de propiedades (actualmente < 1% conv.)

### Leads → Cualificados (27.3%)
Benchmark: 20-35%. Buen ratio.
Palanca: formulario de cualificación automática en alta.

### Cualificados → Reunión (11.9%)
Palanca principal de mejora. Objetivo Q2: 18%.
Acción: respuesta en < 2h (actualmente media 6h).

### Reunión → Cierre (0%)
Sin transacciones en Q1. Revenue = €0.
Causa: proceso de presentación a developers sin cerrar.

## Recomendación principal
Priorizar cierre de primer developer pagante antes de escalar marketing.`,
    metadata: {
      period: 'Q1 2026',
      total_visits: 48200,
      total_leads: 2458,
      qualified_leads: 671,
      meetings: 80,
      in_negotiation: 8,
      closed: 0,
    },
    created_at: '2026-03-22 11:00:00',
    updated_at: '2026-03-22 11:00:00',
  },

  {
    id: IDS.A4,
    agent_id: 'analytics-agent',
    type: 'market_benchmark',
    status: 'approved',
    title: 'Benchmark Competitivo: Emiralia vs PropertyFinder vs Bayut — Q1 2026',
    content: `# Competitive Benchmark Q1 2026

## Tráfico web estimado (SimilarWeb / Semrush)

| Plataforma | Visitas/mes | % Hispano | Leads hispanos est. |
|-----------|------------|-----------|-------------------|
| PropertyFinder | 4.200.000 | 0.3% | ~12.600 |
| Bayut | 3.800.000 | 0.2% | ~7.600 |
| **Emiralia** | **18.400** | **95%** | **~1.000** |

**Oportunidad:** El mercado hispanohablante está prácticamente sin servir por los grandes players. Emiralia tiene ventaja de first mover.

## Propuesta de valor diferencial

| Factor | PropertyFinder | Bayut | Emiralia |
|--------|---------------|-------|---------|
| Idioma | Inglés/Árabe | Inglés/Árabe | Español nativo |
| Contenido educativo ES | ❌ | ❌ | ✅ |
| Agentes IA especializados | ❌ | ❌ | ✅ |
| Análisis de inversión | Básico | Básico | Avanzado |
| Golden Visa guidance | ❌ | Mínimo | ✅ Completo |`,
    metadata: {
      period: 'Q1 2026',
      competitors: ['PropertyFinder', 'Bayut'],
      data_sources: ['SimilarWeb', 'Semrush', 'Google Trends'],
    },
    created_at: '2026-03-20 14:00:00',
    updated_at: '2026-03-21 09:00:00',
  },

  // ── LEGAL AGENT ────────────────────────────────────────────────────────────

  {
    id: IDS.L1,
    agent_id: 'legal-agent',
    type: 'faq_entry',
    status: 'published',
    title: '¿Cuánto cuesta realmente comprar una propiedad en Dubai? Todos los gastos',
    content: `## ¿Cuánto cuesta realmente comprar una propiedad en Dubai?

Además del precio de compra, hay que tener en cuenta los siguientes gastos adicionales:

**Gastos obligatorios:**
- **DLD Registration Fee:** 4% del precio de compra (el mayor gasto adicional)
- **DLD Admin Fee:** AED 580 (propiedades > AED 500.000)
- **Trustee Fee:** AED 4.000 (off-plan) o AED 10.000 (ready) + IVA 5%

**Gastos habituales:**
- **Agency Fee:** 2% del precio (si usas agente comprador)
- **NOC Fee:** AED 1.000 – 5.000 (según developer)

**Gastos recurrentes (anuales):**
- Service Charge (mantenimiento): AED 10-25/sqft/año
- Seguro de hogar: AED 1.500 – 3.000/año

**Ejemplo real para propiedad de AED 1.850.000:**
| Concepto | Importe |
|----------|---------|
| Precio propiedad | AED 1.850.000 |
| DLD Fee (4%) | AED 74.000 |
| Trustee Fee | AED 10.500 |
| Agency Fee (2%) | AED 37.000 |
| **Total** | **AED 1.971.500** |

**Conclusión:** Presupuesta entre un 6-7% adicional sobre el precio de compra.`,
    metadata: {
      category: 'costes_compra',
      language: 'es-ES',
      source: 'DLD Official Guidelines 2026',
      valid_until: '2026-12-31',
      tags: ['gastos compra', 'DLD fee', 'costes dubai', 'proceso compra'],
      views: 1240,
      helpful_rate: 0.94,
    },
    created_at: '2026-03-01 10:00:00',
    updated_at: '2026-03-15 09:00:00',
  },

  {
    id: IDS.L2,
    agent_id: 'legal-agent',
    type: 'faq_entry',
    status: 'published',
    title: '¿Qué es la Golden Visa UAE y cómo se consigue con una propiedad?',
    content: `## ¿Qué es la Golden Visa UAE?

La Golden Visa es un permiso de residencia de larga duración (10 años, renovable) para extranjeros que cumplan ciertos criterios de inversión en los Emiratos Árabes Unidos.

**¿Cómo se obtiene mediante propiedad?**

El requisito principal es poseer una o varias propiedades con un valor total mínimo de **AED 2.000.000** (aproximadamente €500.000).

**Condiciones:**
- La propiedad puede estar en construcción (off-plan) si el developer está aprobado por DLD
- Se pueden combinar varias propiedades para alcanzar el mínimo
- Si hay hipoteca, el equity (valor pagado) debe superar AED 2M
- La propiedad debe estar en una zona freehold

**¿Qué incluye la Golden Visa?**
- Residencia para ti y tu familia directa (cónyuge, hijos)
- Sin requisito de permanencia mínima en UAE
- Trabajo y estudio en UAE sin sponsor local
- Acceso a cuenta bancaria UAE
- Renovación automática mientras se mantenga la inversión

**Tiempo de proceso:** 4-6 semanas desde la presentación de documentación completa.

**Documentos requeridos:**
1. Pasaporte válido (mínimo 6 meses de validez)
2. Título de propiedad (Title Deed del DLD)
3. Certificado de valoración oficial
4. Historial médico y seguro de salud
5. Foto reciente`,
    metadata: {
      category: 'golden_visa',
      language: 'es-ES',
      source: 'ICA UAE + DLD Official 2026',
      valid_until: '2026-12-31',
      tags: ['golden visa', 'residencia dubai', 'visa inversor'],
      views: 2180,
      helpful_rate: 0.97,
    },
    created_at: '2026-03-01 11:00:00',
    updated_at: '2026-03-10 10:00:00',
  },

  {
    id: IDS.L3,
    agent_id: 'legal-agent',
    type: 'faq_entry',
    status: 'approved',
    title: '¿Pueden los ciudadanos españoles y latinoamericanos comprar propiedades en Dubai?',
    content: `## ¿Pueden los extranjeros comprar propiedades en Dubai?

**Sí**, los ciudadanos de cualquier nacionalidad pueden comprar propiedades en Dubai, pero **únicamente en zonas designadas como "freehold"** por el Decreto 3/2006 del Gobierno de Dubai.

**Zonas freehold principales:**
- Dubai Marina
- Downtown Dubai / Burj Khalifa
- Business Bay
- Palm Jumeirah
- Jumeirah Village Circle (JVC)
- DIFC (Dubai International Financial Centre)
- Arabian Ranches
- Dubai Hills Estate
- Jumeirah Beach Residence (JBR)

En estas zonas, los extranjeros pueden comprar en **propiedad plena (freehold)**, lo que otorga los mismos derechos que a los ciudadanos emiratíes: vender, alquilar, heredar y transmitir la propiedad libremente.

**¿Qué es leasehold?**
En zonas no freehold, los extranjeros pueden comprar derechos de uso por períodos de 10-99 años. No es propiedad plena y no suele recomendarse para inversores.

**Restricciones específicas:**
- Abu Dhabi tiene sus propias zonas freehold (Yas Island, Saadiyat Island)
- Sharjah permite "usufruct" de 100 años, no freehold completo`,
    metadata: {
      category: 'marco_legal',
      language: 'es-ES',
      source: 'Dubai Decree 3/2006 + DLD 2026',
      valid_until: '2026-12-31',
      tags: ['freehold', 'extranjeros dubai', 'derechos propiedad'],
    },
    created_at: '2026-03-05 09:00:00',
    updated_at: '2026-03-18 11:00:00',
  },

  {
    id: IDS.L4,
    agent_id: 'legal-agent',
    type: 'faq_entry',
    status: 'pending_review',
    title: '¿Qué impuestos hay que pagar al comprar y tener una propiedad en Dubai?',
    content: `## Impuestos en la compra y tenencia de propiedades en Dubai

Una de las razones por las que Dubai atrae tanto a inversores es su **régimen fiscal excepcionalmente favorable**:

**Al comprar:**
- DLD Registration Fee: 4% (obligatorio, único pago)
- Sin impuesto de transmisiones patrimoniales adicional
- Sin IVA en la compra residencial

**Mientras se tiene la propiedad:**
- Sin impuesto sobre el patrimonio inmobiliario
- Sin impuesto sobre la renta personal por los alquileres obtenidos en UAE
- Service Charge (mantenimiento de comunidad): no es un impuesto, es un gasto de gestión

**Al vender:**
- Sin impuesto sobre plusvalías en UAE
- Sin impuesto de sucesiones en UAE

**⚠️ Obligaciones fiscales en tu país de residencia:**
Aunque UAE no cobra impuestos por estas rentas, **tu país de residencia fiscal puede hacerlo**. En España, los rendimientos de alquiler de inmuebles extranjeros tributan en el IRPF. Consulta con un asesor fiscal español especializado en fiscalidad internacional.`,
    metadata: {
      category: 'impuestos',
      language: 'es-ES',
      tags: ['impuestos dubai', 'fiscalidad dubai', 'plusvalías dubai'],
      disclaimer: true,
    },
    created_at: '2026-03-20 14:00:00',
    updated_at: '2026-03-20 14:00:00',
  },

  {
    id: IDS.L5,
    agent_id: 'legal-agent',
    type: 'legal_guide',
    status: 'approved',
    title: 'Guía Completa: Proceso de Compra de Propiedad en Dubai para Extranjeros (2026)',
    content: `# Guía Completa: Comprar una Propiedad en Dubai siendo Extranjero

## Introducción
Esta guía cubre el proceso completo de compraventa inmobiliaria en Dubai para ciudadanos no emiratíes. Actualizada a marzo 2026.

## Paso 1: Verificar la zona freehold
Antes de comprometerte, confirma que la propiedad está en una zona freehold autorizada para extranjeros. Consulta el DLD Property Finder oficial o pregunta al developer su clasificación.

## Paso 2: Due Diligence del Developer (off-plan)
Si compras sobre plano:
- Verifica la licencia RERA del developer
- Confirma que el proyecto tiene cuenta escrow en DLD
- Revisa el historial de entregas del developer
- Comprueba el certificado de aprobación del proyecto

## Paso 3: Firma del MOU
El Memorandum of Understanding (MOU) o Formulario F es el contrato de reserva. Incluye:
- Precio acordado y plan de pagos
- Condiciones de la venta
- Penalizaciones por incumplimiento
- Plazo para el NOC

Depósito típico: 10% del precio de compra.

## Paso 4: Obtención del NOC
El No Objection Certificate lo emite el developer y confirma que no hay deudas sobre la propiedad. Plazo: 3-10 días hábiles. Coste: AED 1.000-5.000 según developer.

## Paso 5: Transferencia en DLD
La transferencia final se realiza en un Trustee Office aprobado por DLD. Ambas partes deben estar presentes (o representadas mediante Power of Attorney).

Documentos requeridos:
- MOU firmado
- NOC del developer
- Pasaportes de comprador y vendedor
- Pago del DLD Fee (4%)

## Paso 6: Título de Propiedad (Title Deed)
Una vez completada la transferencia, el DLD emite el Title Deed a nombre del comprador. Es el documento definitivo de propiedad.

## Cronograma típico
- Ready property: 2-4 semanas desde firma del MOU
- Off-plan: 4-8 semanas para la reserva inicial; el Title Deed se emite al completar el pago o al terminar la construcción

## Consideraciones legales adicionales
- Power of Attorney: si no puedes estar presente en Dubai, puedes otorgar poder notarial legalizado con apostilla
- Herencia: los bienes en UAE se rigen por la Sharia Law salvo que hagas un registro de voluntades en el DIFC Courts
- Hipoteca: los no residentes pueden acceder a hipotecas de hasta el 50% LTV en UAE`,
    metadata: {
      language: 'es-ES',
      version: '2.1',
      updated: '2026-03-01',
      source: 'DLD Official + RERA Guidelines 2026',
      word_count: 1850,
      pdf_available: true,
    },
    created_at: '2026-02-15 10:00:00',
    updated_at: '2026-03-01 12:00:00',
  },

  {
    id: IDS.L6,
    agent_id: 'legal-agent',
    type: 'regulatory_alert',
    status: 'draft',
    title: 'RERA: Nuevas Regulaciones Proyectos Off-Plan — Circular Marzo 2026',
    content: `# Alerta Regulatoria: RERA Circular 03/2026

**Fecha de emisión:** 18 marzo 2026
**Vigencia:** 1 abril 2026
**Impacto:** ALTO

## Resumen de cambios

RERA ha publicado la Circular 03/2026 que modifica los requisitos de escrow para proyectos off-plan:

1. **Umbral mínimo de escrow aumenta del 20% al 30%** del valor total del proyecto antes de que el developer pueda iniciar la construcción.

2. **Nuevos requisitos de reporting trimestral:** Los developers deberán publicar informes de avance de obra certificados por inspectores RERA aprobados.

3. **Protección de compradores en caso de retraso:** Si la entrega supera los 24 meses del plazo contractual, el comprador tiene derecho a cancelación y reembolso completo del 100% (antes era el 80%).

## Impacto en inversores de Emiralia

Esta regulación **aumenta la protección del comprador** en propiedades off-plan. Es un cambio positivo.

## Acción requerida

- Actualizar FAQ sobre off-plan con nueva protección 100% de reembolso
- Añadir criterio de verificación de escrow 30% en ficha de developer
- Informar a leads activos interesados en off-plan`,
    metadata: {
      regulation_body: 'RERA',
      circular_number: '03/2026',
      effective_date: '2026-04-01',
      impact_level: 'HIGH',
      affected_categories: ['off_plan', 'developer_verification'],
    },
    created_at: '2026-03-19 15:00:00',
    updated_at: '2026-03-19 15:00:00',
  },

  {
    id: IDS.L7,
    agent_id: 'legal-agent',
    type: 'investor_brief',
    status: 'approved',
    title: 'Ficha Inversor: Business Bay como Zona de Máxima Rentabilidad 2026',
    content: `# Investor Brief: Business Bay — Q1 2026

## Perfil de la zona
Business Bay es el CBD de Dubai, colindante con Downtown Dubai y el Canal de Dubai. 4.2 km de frente al canal. Hub financiero y residencial premium.

## Datos de mercado (Q1 2026)
- Precio medio: AED 2.180/sqft (€545/m²)
- Apreciación YoY: +14.2%
- Yield bruto medio: 7.1%
- Vacancia: 6.3% (baja en Dubai)
- Transacciones Q1 2026: 1.847 (+28% vs Q1 2025)

## Perfil del comprador/inquilino
Profesionales financieros, ejecutivos internacionales, couples sin hijos. Estancia media en alquiler: 2.3 años.

## Proyectos recomendados
1. **Canal Crown (DAMAC)** — desde AED 1.85M, entrega Q4 2026
2. **Binghatti Canal (Binghatti)** — desde AED 1.2M, entrega Q2 2027
3. **Peninsula (Select Group)** — ready, desde AED 2.1M

## Recomendación
Business Bay es el sweet spot calidad/precio de Dubai en 2026. Mejor rentabilidad que Downtown (6.1%) con mayor apreciación esperada que JVC (7.8% yield pero menor demanda de perfil premium).`,
    metadata: {
      zone: 'Business Bay',
      emirate: 'Dubai',
      quarter: 'Q1 2026',
      yield_gross: 7.1,
      appreciation_yoy: 14.2,
      recommended_for: ['cash_flow', 'appreciation', 'golden_visa'],
    },
    created_at: '2026-03-14 10:00:00',
    updated_at: '2026-03-16 09:00:00',
  },

  // ── DATA AGENT ─────────────────────────────────────────────────────────────

  {
    id: IDS.D1,
    agent_id: 'data-agent',
    type: 'scrape_job',
    status: 'published',
    title: 'PropertyFinder UAE — Scraping Completo Semana 12 (17-23 Marzo 2026)',
    content: `Scraping completado exitosamente. PropertyFinder Dubai + Abu Dhabi + Sharjah.

Total listings procesados: 3.847
Listings nuevos: 412
Listings actualizados: 1.234
Listings eliminados (offline): 89
Errores de parsing: 12 (0.3%)
Tiempo total de ejecución: 47 minutos`,
    metadata: {
      source: 'PropertyFinder',
      regions: ['Dubai', 'Abu Dhabi', 'Sharjah'],
      total_processed: 3847,
      new_listings: 412,
      updated_listings: 1234,
      removed_listings: 89,
      errors: 12,
      error_rate: 0.003,
      duration_minutes: 47,
      apify_run_id: 'run_abc123xyz',
      week: 12,
      year: 2026,
    },
    created_at: '2026-03-23 03:00:00',
    updated_at: '2026-03-23 03:47:00',
  },

  {
    id: IDS.D2,
    agent_id: 'data-agent',
    type: 'dataset',
    status: 'published',
    title: 'Dataset Dubai Residencial — 2.847 Propiedades Normalizadas (Marzo 2026)',
    content: `Dataset actualizado y normalizado. Cubre todas las zonas freehold principales de Dubai.

Campos completos: precio, habitaciones, baños, superficie, descripción, imágenes, agente, agencia, RERA, coordenadas GPS, amenidades, estado de entrega, árbol de ubicación.

Calidad global de datos: 87.3%`,
    metadata: {
      total_listings: 2847,
      emirate: 'Dubai',
      zones_covered: ['Dubai Marina', 'Business Bay', 'Downtown Dubai', 'JVC', 'Palm Jumeirah', 'DIFC', 'JBR', 'Arabian Ranches', 'Dubai Hills', 'Meydan'],
      field_completeness: {
        price: 0.99,
        bedrooms: 0.98,
        area_sqft: 0.95,
        coordinates: 0.81,
        images: 0.87,
        rera_number: 0.72,
        amenities: 0.68,
      },
      data_quality_score: 0.873,
      last_updated: '2026-03-23',
      sources: ['PropertyFinder', 'Bayut', 'Manual'],
    },
    created_at: '2026-03-23 05:00:00',
    updated_at: '2026-03-23 05:00:00',
  },

  {
    id: IDS.D3,
    agent_id: 'data-agent',
    type: 'dedup_report',
    status: 'approved',
    title: 'Informe Deduplicación Semana 12 — 312 Duplicados Detectados',
    content: `# Deduplication Report — Semana 12

## Resumen
| Tier | Descripción | Detectados | Mergeados | Revisión manual |
|------|-------------|-----------|-----------|----------------|
| Tier 1 | Exact match (mismo ref + agency) | 189 | 189 | 0 |
| Tier 2 | Fuzzy match (similar desc + precio ±5%) | 98 | 85 | 13 |
| Tier 3 | Semantic match (embedding similarity >0.92) | 25 | 15 | 10 |
| **Total** | | **312** | **289** | **23** |

## Casos en revisión manual (23)
- 10 posibles duplicados cross-agency (misma propiedad, agencia diferente)
- 8 propiedades con precio diferente >5% pero misma dirección
- 5 listings con RERA vacío, difícil de confirmar

## Acción requerida
Revisar los 23 casos en revisión manual en la Data Workspace.`,
    metadata: {
      week: 12,
      total_detected: 312,
      total_merged: 289,
      pending_manual: 23,
      tier1: { detected: 189, merged: 189 },
      tier2: { detected: 98, merged: 85 },
      tier3: { detected: 25, merged: 15 },
    },
    created_at: '2026-03-23 06:00:00',
    updated_at: '2026-03-23 06:00:00',
  },

  {
    id: IDS.D4,
    agent_id: 'data-agent',
    type: 'data_quality_report',
    status: 'approved',
    title: 'Informe de Calidad de Datos Global — Marzo 2026 (87.3%)',
    content: `# Data Quality Report — Marzo 2026

## Score Global: 87.3% (+2.1pp vs febrero)

## Breakdown por campo
| Campo | Completitud | Calidad | Score |
|-------|------------|---------|-------|
| Precio | 99.1% | 98.5% | 98.8% |
| Habitaciones | 98.3% | 99.0% | 98.6% |
| Superficie (sqft) | 95.2% | 94.8% | 95.0% |
| Descripción | 91.4% | 78.3% | 84.9% |
| Imágenes (≥3) | 87.1% | 85.2% | 86.2% |
| Coordenadas GPS | 81.3% | 99.5% | 90.4% |
| Número RERA | 72.4% | 98.1% | 85.3% |
| Amenidades | 68.7% | 71.2% | 69.9% |

## Problemas detectados
1. **Amenidades (69.9%):** Muchos developers no las incluyen en los feeds. Solución: enriquecer manualmente con datos del sitio web del developer.
2. **RERA (85.3%):** Listings de agencias privadas frecuentemente omiten el número. Solución: scraping del registro RERA para cruzar.

## Objetivo Q2
Score global ≥ 90% mediante enriquecimiento de amenidades y cruce con registro RERA.`,
    metadata: {
      period: '2026-03',
      global_score: 0.873,
      prev_period_score: 0.852,
      total_listings_analyzed: 2847,
    },
    created_at: '2026-03-23 07:00:00',
    updated_at: '2026-03-23 07:00:00',
  },

  // ── FRONTEND (DESIGN) AGENT ────────────────────────────────────────────────

  {
    id: IDS.F1,
    agent_id: 'frontend-agent',
    type: 'page_design',
    status: 'approved',
    title: 'Rediseño Homepage Emiralia v2 — Hero Optimizado + Search Centrado',
    content: `Rediseño completo de la homepage aplicando el sistema 80/20 Light-First. Hero con imagen de Dubai skyline, buscador prominente en el centro, secciones alternas bg-white/bg-slate-50. Eliminadas todas las secciones oscuras intermedias (developers section + simulator ahora en light).`,
    metadata: {
      page: '/',
      version: '2.0',
      brand_check: 'passed',
      dark_sections_count: 2,
      light_sections_count: 7,
      contrast_wcag: 'AAA',
      responsive_breakpoints: ['375px', '768px', '1440px'],
      screenshot_before: 'homepage-v1-screenshot.png',
      screenshot_after: 'homepage-v2-screenshot.png',
      figma_url: 'figma.com/file/emiralia-homepage-v2',
    },
    created_at: '2026-03-08 10:00:00',
    updated_at: '2026-03-12 16:00:00',
  },

  {
    id: IDS.F2,
    agent_id: 'frontend-agent',
    type: 'component',
    status: 'pending_review',
    title: 'PropertyCard v2 — Badge ROI destacado + Comparar',
    content: `Nueva versión del componente PropertyCard con:
- Badge de ROI en esquina superior derecha (color verde si >7%, amarillo si 5-7%)
- Botón "Comparar" en hover (selección múltiple para comparativa)
- Skeleton loading state
- Lazy loading de imagen con blur placeholder
- Precio en AED y EUR simultáneamente`,
    metadata: {
      component: 'PropertyCard',
      version: '2.0',
      changes: ['roi_badge', 'compare_button', 'skeleton', 'lazy_image', 'dual_currency'],
      story: 'storybook/property-card',
      status_design: 'approved',
      status_dev: 'pending',
    },
    created_at: '2026-03-18 11:00:00',
    updated_at: '2026-03-20 14:00:00',
  },

  {
    id: IDS.F3,
    agent_id: 'frontend-agent',
    type: 'mockup',
    status: 'draft',
    title: 'Mockup Mobile: Ficha de Propiedad con Calculadora ROI Integrada',
    content: `Mockup mobile-first de la página de detalle de propiedad con calculadora ROI integrada como panel deslizante. El usuario puede modificar % de ocupación, precio de alquiler esperado y gastos para ver ROI neto estimado en tiempo real.`,
    metadata: {
      page: '/propiedades/[slug]',
      device: 'mobile',
      breakpoint: '375px',
      features: ['roi_calculator_inline', 'sliding_panel', 'real_time_calc'],
    },
    created_at: '2026-03-22 15:00:00',
    updated_at: '2026-03-22 15:00:00',
  },

  // ── DEV AGENT ──────────────────────────────────────────────────────────────

  {
    id: IDS.V1,
    agent_id: 'dev-agent',
    type: 'feature',
    status: 'pending_review',
    title: 'Calculadora ROI Avanzada — Escenario Pesimista / Base / Optimista',
    content: `Implementar calculadora ROI avanzada con 3 escenarios configurables.

**Especificaciones:**
- Input: precio compra, gastos adicionales, precio alquiler mensual esperado, % ocupación, gastos anuales
- Output: ROI bruto, ROI neto, cash flow mensual, payback period, IRR estimado a 10 años
- 3 escenarios: pesimista (80% ocupación, alquiler -10%), base (90%, precio actual), optimista (95%, alquiler +10%)
- Export a PDF del informe
- Guardar escenario en localStorage

**Stack:** React + recharts para los gráficos, html2pdf para export

**PR:** #127 — En revisión
**Tests:** 24 unit tests pasando`,
    metadata: {
      pr_number: 127,
      pr_url: 'github.com/emiralia/repo/pull/127',
      priority: 'high',
      story_points: 13,
      sprint: 14,
      tests_passing: 24,
      component: 'RoiCalculator',
    },
    created_at: '2026-03-17 10:00:00',
    updated_at: '2026-03-22 18:00:00',
  },

  {
    id: IDS.V2,
    agent_id: 'dev-agent',
    type: 'bug_fix',
    status: 'approved',
    title: 'Fix: Filtros de búsqueda no se persisten al navegar entre páginas',
    content: `**Bug reportado:** Al aplicar filtros en /propiedades (zona, precio, habitaciones) y hacer clic en una propiedad, al volver con el botón atrás los filtros se pierden.

**Causa raíz:** El estado de filtros estaba en React state local del componente PropertyList. Al desmontar el componente (navegar), el estado se destruía.

**Fix aplicado:**
1. Mover estado de filtros a URL params (useSearchParams de React Router)
2. Los filtros ahora forman parte de la URL: /propiedades?zona=Dubai+Marina&precio_max=2000000&hab=2
3. El botón atrás restaura automáticamente los filtros al restaurar la URL

**Verificación:**
- Aplicar filtros → navegar a propiedad → botón atrás → filtros intactos ✅
- Compartir URL con filtros → otra sesión ve los mismos filtros ✅
- Deep link desde email marketing con filtros predefinidos ✅

**PR:** #124 — Mergeado`,
    metadata: {
      pr_number: 124,
      priority: 'high',
      bug_id: 'BUG-089',
      reported_by: 'user_feedback',
      fix_type: 'state_management',
      files_changed: ['src/pages/Propiedades.jsx', 'src/components/FilterBar.jsx'],
    },
    created_at: '2026-03-14 09:00:00',
    updated_at: '2026-03-16 14:00:00',
  },

  {
    id: IDS.V3,
    agent_id: 'dev-agent',
    type: 'migration',
    status: 'approved',
    title: 'Migration: Tablas artifact_publications y artifact_handoffs (Proyecto 039)',
    content: `Migración SQL para el sistema de Agent Workspaces (Proyecto 039).

Tablas creadas:
- artifacts (tabla principal con lifecycle de artefactos)
- artifact_publications (tracking de publicaciones por canal)
- artifact_handoffs (cross-agent workflow)

Índices creados: 4

Estado: aplicada en producción el 2026-03-20.`,
    metadata: {
      migration_file: 'tools/db/migration_artifacts.sql',
      tables_created: ['artifacts', 'artifact_publications', 'artifact_handoffs'],
      indexes_created: 4,
      applied_at: '2026-03-20 10:00:00',
      applied_by: 'dev-agent',
      rollback_available: true,
      rollback_sql: 'DROP TABLE IF EXISTS artifact_handoffs, artifact_publications, artifacts CASCADE;',
    },
    created_at: '2026-03-19 15:00:00',
    updated_at: '2026-03-20 10:00:00',
  },

  // ── SEO AGENT ──────────────────────────────────────────────────────────────

  {
    id: IDS.E1,
    agent_id: 'seo-agent',
    type: 'keyword',
    status: 'published',
    title: 'Cluster "Invertir en Dubai" — 28 Keywords Long-Tail Mapeadas',
    content: `Cluster de keywords para la categoría de inversión inmobiliaria en Dubai. 28 keywords con volumen, dificultad e intención mapeadas. Gap de contenido identificado: 12 keywords sin página de destino.`,
    metadata: {
      cluster: 'invertir_dubai',
      total_keywords: 28,
      keywords_with_content: 16,
      keywords_gap: 12,
      top_keywords: [
        { keyword: 'invertir en dubai', volume: 2900, difficulty: 42, intent: 'commercial', position: 8 },
        { keyword: 'como invertir en dubai', volume: 1600, difficulty: 38, intent: 'informational', position: 4 },
        { keyword: 'propiedades en dubai para inversión', volume: 880, difficulty: 31, intent: 'commercial', position: 6 },
        { keyword: 'rentabilidad propiedades dubai', volume: 720, difficulty: 29, intent: 'informational', position: 3 },
        { keyword: 'comprar piso en dubai desde españa', volume: 590, difficulty: 24, intent: 'transactional', position: 2 },
      ],
      avg_difficulty: 33,
      total_monthly_volume: 12400,
      content_gaps: ['guia off-plan dubai', 'impuestos propiedad dubai', 'hipoteca no residente dubai'],
    },
    created_at: '2026-03-10 11:00:00',
    updated_at: '2026-03-15 10:00:00',
  },

  {
    id: IDS.E2,
    agent_id: 'seo-agent',
    type: 'keyword',
    status: 'approved',
    title: 'Cluster "Golden Visa Dubai" — 15 Keywords con Gap de Contenido Identificado',
    content: `Cluster específico de Golden Visa. Alta intención comercial. 9 de 15 keywords sin contenido de Emiralia. Oportunidad inmediata: la competencia tiene contenido débil en español.`,
    metadata: {
      cluster: 'golden_visa_dubai',
      total_keywords: 15,
      keywords_with_content: 6,
      keywords_gap: 9,
      top_keywords: [
        { keyword: 'golden visa dubai', volume: 3600, difficulty: 45, intent: 'informational', position: 12 },
        { keyword: 'golden visa dubai precio', volume: 1900, difficulty: 38, intent: 'commercial', position: 7 },
        { keyword: 'golden visa emiratos requisitos', volume: 1200, difficulty: 35, intent: 'informational', position: 5 },
        { keyword: 'residencia dubai inversión inmobiliaria', volume: 880, difficulty: 32, intent: 'transactional', position: 9 },
      ],
      avg_difficulty: 37,
      total_monthly_volume: 9800,
      priority: 'HIGH',
    },
    created_at: '2026-03-16 10:00:00',
    updated_at: '2026-03-18 11:00:00',
  },

  {
    id: IDS.E3,
    agent_id: 'seo-agent',
    type: 'seo_audit',
    status: 'approved',
    title: 'Auditoría SEO Completa Emiralia.com — Marzo 2026',
    content: `# SEO Audit — Emiralia.com — Marzo 2026

## Score Global: 71/100

## Critical Issues (3)
1. **Core Web Vitals — LCP 4.2s** (límite Google: <2.5s) → Optimizar imágenes hero con next/image o lazy load
2. **18 páginas sin meta description** → Generar automáticamente desde contenido
3. **Sitemap.xml desactualizado** → 847 URLs en sitemap, 1.240 páginas indexables

## Warning Issues (8)
- 34 páginas con duplicate title tags
- Schema.org Property solo en 45 de 2.847 propiedades
- 12 links internos rotos
- Heading structure inconsistente en fichas de propiedades

## Opportunities (12)
- FAQ schema en 18 páginas de blog (rich snippets)
- BreadcrumbList en todas las páginas
- Article schema en posts del blog
- Organization schema mejorado

## Páginas mejor posicionadas
| URL | Posición media | Impresiones/mes | CTR |
|-----|---------------|----------------|-----|
| /blog/guia-invertir-dubai-marina-2026 | 4.2 | 8.400 | 5.8% |
| /blog/golden-visa-uae | 6.1 | 6.200 | 4.2% |
| /propiedades | 11.3 | 24.000 | 1.8% |`,
    metadata: {
      score: 71,
      critical_issues: 3,
      warning_issues: 8,
      opportunities: 12,
      pages_audited: 1240,
      tool: 'Semrush + manual analysis',
      period: '2026-03',
    },
    created_at: '2026-03-18 09:00:00',
    updated_at: '2026-03-19 10:00:00',
  },

  {
    id: IDS.E4,
    agent_id: 'seo-agent',
    type: 'meta_tag',
    status: 'draft',
    title: 'Meta Tags Optimizadas: /propiedades/dubai-marina',
    content: `Title: Propiedades en Dubai Marina | Apartamentos desde €235.000 | Emiralia
Description: Descubre 847 propiedades en Dubai Marina. Apartamentos con vistas al mar desde €235.000. ROI medio del 7.4%. Guía de inversión incluida. Asesoría gratuita en español.
OG Title: Propiedades en Dubai Marina — Inversión Inmobiliaria
OG Description: Las mejores propiedades en Dubai Marina para inversores hispanohablantes. Datos en tiempo real, análisis de ROI y apoyo legal en español.
Canonical: https://emiralia.com/propiedades/dubai-marina`,
    metadata: {
      page: '/propiedades/dubai-marina',
      title_length: 68,
      description_length: 158,
      target_keyword: 'propiedades dubai marina',
      keyword_in_title: true,
      keyword_in_description: true,
    },
    created_at: '2026-03-22 10:00:00',
    updated_at: '2026-03-22 10:00:00',
  },

  {
    id: IDS.E5,
    agent_id: 'seo-agent',
    type: 'structured_data',
    status: 'approved',
    title: 'Schema Property JSON-LD — 45 Propiedades Generadas (Batch Marzo 2026)',
    content: `Generación en batch de Schema.org/Property para las 45 propiedades con más tráfico orgánico. Incluye: name, description, price, address, geo coordinates, numberOfRooms, floorSize, amenityFeature.`,
    metadata: {
      schema_type: 'Property',
      total_generated: 45,
      properties_targeted: 'top_traffic',
      validation_status: 'passed',
      validator: 'Google Rich Results Test',
      applied_to_site: true,
      expected_impression_increase: '12-18%',
    },
    created_at: '2026-03-20 09:00:00',
    updated_at: '2026-03-21 14:00:00',
  },

  // ── PM AGENT ───────────────────────────────────────────────────────────────

  {
    id: IDS.P1,
    agent_id: 'pm-agent',
    type: 'prd',
    status: 'approved',
    title: 'PRD: Portal de Developers B2B — Dashboard de Analytics y Leads',
    content: `# PRD: Developer B2B Portal

## Problema
Los developers inmobiliarios de Dubai que listan propiedades en Emiralia no tienen visibilidad sobre el rendimiento de sus listings ni acceso a los leads que generan. Sin esta información, es imposible justificar el pago de suscripción B2B.

## Solución
Portal web privado (por developer) con:
1. Dashboard de analytics: visitas por propiedad, tiempo medio en ficha, tasa de contacto
2. Leads recibidos: nombre, país, presupuesto, intención (alquiler/compra), fecha
3. Performance comparativa: su propiedad vs media de su zona
4. Export de datos: CSV semanal automático

## Usuarios objetivo
- Key Account: director de ventas del developer (1 por developer)
- Viewer: agentes comerciales del developer (hasta 5 por cuenta)

## Métricas de éxito
- 3 developers con acceso al portal en Q2 2026
- Al menos 1 developer pagando suscripción mensual antes de Q3 2026
- NPS del portal ≥ 8/10 en primera encuesta

## Fases
1. MVP (Q2): dashboard básico + lista de leads
2. v1.1 (Q3): comparativa de zona + export automático
3. v2.0 (Q4): integración CRM developer + alertas personalizadas`,
    metadata: {
      project_id: 'B2B-001',
      priority: 'P0',
      quarter: 'Q2 2026',
      status_phase: 'approved_for_dev',
      assigned_to: ['dev-agent', 'frontend-agent', 'analytics-agent'],
    },
    created_at: '2026-03-05 10:00:00',
    updated_at: '2026-03-15 16:00:00',
  },

  {
    id: IDS.P2,
    agent_id: 'pm-agent',
    type: 'sprint',
    status: 'pending_review',
    title: 'Sprint 14 — Agent Workspaces Fase 3-4 (24 Mar - 6 Abr 2026)',
    content: `# Sprint 14

**Fechas:** 24 marzo – 6 abril 2026
**Objetivo:** Completar workspaces piloto (Content + Social) y workspaces core (Marketing + Analytics + Legal)

## Historias de usuario

| ID | Historia | Puntos | Agente | Estado |
|----|----------|--------|--------|--------|
| US-091 | ContentWorkspace wizard de generación | 8 | dev-agent | To Do |
| US-092 | SocialWorkspace calendario drag&drop | 13 | dev-agent | To Do |
| US-093 | MarketingWorkspace Gantt 30/90 días | 8 | dev-agent | To Do |
| US-094 | AnalyticsWorkspace Funnel Sankey | 13 | dev-agent | To Do |
| US-095 | LegalWorkspace FAQ bank con categorías | 8 | dev-agent | To Do |
| US-096 | ArtifactCard acciones contextuales | 5 | dev-agent | To Do |
| US-097 | PublishMenu por tipo de artefacto | 5 | dev-agent | To Do |

**Velocity objetivo:** 60 puntos
**Total sprint:** 60 puntos`,
    metadata: {
      sprint_number: 14,
      start_date: '2026-03-24',
      end_date: '2026-04-06',
      velocity_target: 60,
      story_points: 60,
      project: '039-agent-workspaces',
    },
    created_at: '2026-03-21 10:00:00',
    updated_at: '2026-03-21 10:00:00',
  },

  {
    id: IDS.P3,
    agent_id: 'pm-agent',
    type: 'user_story',
    status: 'approved',
    title: 'US-089: Como inversor quiero ver el historial de precios de una propiedad',
    content: `## User Story US-089

**Como** inversor hispanohablante,
**Quiero** ver el historial de precios de una propiedad en el tiempo,
**Para** entender si el precio actual es una buena oportunidad o está sobrevalorado.

## Criterios de aceptación
- [ ] Gráfico de línea con precio por m² en los últimos 12 meses
- [ ] Datos de al menos 3 transacciones históricas si están disponibles en DLD
- [ ] Comparativa del precio actual vs precio medio de la zona
- [ ] Badge "Por encima del mercado" / "En línea" / "Oportunidad" automático
- [ ] Tooltip en cada punto del gráfico con fecha y precio exacto

## Notas técnicas
- Datos históricos: DLD Transactions API o scraping manual
- Gráfico: recharts LineChart
- Fallback si sin datos: "Historial no disponible, propiedad nueva en el mercado"

## Dependencias
- US-087 (DLD Transactions scraper) — completada ✅`,
    metadata: {
      story_id: 'US-089',
      epic: 'Ficha de Propiedad',
      priority: 'medium',
      story_points: 8,
      sprint: 13,
      status_dev: 'done',
    },
    created_at: '2026-03-10 09:00:00',
    updated_at: '2026-03-20 17:00:00',
  },

  {
    id: IDS.P4,
    agent_id: 'pm-agent',
    type: 'roadmap',
    status: 'approved',
    title: 'Roadmap Q2 2026 — Agent Workspaces Fases 4-6 + Portal B2B',
    content: `# Roadmap Q2 2026 (Abril - Junio)

## Tema principal: B2B Revenue + Agent Workspaces completo

## Abril 2026
- Sprint 14: Workspaces Fase 3-4 (Content, Social, Marketing, Analytics, Legal)
- Sprint 15: Workspaces Fase 5 (Design, Dev, Data, SEO, PM)
- Inicio desarrollo Portal B2B (PRD aprobado)

## Mayo 2026
- Sprint 16: Workspaces Fase 6 (WAT Auditor, Research + QA)
- Sprint 17: Portal B2B MVP — dashboard + leads
- Onboarding de 3 developers piloto al portal

## Junio 2026
- Sprint 18: Portal B2B mejoras + feedback developers
- Sprint 19: Integraciones externas Workspaces (Instagram API, HeyGen)
- **Meta: primera transacción B2B antes del 30 junio**

## KPIs de éxito Q2
| Métrica | Objetivo |
|---------|---------|
| Workspaces completados | 12/12 |
| Developers en portal | 3 |
| Revenue B2B | €1 (primer pago) |
| Leads cualificados/mes | 400 |`,
    metadata: {
      period: 'Q2 2026',
      sprints: [14, 15, 16, 17, 18, 19],
      north_star: 'primera_transaccion_b2b',
      deadline: '2026-06-30',
    },
    created_at: '2026-03-20 14:00:00',
    updated_at: '2026-03-22 10:00:00',
  },

  // ── WAT AUDITOR ────────────────────────────────────────────────────────────

  {
    id: IDS.W1,
    agent_id: 'wat-auditor-agent',
    type: 'audit_report',
    status: 'approved',
    title: 'Auditoría WAT System — Semana 12 — Score: 82/100',
    content: `# WAT System Audit — Semana 12 (17-23 Marzo 2026)

## Score Global: 82/100 (+3 vs semana anterior)

## Breakdown por categoría

| Categoría | Score | Trend |
|-----------|-------|-------|
| CLAUDE.md — Completitud | 91/100 | ↑ |
| Agentes — Definiciones | 88/100 | → |
| Skills — Cobertura | 79/100 | ↑ |
| Tools — Documentación | 84/100 | ↑ |
| Workflows — Actualización | 73/100 | ↓ |
| Memoria WAT — Uso | 85/100 | → |

## Critical Issues (1)
- **Workflows desactualizados:** 3 de 7 workflows activos tienen steps que referencian herramientas que ya no existen (translate-v1, scrape-basic). Requiere actualización urgente.

## Warnings (4)
- social-media-agent: skill "calendar-social" listada en AGENTS.md pero no existe en .claude/skills/
- analytics-agent: sin workflow propio documentado
- 2 tools en TOOLS.md sin ejemplo de uso
- seo-agent: skills "generar-keywords" y "meta-optimizer" no tienen SKILL.md

## Improvement Proposals (6)
- Crear workflow para Agent Workspaces (proyecto 039)
- Documentar skills nuevas del seo-agent
- Actualizar workflows con tools vigentes
- Añadir test de integración para tools críticas`,
    metadata: {
      week: 12,
      year: 2026,
      score: 82,
      prev_score: 79,
      critical_issues: 1,
      warnings: 4,
      improvement_proposals: 6,
      agents_audited: 13,
      skills_audited: 35,
      tools_audited: 46,
    },
    created_at: '2026-03-23 08:30:00',
    updated_at: '2026-03-23 08:30:00',
  },

  {
    id: IDS.W2,
    agent_id: 'wat-auditor-agent',
    type: 'inconsistency',
    status: 'approved',
    title: 'Gap: social-media-agent declara skill "calendar-social" que no existe en .claude/skills/',
    content: `## Inconsistencia Detectada

**Tipo:** Skill declarada pero no implementada
**Agente afectado:** social-media-agent
**Severidad:** Warning

**Descripción:**
En .claude/agents/social-media-agent.md, el agente declara la skill "calendar-social" en su lista de skills disponibles. Sin embargo, el directorio .claude/skills/ no contiene ningún archivo calendar-social.md ni subdirectorio calendar-social/.

**Evidencia:**
- Declarado en: .claude/agents/social-media-agent.md línea 23
- Buscado en: .claude/skills/** — sin resultado

**Impacto:**
Si un usuario o agente intenta invocar /calendar-social, recibirá un error de skill no encontrada.

**Acción recomendada:**
Opción A: Crear la skill en .claude/skills/marketing/calendar-social/SKILL.md
Opción B: Eliminar la declaración en el .md del agente si la funcionalidad ya está cubierta por otra skill

**Asignado a:** dev-agent para resolución técnica`,
    metadata: {
      inconsistency_type: 'missing_skill_file',
      agent_affected: 'social-media-agent',
      severity: 'warning',
      file_declaring: '.claude/agents/social-media-agent.md',
      missing_file: '.claude/skills/marketing/calendar-social/',
      assigned_to: 'dev-agent',
    },
    created_at: '2026-03-23 08:35:00',
    updated_at: '2026-03-23 08:35:00',
  },

  // ── RESEARCH AGENT ─────────────────────────────────────────────────────────

  {
    id: IDS.R1,
    agent_id: 'research-agent',
    type: 'intelligence_report',
    status: 'published',
    title: 'Claude Code 4.0 — Nuevas Capacidades de Subagentes y Tools — Impacto ALTO',
    content: `# Intelligence Report: Claude Code 4.0

**Fuente:** Anthropic Docs + GitHub anthropics/claude-code
**Fecha:** 21 marzo 2026
**Impacto:** ALTO

## Resumen ejecutivo
Anthropic ha lanzado Claude Code 4.0 con mejoras significativas en el sistema de subagentes. El Agent SDK ahora soporta comunicación bidireccional entre agentes padre e hijo, lo que permite arquitecturas de coordinación más complejas.

## Cambios relevantes para Emiralia

### 1. SendMessage para agentes persistentes
Los agentes pueden ahora recibir mensajes adicionales durante su ejecución sin reiniciar el contexto. Impacto: el WAT Auditor puede recibir actualizaciones del Research Agent en tiempo real durante una auditoría.

### 2. Worktree isolation
Nuevo parámetro isolation:"worktree" en el Agent tool. Permite que subagentes trabajen en un branch git separado y luego mergear. Impacto directo en Dev Agent.

### 3. Background agents mejorados
Los agentes en background ahora notifican automáticamente al padre cuando completan. Reduce polling innecesario en workflows multi-agente.

## Acción requerida
→ WAT Auditor: actualizar definiciones de agentes con nuevas capacidades
→ Dev Agent: explorar uso de worktree isolation en sprint 15
→ PM Agent: revisar workflows que usen Agent tool

**Urgencia:** Esta semana`,
    metadata: {
      source: 'Anthropic Docs',
      category: 'claude_updates',
      impact: 'HIGH',
      action_required: true,
      agents_to_notify: ['wat-auditor-agent', 'dev-agent', 'pm-agent'],
      version_detected: 'Claude Code 4.0',
    },
    created_at: '2026-03-21 10:00:00',
    updated_at: '2026-03-21 10:00:00',
  },

  {
    id: IDS.R2,
    agent_id: 'research-agent',
    type: 'intelligence_report',
    status: 'approved',
    title: 'PropTech Dubai Q1 2026: Bayut lanza IA para Valoración Automática',
    content: `# Intelligence Report: Bayut AI Valuations

**Fuente:** Bayut Blog + Gulf News PropTech + LinkedIn
**Fecha:** 19 marzo 2026
**Impacto:** MEDIO

## Resumen
Bayut ha lanzado "Bayut Valuate", herramienta de valoración automática de propiedades basada en IA. Actualmente solo disponible en inglés y árabe. Sin versión en español.

## Análisis competitivo
Esta herramienta aumenta el valor percibido de Bayut para inversores internacionales. Sin embargo, la ausencia de soporte en español es una oportunidad clara para Emiralia.

## Implicaciones para Emiralia
1. **Acortar el gap:** Emiralia debería lanzar su propia calculadora ROI avanzada en español (ya en desarrollo — US-091)
2. **Diferenciador claro:** "La única valoración de propiedades en Dubai explicada en español"
3. **PR opportunity:** Posicionar Emiralia como alternativa hispanohablante a Bayut Valuate

## Acción recomendada
→ Marketing Agent: crear contenido comparativo "Emiralia vs Bayut Valuate — Por qué el español importa"
→ Dev Agent: acelerar lanzamiento de Calculadora ROI (actualmente en PR #127)`,
    metadata: {
      source: 'Bayut Blog + Gulf News',
      category: 'competitor_intel',
      impact: 'MEDIUM',
      competitor: 'Bayut',
      action_required: true,
      agents_to_notify: ['marketing-agent', 'dev-agent'],
    },
    created_at: '2026-03-19 14:00:00',
    updated_at: '2026-03-20 09:00:00',
  },

  {
    id: IDS.R3,
    agent_id: 'research-agent',
    type: 'market_alert',
    status: 'approved',
    title: 'Alerta: DLD reduce tasas de registro al 3% para first-time buyers (propuesta)',
    content: `# Market Alert: DLD Registration Fee — Posible Reducción

**Fuente:** Khaleej Times + DLD Press Release (borrador)
**Fecha:** 22 marzo 2026
**Impacto:** ALTO (si se confirma)
**Certeza:** MEDIA (propuesta, no oficial)

## Resumen
El Departamento de Tierras de Dubai (DLD) está evaluando reducir el DLD Registration Fee del 4% al 3% para compradores de primera propiedad en UAE (first-time buyers). La medida busca estimular la demanda de compradores-ocupantes vs inversores puros.

## Estado actual
La propuesta fue presentada en el Dubai Real Estate Forum del 20 marzo. Sin anuncio oficial todavía. Se espera decisión antes del 1 de mayo.

## Impacto potencial en Emiralia
Si se confirma:
- Para una propiedad de AED 1.850.000: ahorro de AED 18.500 (≈€4.600)
- Potencial aumento de demanda de compradores primera vivienda (nuevo segmento)
- Actualizar todas las FAQ y guías de "costes de compra"

## Acción requerida
- Monitorear anuncio oficial DLD
- Legal Agent: preparar borrador de FAQ actualizada (condicional)
- Content Agent: preparar artículo sobre el cambio (pendiente confirmación)`,
    metadata: {
      source: 'Khaleej Times',
      category: 'market_regulation',
      impact: 'HIGH',
      certainty: 'MEDIUM',
      action_required: true,
      monitoring: true,
      agents_to_notify: ['legal-agent', 'content-agent'],
      expected_official_date: '2026-05-01',
    },
    created_at: '2026-03-22 16:00:00',
    updated_at: '2026-03-22 16:00:00',
  },

  {
    id: IDS.R4,
    agent_id: 'research-agent',
    type: 'competitor_intel',
    status: 'approved',
    title: 'Análisis Competidor: HouseSearch lanza versión en español para Dubai',
    content: `# Competitor Intel: HouseSearch.ae en Español

**Fuente:** HouseSearch.ae + App Store + LinkedIn Ads espía
**Fecha:** 18 marzo 2026
**Impacto:** ALTO — competidor directo

## Resumen
HouseSearch.ae, plataforma británica de búsqueda de propiedades en UAE con 180.000 listings, ha lanzado su versión en español. Incluye: interfaz traducida, blog en español (5 artículos iniciales), y están anunciando en LinkedIn España y México.

## Análisis de su propuesta de valor en español
**Fortalezas:**
- Gran base de datos (180K listings vs 2.8K de Emiralia)
- Marca consolidada en inglés (5 años de operación)
- Budget de marketing significativo (se estiman €50K/mes en paid)

**Debilidades:**
- Traducción automática (calidad media, no nativa)
- Sin contenido educativo real (solo listados)
- Sin asesoría legal ni guías de inversión en español
- Sin agentes IA especializados

## Recomendación
No entrar en guerra de precio/volumen. Defender el posicionamiento de "asesor inteligente en español" vs "buscador traducido".

**Acción:** Marketing Agent debe publicar contenido que refuerce nuestra diferenciación: "No somos una traducción. Somos el primer portal nativo en español para Dubai."`,
    metadata: {
      competitor: 'HouseSearch.ae',
      threat_level: 'HIGH',
      category: 'competitor_intel',
      action_required: true,
      agents_to_notify: ['marketing-agent', 'content-agent', 'seo-agent'],
    },
    created_at: '2026-03-18 11:00:00',
    updated_at: '2026-03-19 09:00:00',
  },
];

// ─── PUBLICATIONS ─────────────────────────────────────────────────────────────

const PUBLICATIONS = [
  // blog_post C1 → web
  {
    artifact_id: IDS.C1,
    destination: 'web',
    destination_id: '/blog/guia-invertir-dubai-marina-2026',
    status: 'published',
    published_at: '2026-03-14 12:00:00',
    metrics: { page_views: 3842, unique_visitors: 2910, avg_time_sec: 248, bounce_rate: 0.42, leads_generated: 38 },
  },
  // blog_post C1 → email newsletter
  {
    artifact_id: IDS.C1,
    destination: 'email',
    destination_id: 'brevo-campaign-march-001',
    status: 'published',
    published_at: '2026-03-15 10:00:00',
    metrics: { recipients: 1847, open_rate: 0.41, ctr: 0.18, unsubscribes: 3 },
  },
  // property_listing C4 → web
  {
    artifact_id: IDS.C4,
    destination: 'web',
    destination_id: '/propiedades/canal-crown-business-bay-2br',
    status: 'published',
    published_at: '2026-03-12 09:30:00',
    metrics: { page_views: 1240, inquiries: 14, whatsapp_clicks: 8, saved_by_users: 31 },
  },
  // email_template C6 → email
  {
    artifact_id: IDS.C6,
    destination: 'email',
    destination_id: 'brevo-newsletter-marzo-2026',
    status: 'published',
    published_at: '2026-03-20 11:00:00',
    metrics: { recipients: 2134, open_rate: 0.44, ctr: 0.21, replies: 12, unsubscribes: 2 },
  },
  // video_script S1 → instagram
  {
    artifact_id: IDS.S1,
    destination: 'instagram',
    destination_id: 'ig_post_17924831029384710',
    status: 'published',
    published_at: '2026-03-14 18:00:00',
    metrics: { views: 18420, likes: 1240, comments: 87, shares: 312, saves: 428, reach: 14800, engagement_rate: 0.089 },
  },
  // analytics report A1 → email (weekly digest)
  {
    artifact_id: IDS.A1,
    destination: 'email',
    destination_id: 'brevo-kpi-report-marzo-2026',
    status: 'published',
    published_at: '2026-03-23 09:00:00',
    metrics: { recipients: 5, open_rate: 1.0, ctr: 0.6 },
  },
  // legal FAQ L1 → web
  {
    artifact_id: IDS.L1,
    destination: 'web',
    destination_id: '/legal/faq/costes-compra-dubai',
    status: 'published',
    published_at: '2026-03-02 10:00:00',
    metrics: { page_views: 4120, helpful_votes: 189, not_helpful_votes: 11, leads_from_page: 24 },
  },
  // legal FAQ L2 → web
  {
    artifact_id: IDS.L2,
    destination: 'web',
    destination_id: '/legal/faq/golden-visa-que-es',
    status: 'published',
    published_at: '2026-03-02 11:00:00',
    metrics: { page_views: 6840, helpful_votes: 312, not_helpful_votes: 8, leads_from_page: 47 },
  },
  // dataset D2 → web (internal feed)
  {
    artifact_id: IDS.D2,
    destination: 'web',
    destination_id: 'internal-properties-feed-v12',
    status: 'published',
    published_at: '2026-03-23 05:30:00',
    metrics: { listings_live: 2847, listings_featured: 45, api_calls_today: 1240 },
  },
  // SEO keyword cluster E1 → web (applied to site)
  {
    artifact_id: IDS.E1,
    destination: 'web',
    destination_id: 'seo-cluster-invertir-dubai-applied',
    status: 'published',
    published_at: '2026-03-16 12:00:00',
    metrics: { keywords_applied: 16, pages_updated: 8, avg_position_before: 12.3, avg_position_after: 6.8 },
  },
  // intelligence_report R1 → email
  {
    artifact_id: IDS.R1,
    destination: 'email',
    destination_id: 'internal-intel-digest-week-12',
    status: 'published',
    published_at: '2026-03-21 11:00:00',
    metrics: { recipients: 4, open_rate: 1.0 },
  },
];

// ─── HANDOFFS ─────────────────────────────────────────────────────────────────

const HANDOFFS = [
  // blog_post C2 (approved) → translation-agent
  {
    artifact_id: IDS.C2,
    from_agent_id: 'content-agent',
    to_agent_id: 'translation-agent',
    instruction: 'Traducir al inglés (EN) para publicar en la sección /blog/en/ del sitio. Mantener el tono informativo y los datos exactos. Adaptar el contexto para audiencia anglófona de UAE.',
    status: 'pending',
    completed_at: null,
  },
  // faq L1 (published) → content-agent (convertir en artículo)
  {
    artifact_id: IDS.L1,
    from_agent_id: 'legal-agent',
    to_agent_id: 'content-agent',
    instruction: 'Convertir esta FAQ en un artículo de blog completo de 800-1000 palabras. Título sugerido: "Todos los gastos al comprar en Dubai: la guía definitiva para hispanos". Añadir ejemplos reales y tabla comparativa por zona.',
    status: 'completed',
    completed_at: '2026-03-12 14:00:00',
  },
  // video_script S2 (approved) → content-agent (generar cover)
  {
    artifact_id: IDS.S2,
    from_agent_id: 'social-media-agent',
    to_agent_id: 'content-agent',
    instruction: 'Generar imagen de cover para este reel de Yolanda. Estilo: minimalista, fondo blanco, texto grande en negro "ERROR #1 AL INVERTIR EN DUBAI", con badge rojo de advertencia. Formato: 1080x1920px.',
    status: 'pending',
    completed_at: null,
  },
  // keyword cluster E1 (published) → content-agent
  {
    artifact_id: IDS.E1,
    from_agent_id: 'seo-agent',
    to_agent_id: 'content-agent',
    instruction: 'Crear briefs de contenido para las 12 keywords sin página de destino identificadas en este cluster. Prioridad: "guia off-plan dubai" (590 búsq/mes), "impuestos propiedad dubai" (480 búsq/mes), "hipoteca no residente dubai" (390 búsq/mes). Un brief por keyword con: título H1 sugerido, estructura de secciones, keywords secundarias a incluir.',
    status: 'completed',
    completed_at: '2026-03-17 16:00:00',
  },
  // legal_guide L5 (approved) → translation-agent
  {
    artifact_id: IDS.L5,
    from_agent_id: 'legal-agent',
    to_agent_id: 'translation-agent',
    instruction: 'Traducir la guía completa al inglés para publicar en /legal/en/buying-property-dubai-guide. Es un documento legal sensible — mantener exactitud total en términos técnicos (DLD, NOC, MOU, Title Deed). No adaptar, solo traducir con precisión.',
    status: 'pending',
    completed_at: null,
  },
  // seo_audit E3 (approved) → dev-agent
  {
    artifact_id: IDS.E3,
    from_agent_id: 'seo-agent',
    to_agent_id: 'dev-agent',
    instruction: 'Resolver los 3 critical issues técnicos de la auditoría SEO: (1) LCP 4.2s → optimizar imágenes hero con lazy load, (2) 18 páginas sin meta description → script de auto-generación desde content, (3) sitemap.xml desactualizado → regenerar automáticamente con todas las URLs activas.',
    status: 'pending',
    completed_at: null,
  },
];

// ─── FUNCTIONS ────────────────────────────────────────────────────────────────

async function seedArtifacts() {
  const client = await pool.connect();
  try {
    console.log('Seeding artifacts...');
    for (const a of ARTIFACTS) {
      await client.query(
        `INSERT INTO artifacts (id, agent_id, type, status, title, content, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE
         SET agent_id = EXCLUDED.agent_id, type = EXCLUDED.type, status = EXCLUDED.status,
             title = EXCLUDED.title, content = EXCLUDED.content, metadata = EXCLUDED.metadata,
             updated_at = EXCLUDED.updated_at`,
        [
          a.id, a.agent_id, a.type, a.status, a.title, a.content,
          JSON.stringify(a.metadata),
          a.created_at || new Date(),
          a.updated_at || new Date(),
        ]
      );
      console.log(`  + artifact [${a.status}] ${a.agent_id} / ${a.type}: ${a.title.substring(0, 60)}...`);
    }

    console.log('\nSeeding publications...');
    for (const p of PUBLICATIONS) {
      await client.query(
        `INSERT INTO artifact_publications (artifact_id, destination, destination_id, status, published_at, metrics)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [p.artifact_id, p.destination, p.destination_id, p.status, p.published_at || null, JSON.stringify(p.metrics || {})]
      );
      console.log(`  + publication ${p.destination}: ${p.destination_id}`);
    }

    console.log('\nSeeding handoffs...');
    for (const h of HANDOFFS) {
      await client.query(
        `INSERT INTO artifact_handoffs (artifact_id, from_agent_id, to_agent_id, instruction, status, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [h.artifact_id, h.from_agent_id, h.to_agent_id, h.instruction, h.status, h.completed_at || null]
      );
      console.log(`  + handoff ${h.from_agent_id} → ${h.to_agent_id} [${h.status}]`);
    }

    const { rows } = await client.query('SELECT count(*) FROM artifacts WHERE id = ANY($1::uuid[])', [ALL_IDS]);
    console.log(`\nDone. ${rows[0].count}/${ALL_IDS.length} seeded artifacts in DB.`);
    console.log('Remove with: node tools/db/seed_artifacts.js --clean\n');
  } finally {
    client.release();
    await pool.end();
  }
}

async function cleanArtifacts() {
  const client = await pool.connect();
  try {
    console.log('Removing seeded artifacts (cascade deletes publications + handoffs)...');
    const { rowCount } = await client.query(
      'DELETE FROM artifacts WHERE id = ANY($1::uuid[])',
      [ALL_IDS]
    );
    console.log(`Done. ${rowCount} artifacts removed.`);
  } finally {
    client.release();
    await pool.end();
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

const isClean = process.argv.includes('--clean');
(isClean ? cleanArtifacts() : seedArtifacts())
  .catch(err => { console.error(err); process.exit(1); });
