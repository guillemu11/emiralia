---
id: analytics-agent
status: Planning
created: 2026-03-22
agents: [analytics-agent, data-agent, pm-agent]
---

# Analytics Agent — Diseño y Roadmap de Skills

## Problema

El Business Plan define "Panel de analytics con metricas de leads cualificados" como el **core de la propuesta B2B**. Los tiers Professional y Enterprise incluyen analytics como diferenciador de precio. Actualmente no existe ningún agente ni skill dedicado a producir reportes analíticos estructurados — el Data Agent cubre queries ad-hoc pero no produce productos analíticos para developers ni para el equipo interno.

## Solución

Un `analytics-agent` unificado (no dividido) que cubra tres dominios: analytics para developers (B2B product), analytics de plataforma (ops interno), e inteligencia de mercado (data product). Ver definición completa en [analytics-agent.md](../agents/analytics/analytics-agent.md).

**Decisión de arquitectura:** No dividir en múltiples agentes. Split trigger: 20+ developers activos.

## Métricas de éxito

- `/market-pulse` genera reporte semanal automático con datos reales
- `/developer-dashboard` usado en pitch a primeros 3 developers de Phase 1
- PM Agent y Marketing Agent consumen datos del Analytics Agent semanalmente
- 0 queries SQL ad-hoc delegadas al Data Agent que deberían ser skills de Analytics Agent

---

## Skills a considerar por dominio

### Dominio A: Developer Analytics (B2B product — Phase 1)

> **Bloqueo actual:** Requieren tablas `developers` y `developer_listings` en DB. Implementar cuando comience Phase 1 B2B.

#### `/developer-dashboard`
- **Qué hace:** Reporte completo de un developer: leads generados, vistas de listings, tasa de conversión, benchmark vs competidores en la plataforma
- **Input:** `developer_id`, rango de fechas (default: últimos 30 días)
- **Output:** Reporte estructurado MD/HTML apto para enviar al developer
- **Datos necesarios:** `developers`, `developer_listings`, `leads`, `raw_events` (vistas)
- **Audiencia:** Developer (externo, cliente B2B)
- **Consideraciones de diseño:**
  - El output debe ser visualmente atractivo — es un producto que justifica el precio de suscripción
  - Incluir siempre contexto comparativo (vs semana anterior, vs mercado)
  - Nunca exponer datos de otros developers en el mismo reporte

#### `/listing-performance`
- **Qué hace:** Rendimiento de un proyecto específico: vistas, CTR, tiempo en página, leads generados, comparativa con otros proyectos del mismo developer
- **Input:** `listing_id` o `developer_id` (para ver todos sus proyectos)
- **Output:** Tabla de performance por listing + top performers + underperformers
- **Datos necesarios:** `developer_listings`, `raw_events` (vistas, clics), `leads`
- **Audiencia:** Developer (externo) + Sales Agent (interno para detectar oportunidades de upsell)

#### `/lead-quality-report`
- **Qué hace:** Análisis de calidad de leads de un developer: engagement score, perfil demográfico, intent signals, fuente de origen
- **Input:** `developer_id`, rango de fechas
- **Output:** Distribución de leads por calidad + perfil del lead ideal + recomendaciones para mejorar targeting
- **Datos necesarios:** `leads`, campos de engagement en `raw_events`
- **Audiencia:** Developer (externo)
- **Privacidad:** Output usa datos agregados. Nunca exponer PII (email, teléfono) en memoria compartida

#### `/market-benchmark`
- **Qué hace:** Posicionamiento de un developer vs el mercado: precio/m², yield estimado, ritmo de ventas, fortalezas competitivas
- **Input:** `developer_id`, zona o tipo de propiedad
- **Output:** Comparativa developer vs mercado + posicionamiento sugerido
- **Datos necesarios:** `properties` (todos los developers), `developer_listings`
- **Audiencia:** Developer (externo) + Sales Agent para pitch
- **Consideraciones:** Este skill tiene alto valor percibido — muestra al developer inteligencia de mercado que solo Emiralia puede ofrecer por tener datos cross-developer

---

### Dominio B: Platform Analytics (internal ops)

> **Disponibilidad:** Implementar cuando haya primeros leads en la tabla `leads`. Tabla `raw_events` ya existe.

#### `/plataforma-kpis`
- **Qué hace:** Snapshot rápido del estado operativo de la plataforma
- **Input:** (ninguno o rango de fechas)
- **Output:** KPIs principales: propiedades activas, leads totales, top fuentes, skills más usadas, agentes más activos
- **Datos necesarios:** `properties`, `leads`, `raw_events`, `skill_invocations`
- **Audiencia:** PM Agent, equipo interno
- **Frecuencia sugerida:** On-demand o automático lunes 9am
- **Consideraciones:** Output muy conciso (< 10 KPIs). No es un reporte largo, es un health check

#### `/lead-funnel`
- **Qué hace:** Estado actual del pipeline de leads
- **Input:** Rango de fechas (default: últimos 7 días)
- **Output:** Funnel visual: visitantes → leads → cualificados → contactados → demos → cierres
- **Datos necesarios:** `leads`, `raw_events` (para estimar visitantes)
- **Audiencia:** PM Agent, Sales Agent, Marketing Agent
- **Consideraciones:** En Phase 0 el funnel está vacío — diseñar para que sea útil con cualquier volumen de datos

#### `/funnel-report`
- **Qué hace:** Análisis profundo del funnel de conversión, identificando el mayor cuello de botella
- **Input:** Rango de fechas, segmento (por fuente, zona, tipo de propiedad)
- **Output:** Análisis de cada etapa del funnel + identificación del drop-off principal + hipótesis sobre causa + recomendación de acción
- **Datos necesarios:** `leads`, `raw_events`, `properties`
- **Audiencia:** PM Agent para sprint planning, Marketing Agent para optimización de canales
- **Diferencia con `/lead-funnel`:** `/lead-funnel` es el snapshot rápido; `/funnel-report` es el análisis con recomendaciones

---

### Dominio C: Market Intelligence (data product)

> **Disponibilidad:** Implementar primero — los datos de `properties` ya existen hoy desde el scraping de PropertyFinder.

#### `/market-pulse`
- **Qué hace:** Reporte semanal del estado del mercado inmobiliario EAU
- **Input:** (ninguno, o zona específica)
- **Output:** Informe estructurado: tendencias de precio por zona, zonas con mayor actividad, off-plan vs ready split, proyectos nuevos detectados en la semana, outliers de precio
- **Datos necesarios:** `properties` (todos los registros, con timestamps para calcular tendencias)
- **Audiencia:** Marketing Agent (para campañas), Content Agent (para blog), Sales Agent (para pitch), developers (como muestra del valor de datos de Emiralia)
- **Consideraciones:**
  - Este es el skill de mayor impacto inmediato — crea valor con datos que ya tenemos
  - Output debe ser apto para enviar a leads B2B como muestra de inteligencia de mercado
  - Considerar persistir el output en `pm_reports` para poder comparar semanas

#### `/precio-tendencias`
- **Qué hace:** Evolución de precios en el tiempo por zona, tipo de propiedad y/o developer
- **Input:** Zona, tipo de propiedad (apartamento, villa, etc.), rango temporal
- **Output:** Serie temporal de precios + precio/m² promedio + variación % en el período + comparativa zonas
- **Datos necesarios:** `properties` con `created_at` y `price` (histórico)
- **Audiencia:** Content Agent (para artículos de blog), inversores (usuario final), developers (para pricing strategy)
- **Consideraciones:**
  - Valor depende de la antigüedad del dataset — más historial = más utilidad
  - A medida que el scraping acumule histórico, este skill se vuelve más valioso

#### `/roi-estimator`
- **Qué hace:** Estimación de ROI para un tipo de propiedad en una zona
- **Input:** Zona, tipo de propiedad, precio de compra (o rango)
- **Output:** Yield estimado (rental income / precio), apreciación histórica, ROI total estimado, comparativa con otras zonas
- **Datos necesarios:** `properties` (precios actuales y históricos), data externa de rental yields (futura)
- **Audiencia:** Inversores (usuario final de la plataforma), desarrollado como widget/herramienta interactiva en el website
- **Consideraciones:**
  - Necesita datos de alquiler para calcular yield — actualmente PropertyFinder tiene propiedades en venta y alquiler (se pueden cruzar)
  - Muy alta percepción de valor para inversores hispanohablantes que no conocen el mercado EAU

---

## Orden de implementación recomendado

### Fase 1 — Ahora (datos disponibles)
1. `analytics-agent.md` ✅ (creado)
2. `/market-pulse` — primer skill a implementar. Alto valor, datos disponibles hoy
3. `/precio-tendencias` — complementa `/market-pulse`, alimenta Content Agent
4. `/plataforma-kpis` — health check de la plataforma

### Fase 2 — Cuando haya leads
5. `/lead-funnel`
6. `/funnel-report`

### Fase 3 — Phase 1 B2B (cuando existan tablas developers)
7. `/developer-dashboard` ← skill más crítica del roadmap B2B
8. `/listing-performance`
9. `/lead-quality-report`
10. `/market-benchmark`

### Fase 4 — Optimización
11. `/roi-estimator` (requiere cruce de datos venta + alquiler)

---

## Dependencias de DB

| Skill | Tablas requeridas | Estado |
|-------|------------------|--------|
| `/market-pulse` | `properties` | ✅ Disponible |
| `/precio-tendencias` | `properties` | ✅ Disponible |
| `/plataforma-kpis` | `properties`, `raw_events`, `skill_invocations` | ✅ Disponible |
| `/lead-funnel` | `leads`, `raw_events` | ⏳ Cuando haya leads |
| `/funnel-report` | `leads`, `raw_events`, `properties` | ⏳ Cuando haya leads |
| `/developer-dashboard` | `developers`, `developer_listings`, `leads` | ❌ Tablas no existen |
| `/listing-performance` | `developer_listings`, `raw_events`, `leads` | ❌ Tablas no existen |
| `/lead-quality-report` | `leads` (con campos de calidad) | ❌ Schema incompleto |
| `/market-benchmark` | `properties`, `developer_listings` | ❌ Tablas parciales |
| `/roi-estimator` | `properties` (venta + alquiler cruzados) | ⚠️ Requiere validación |

---

## Preguntas abiertas

1. **¿Qué métricas quieren ver los developers en su dashboard?** Validar con los primeros 3-5 developers antes de implementar `/developer-dashboard`. El diseño actual es una hipótesis.
2. **¿Persisten los reportes de market pulse?** Si se genera semanalmente, ¿se guarda historial en `pm_reports`? Útil para detectar tendencias del mercado en el tiempo.
3. **¿Los reportes de developer se envían automáticamente?** ¿Por email, por Telegram, o solo disponibles en el dashboard? Define la arquitectura de entrega.
4. **¿El ROI Estimator es una herramienta del website o un skill interno?** Si es una herramienta del website (widget), la implementación corresponde al Dev Agent + Frontend Agent, no solo al Analytics Agent.
5. **¿Qué nivel de detalle en lead quality scoring?** Lead scoring puede ir desde simple (fuente + engagement) hasta complejo (ML model). Definir el nivel mínimo viable para Phase 1.