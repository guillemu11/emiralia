# BUSINESS PLAN — Emiralia

> Norte estrategico del proyecto. Documento vivo. Ultima revision: 2026-03-06.
> Todo agente debe consultar este documento antes de tomar decisiones estrategicas.

---

## 1. Vision y Mision

**Vision:** Ser el mayor portal de inversion inmobiliaria sobre plano del mundo. Cualquier inversor, en cualquier idioma, accede a los mejores mercados inmobiliarios globales.

**Mision:** Democratizar el acceso a inversion inmobiliaria off-plan global, empezando por el mercado hispanohablante en EAU.

**Diferenciador:** AI-native desde el dia 1. No es IA anadida — es IA como sistema operativo.

---

## 2. Modelo de Negocio

| Rol | Quien | Paga? |
|-----|-------|-------|
| **Cliente pagador** | Developers (promotoras inmobiliarias) | Si — suscripcion + comision por lead cualificado |
| **Usuario final** | Inversores de todo el mundo | No — acceso gratuito |

**Modelo hibrido B2B:**
- **Stream 1 — Suscripcion:** Developers pagan fee mensual/anual por mercado para listar sus proyectos off-plan.
- **Stream 2 — Comision por lead:** Comision por cada lead cualificado que convierte en venta real.

---

## 3. Estado Actual vs Vision

Esta tabla es la referencia principal para evaluar cualquier decision. Actualizar conforme avance el proyecto.

| Dimension | Estado Actual (Mar 2026) | Vision Target |
|-----------|--------------------------|---------------|
| **Mercados** | UAE unico (scraping PropertyFinder) | 10+ mercados: EAU, Espana, Portugal, Mexico, Colombia, Turquia, Tailandia... |
| **Modelo de datos** | Listings de brokers/agencias (scrapeados) | Listings directos de developers verificados + data partners |
| **Developers (B2B)** | 0 developers registrados. No existe tabla `developers` en DB | Miles de developers pagando suscripcion global |
| **Inversores** | 0 usuarios registrados | Cientos de miles de inversores activos multi-idioma |
| **Revenue** | $0 (pre-revenue, pre-launch) | Suscripciones B2B + comisiones por lead, revenue recurrente |
| **Idiomas** | Espanol (solo EAU) | Espanol, ingles, portugues, arabe (por mercado) |
| **Infraestructura** | Docker local, Railway planned (~$16/mo) | Multi-region cloud, auto-scaling |
| **Agentes IA** | 5 activos (content, data, dev, frontend, pm) | 15+ agentes cubriendo todas las funciones del negocio |
| **Fuentes de datos** | Apify scraping (PropertyFinder.ae) | APIs directas con developers, partnerships de datos |
| **Posicion competitiva** | Pre-launch, sin traccion | Referente global PropTech para inversion off-plan |
| **Costes operativos** | Near-zero (solo infra) | Near-zero escalando — ventaja AI-native vs competidores con plantilla |

---

## 4. Mercados y Expansion

| Fase | Mercado | Objetivo | Criterio de avance |
|------|---------|----------|--------------------|
| **Phase 0** (actual) | UAE | Data pipeline, WAT framework, website v1 | Plataforma funcional con datos reales |
| **Phase 1** | UAE | B2B launch: firmar 3-5 developers pagando | Primer revenue recurrente validado |
| **Phase 2** | Mercado #2 (TBD) | Replicar modelo en segundo mercado | Revenue internacional |
| **Phase 3+** | 10+ mercados | Escalar el playbook globalmente | Dominancia en off-plan global |

**Criterios para seleccionar nuevo mercado:**
1. Volumen de inversores hispanohablantes (o target language) con poder adquisitivo
2. Developers dispuestos a pagar suscripcion
3. Regulacion favorable para compradores extranjeros
4. Fuentes de datos accesibles (APIs, partnerships)

---

## 5. Propuesta de Valor

### Para Developers (cliente pagador)
- Acceso directo a inversores hispanohablantes con poder adquisitivo real
- Panel de analytics con metricas de leads cualificados
- Sin comision por venta upfront — fee de suscripcion predecible + comision solo cuando convierte
- Presencia en el portal de referencia para el mercado hispano global

### Para Inversores (usuario final, gratis)
- Todos los proyectos off-plan relevantes en un solo lugar, en su idioma
- Transparencia total: precios reales, planos, payment plans, estado de obra
- Contexto que portales locales no dan: comparativas de rentabilidad, guia legal para extranjeros, Golden Visa
- Comunidad de inversores como red de soporte y conocimiento

---

## 6. Revenue Model

| Tier | Incluye | Precio |
|------|---------|--------|
| **Starter** | Hasta N listings por mercado, perfil basico | TBD |
| **Professional** | Listings ilimitados + analytics basicos | TBD |
| **Enterprise** | Analytics avanzados + leads directos + placement destacado | TBD |

**+ Comision por lead cualificado** que convierte en venta (% TBD, validar en Phase 1).

> Precios se definen tras validar con los primeros 3-5 developers en UAE.

---

## 7. Filosofia AI-Native

**Principio:** Cada funcion que una PropTech tradicional contrataria con personas, Emiralia la resuelve primero con agentes IA. Humanos entran solo donde la IA no puede.

| Funcion tradicional | Agente Emiralia | Estado |
|---------------------|-----------------|--------|
| Equipo editorial | Content Agent | Activo |
| Equipo de datos | Data Agent | Activo |
| Ingenieria | Dev Agent | Activo |
| Diseno | Frontend Agent | Activo |
| Producto/Ops | PM Agent | Activo |
| Marketing | Marketing Agent | Definido |
| Ventas | Sales Agent | Pendiente |
| SEO | SEO Agent | Pendiente |
| Legal/Compliance | Legal Agent | Pendiente |
| Finanzas | Financial Agent | Pendiente |

**Ventaja competitiva:** Una PropTech tradicional expandiendose a un nuevo mercado necesita ~$500K+ en contratacion. Emiralia despliega el mismo stack de agentes + nuevas fuentes de datos. Coste marginal: near-zero.

---

## 8. Moat Competitivo

1. **Data moat:** Dataset propietario de propiedades off-plan con metadata en espanol y multiples idiomas — no replicable por scraping.
2. **Community moat:** First-mover en la comunidad de inversores hispanohablantes en real estate global. Brand recognition se acumula.
3. **Developer relationships:** Acuerdos directos con developers (cuando se firmen) bloquean acceso a competidores.
4. **AI-native cost structure:** Costes operativos near-flat al escalar geograficamente, mientras competidores escalan linealmente con plantilla.

---

## 9. Roadmap

| Fase | Hito clave | Agentes protagonistas | Estado |
|------|------------|-----------------------|--------|
| **Phase 0: Foundation** | Data pipeline UAE, WAT framework, website v1, dashboard operativo | Data, Dev, Frontend, PM | EN CURSO |
| **Phase 1: B2B Launch UAE** | 3-5 developers pagando suscripcion, pipeline de leads activo | PM, Marketing, Sales, Dev | PENDIENTE |
| **Phase 2: Second Market** | Modelo replicado en mercado #2, primer revenue internacional | Data, Content, Marketing | PENDIENTE |
| **Phase 3: Platform Scale** | 10+ mercados, 100+ developers, SEO organico > paid acquisition | Todos | PENDIENTE |

---

> **Regla:** Toda decision de producto, feature o prioridad debe evaluarse contra la seccion 3 (Estado Actual vs Vision).
> Si una decision no acerca a Emiralia al target — debe justificarse explicitamente.
