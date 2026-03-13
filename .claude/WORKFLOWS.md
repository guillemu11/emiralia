# Workflows de Emiralia

SOPs (Standard Operating Procedures) que coordinan múltiples agentes y tools.

**Total: 7 activos** | **4 planificados** | Última actualización: 2026-03-13

---

## Activos

| Workflow | Objetivo | Agentes | Inputs | Outputs | Trigger | File |
|----------|----------|---------|--------|---------|---------|------|
| **Data Intelligence** | Pipeline end-to-end: scrape → clean → analyze → insights | Data Agent, Content Agent | Location, property type, filters | Properties DB + analytics report | Manual o scheduled (diario) | [data-intelligence.md](workflows/data-intelligence.md) |
| **GTM Planning** | Planificar estrategia Go-to-Market completa | PM Agent, Marketing Agent | Target segment, budget, timeline | GTM plan + roadmap + canales | Manual (quarterly) | [gtm-planning.md](workflows/gtm-planning.md) |
| **Marketing Planning** | Diseñar campaña de marketing end-to-end | Marketing Agent, PM Agent | Campaign goal, budget, audience | Campaign plan + copies + métricas | Manual (mensual) | [marketing-planning.md](workflows/marketing-planning.md) |
| **PM Review** | Review de propuestas con PM Agent + challenge + plan ejecutable | PM Agent | Idea o propuesta | PRD + tasks + estimaciones | Manual (on-demand) | [pm-review.md](workflows/pm-review.md) |
| **Scrape PropertyFinder** | Scraping automatizado de PropertyFinder.ae vía Apify | Data Agent | Location, property type | Properties JSON + DB insert | Scheduled (diario 3am) | [scrape_propertyfinder.md](workflows/scrape_propertyfinder.md) |
| **Screenshot Design Loop** | Iteración de diseño: screenshot → feedback → edit → repeat | Frontend Agent | Screenshot + feedback | Updated HTML + screenshot | Manual (on-demand) | [screenshot_design_loop.md](workflows/screenshot_design_loop.md) |
| **Sprint Planning** | Planificar sprint semanal para equipo de agentes | PM Agent, Dev Agent, Data Agent, Frontend Agent | Backlog + prioridades | Sprint plan + tasks asignadas | Scheduled (lunes 9am) | [sprint-planning.md](workflows/sprint-planning.md) |

---

## En Desarrollo

| Workflow | Objetivo | Agentes Requeridos | Bloqueador | ETA |
|----------|----------|-------------------|------------|-----|
| **Lead Nurturing** | Pipeline automatizado: lead → qualification → follow-up → conversion | Sales Agent, Marketing Agent, Customer Success Agent | Sales Agent no implementado | Q1 2026 |
| **Content Publishing** | Workflow completo: scrape → translate → review → publish | Data Agent, Translation Agent, Content Agent, PM Agent | Integración con CMS | Q2 2026 |
| **SEO Optimization** | Auditoría SEO + optimización + tracking | SEO Agent, Frontend Agent, Marketing Agent | SEO Agent no implementado | Q2 2026 |
| **Developer Onboarding** | Onboarding B2B de developers en plataforma | Sales Agent, PM Agent, Frontend Agent | B2B portal no existe | Q2 2026 |

---

## Workflow Graph

Conexiones entre workflows y agentes.

```
┌─────────────────────────────────────────────────────────────────┐
│                         WORKFLOWS ACTIVOS                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│ Data Intelligence│────────>│ Content Publishing│ (planned)
└────────┬─────────┘         └──────────────────┘
         │
         │ feeds
         v
┌──────────────────┐         ┌──────────────────┐
│ Scrape PF (daily)│         │ Marketing Planning│
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         │ provides data              │ defines campaigns
         v                            v
┌──────────────────┐         ┌──────────────────┐
│   PM Review      │<────────│   GTM Planning   │
└────────┬─────────┘         └──────────────────┘
         │
         │ outputs tasks
         v
┌──────────────────┐         ┌──────────────────┐
│ Sprint Planning  │────────>│ Screenshot Loop  │
└──────────────────┘         └──────────────────┘
         │                            │
         │                            │
         └────────────────┬───────────┘
                          v
                  ┌──────────────┐
                  │ DEV EXECUTION│
                  └──────────────┘
```

---

## Triggers

### Manual (on-demand)
- **PM Review** - cuando hay idea/propuesta nueva
- **Marketing Planning** - al planificar campaña
- **Screenshot Design Loop** - durante desarrollo frontend
- **GTM Planning** - quarterly o cuando hay pivot estratégico

### Scheduled (automated)
- **Scrape PropertyFinder** - diario 3am (cron)
- **Sprint Planning** - lunes 9am (cron)
- **Data Intelligence** - semanal domingo 6pm (cron)

### Event-driven (planned)
- **Lead Nurturing** - trigger: nuevo lead en DB
- **Content Publishing** - trigger: traducción completada
- **SEO Optimization** - trigger: nueva página publicada
- **Developer Onboarding** - trigger: developer signup

---

## Memoria Compartida entre Workflows

Workflows coordinan vía **WAT Memory** (PostgreSQL).

| Workflow A | Workflow B | Key Compartida | Propósito |
|------------|------------|----------------|-----------|
| Scrape PropertyFinder | Data Intelligence | `last_scrape_run`, `properties_count` | Saber cuándo scrape completó |
| Data Intelligence | Marketing Planning | `property_stats`, `market_trends` | Alimentar decisiones de campaña |
| PM Review | Sprint Planning | `prd_approved`, `tasks_ready` | Pasar de planning a ejecución |
| Sprint Planning | Screenshot Loop | `sprint_tasks`, `designs_pending` | Coordinar diseño con sprint |
| GTM Planning | Marketing Planning | `target_segments`, `budget_allocated` | Alinear campañas con GTM |
| Data Intelligence | Content Publishing | `translations_queue`, `content_ready` | Pipeline de contenido |

---

## Crear un Workflow Nuevo

1. **Crear archivo:** `.claude/workflows/<workflow-name>.md`
2. **Estructura:**
   ```markdown
   # Workflow: [Nombre]

   ## Objetivo
   [Qué logra el workflow end-to-end]

   ## Agentes Involucrados
   - Agente A (rol en workflow)
   - Agente B (rol en workflow)

   ## Inputs
   - Input 1 (tipo, fuente)
   - Input 2 (tipo, fuente)

   ## Outputs
   - Output 1 (tipo, destino)
   - Output 2 (tipo, destino)

   ## Steps
   1. Step 1 (agente responsable)
   2. Step 2 (agente responsable)
   3. ...

   ## Edge Cases
   - Caso 1: qué hacer si...
   - Caso 2: qué hacer si...

   ## Memoria WAT
   Keys compartidas:
   - `key_1` (scope: shared, propósito)
   - `key_2` (scope: shared, propósito)

   ## Trigger
   Manual | Scheduled (cron) | Event-driven (evento)
   ```
3. **Registrar en WORKFLOWS.md** (este archivo)
4. **Añadir a Workflow Graph** si conecta con otros workflows
5. **Configurar trigger:**
   - Manual: documentar cuándo invocar
   - Scheduled: añadir a cron (Railway, GitHub Actions)
   - Event-driven: configurar webhook/listener
6. **Test end-to-end** ejecutando cada step manualmente
