---
name: estrategia-gtm
description: >
  Usar cuando se necesite planificar el Go-to-Market de Emiralia para un mercado
  objetivo. Genera un plan GTM completo con canales, mensajes, roadmap y presupuesto
  para alcanzar inversores hispanohablantes en EAU.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[mercado: espana|latam|expats|todos]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - TARGET_MARKET: Mercado objetivo (espana, latam, expats, todos)
  - BUDGET: Presupuesto disponible para 6 meses (opcional)
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Estrategia Go-to-Market

## ¿Qué hace este skill?

Genera un **plan de Go-to-Market completo** para Emiralia en el mercado objetivo seleccionado. Incluye selección de canales, definición de mensajes, roadmap en 3 fases (0-30, 30-90, 90-180 días) y desglose de presupuesto.

## Cuándo usarlo

- Al definir cómo llegar al primer grupo de usuarios.
- Cuando se abre un nuevo mercado geográfico (España → LatAm o viceversa).
- Para planificar el lanzamiento de una nueva funcionalidad.
- Como output del workflow `/gtm-planning`.

---

## Proceso paso a paso

Actúa como un **Head of Growth** especializado en marketplaces PropTech. Para `$ARGUMENTS`:

### Paso 1: Consultar contexto estratégico
```bash
node tools/db/memory.js get pm-agent beachhead_market
node tools/db/memory.js get marketing-agent current_positioning
node tools/db/memory.js get pm-agent competitor_analysis_date
```

### Paso 2: Definir el segmento de entrada
Si no hay beachhead definido, ejecutar primero `/segmento-entrada`.

### Paso 3: Construir el mensaje central
Basado en la propuesta de valor y el posicionamiento definido, crear el mensaje principal para el mercado objetivo.

### Paso 4: Seleccionar canales por fase
Priorizar canales de bajo coste y alta efectividad para early-stage.

### Paso 5: Diseñar el roadmap GTM

---

## Canales relevantes para Emiralia

| Canal | Tipo | Coste | Tiempo a resultados | Mejor para |
|-------|------|-------|---------------------|------------|
| Blog SEO en español | Orgánico | Bajo | 3-6 meses | Tráfico cualificado a largo plazo |
| YouTube (tours + análisis) | Orgánico | Medio | 2-4 meses | Confianza y educación |
| Telegram grupos inversores | Comunidad | Bajo | 1-2 meses | Engagement temprano |
| LinkedIn ads (España) | Pagado | Alto | 1-2 semanas | Profesionales alto poder adquisitivo |
| Google Ads (español, EAU) | Pagado | Alto | Inmediato | Intención de compra directa |
| Partnerships webs finanzas | Referral | Bajo-Medio | 1-3 meses | Audiencia prequalificada |
| Ferias inmobiliarias (SIMA) | Offline | Alto | Puntual | Networking y brand awareness |
| Email newsletter | Owned | Bajo | 2-3 meses | Nurturing de leads |

---

## Plantilla de output

```markdown
# Plan Go-to-Market — [Mercado Objetivo]
**Fecha**: [fecha]
**Presupuesto total 6 meses**: [€]

## Segmento de Entrada
[Beachhead seleccionado y justificación]

## Mensaje Central
> [Value proposition statement adaptado al mercado]

### Mensajes por canal
| Canal | Mensaje | Tono |
|-------|---------|------|
| SEO/Blog | [informativo, educativo] | Experto accesible |
| YouTube | [visual, demostrativo] | Cercano, datos reales |
| Redes sociales | [aspiracional + datos] | Profesional pero humano |
| Email | [personalizado, valor] | Consultor de confianza |

## Roadmap GTM

### Fase 1: Fundación (Días 0-30)
| Acción | Responsable | Entregable | KPI |
|--------|-------------|------------|-----|
| Setup blog SEO + 10 artículos pillar | Content Agent | Blog activo | 10 posts publicados |
| Canal YouTube + 3 vídeos | Content Agent | Canal activo | 3 vídeos publicados |
| Grupo Telegram | Marketing Agent | Comunidad activa | 50 miembros |
| Landing page con captación email | Frontend Agent | LP activa | 100 emails captados |

### Fase 2: Tracción (Días 30-90)
| Acción | Responsable | Entregable | KPI |
|--------|-------------|------------|-----|
| 20 artículos SEO adicionales | Content Agent | Ranking keywords | Top 10 en 5 keywords |
| Newsletter semanal | Marketing Agent | Emails enviados | 500 suscriptores |
| Partnerships con 2 webs finanzas | Marketing Agent | Acuerdos firmados | 2 partnerships |
| Primeros leads cualificados | Sales pipeline | Leads en CRM | 20 leads/mes |

### Fase 3: Escala (Días 90-180)
| Acción | Responsable | Entregable | KPI |
|--------|-------------|------------|-----|
| Google Ads (test) | Marketing Agent | Campaña activa | CPA < 50 EUR |
| LinkedIn Ads (España) | Marketing Agent | Campaña activa | CTR > 1% |
| Webinars inversión Dubai | Content + Marketing | 2 webinars | 100 asistentes |
| Referral program | Dev Agent | Feature activa | 10% leads vía referral |

## Presupuesto
| Canal | Mensual | 6 meses | % Total |
|-------|---------|---------|---------|
| Contenido (escritura + producción) | [€] | [€] | [%] |
| Google Ads | [€] | [€] | [%] |
| LinkedIn Ads | [€] | [€] | [%] |
| Herramientas (SEO, email, analytics) | [€] | [€] | [%] |
| **Total** | **[€]** | **[€]** | **100%** |

## Métricas de Éxito
| Métrica | Mes 1 | Mes 3 | Mes 6 |
|---------|-------|-------|-------|
| Tráfico orgánico mensual | [N] | [N] | [N] |
| Leads cualificados / mes | [N] | [N] | [N] |
| Tasa conversión lead→contacto | [%] | [%] | [%] |
| CAC (coste adquisición cliente) | [€] | [€] | [€] |
| Email suscriptores | [N] | [N] | [N] |
```

---

## Persistencia

```bash
node tools/db/save_research.js --title "Plan GTM — [mercado] [fecha]" --summary "Go-to-Market roadmap 6 meses"
node tools/db/memory.js set pm-agent gtm_plan_date '"[timestamp]"' shared
node tools/db/memory.js set marketing-agent active_channels '"[lista canales]"' shared
```

---

## Notas

- El plan debe ser **ejecutable** por los agentes de Emiralia, no teórico.
- Priorizar canales orgánicos en early-stage. Paid solo si hay presupuesto confirmado.
- Cada acción debe tener un responsable (agente) asignado.
- Complementar con `/segmento-entrada` (beachhead) y `/ideas-marketing` (ideas creativas).
