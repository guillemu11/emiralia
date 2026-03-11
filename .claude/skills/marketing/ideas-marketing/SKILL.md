---
name: ideas-marketing
description: >
  Usar cuando se necesiten ideas creativas de marketing para alcanzar inversores
  hispanohablantes. Genera 5+ ideas cost-effective con canal, mensaje, coste
  estimado y métrica de éxito.
agent: Marketing Agent
disable-model-invocation: true
argument-hint: "[presupuesto mensual o canal específico]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - BUDGET: Presupuesto mensual disponible (opcional)
  - CHANNEL: Canal específico o 'todos'
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Ideas de Marketing

## ¿Qué hace este skill?

Genera **5+ ideas creativas y cost-effective** para alcanzar inversores hispanohablantes interesados en el mercado inmobiliario de EAU. Cada idea incluye canal, mensaje, coste estimado, timeline y métrica de éxito.

## Cuándo usarlo

- Al planificar campañas mensuales de marketing.
- Cuando se necesiten ideas frescas para crecer.
- Para evaluar nuevos canales de adquisición.
- Como parte del workflow de marketing planning.

---

## Contexto de Emiralia

- **Presupuesto**: Early-stage startup, priorizar orgánico.
- **Equipo**: Agentes IA (Content, Marketing, Frontend) + founder humano.
- **Audiencia**: Inversores hispanohablantes (España + LatAm + Expats EAU).
- **Ventaja competitiva**: Único portal PropTech en español para EAU.

## Canales conocidos y su efectividad

| Canal | Tipo | Coste | Madurez en Emiralia |
|-------|------|-------|-------------------|
| Blog SEO español | Orgánico | Bajo | En desarrollo |
| YouTube tours/análisis | Orgánico | Medio | Pendiente |
| Telegram grupos inversores | Comunidad | Bajo | Pendiente |
| LinkedIn (España) | Orgánico/Paid | Medio | Pendiente |
| Google Ads español | Paid | Alto | Pendiente |
| Partnerships webs finanzas (Rankia, El Arte de Invertir) | Referral | Bajo-Medio | Pendiente |
| Ferias inmobiliarias (SIMA Madrid) | Offline | Alto | No aplicable aún |
| Email newsletter | Owned | Bajo | Pendiente |
| WhatsApp Business | Directo | Bajo | Pendiente |

---

## Plantilla de output

```markdown
# Ideas de Marketing — Emiralia
**Fecha**: [fecha]
**Presupuesto**: [€/mes o 'orgánico']

## Idea [N]: [Nombre creativo]

### Descripción
[2-3 líneas explicando la idea]

### Canal
[Canal principal + canales de soporte]

### Mensaje Central
> [El copy o propuesta de valor que usaría esta campaña]

### Audiencia Objetivo
[ICP específico al que va dirigida]

### Ejecución
| Paso | Responsable | Timeline |
|------|-------------|----------|
| [paso 1] | [agente] | [semana N] |

### Coste Estimado
| Concepto | Mensual | One-time |
|----------|---------|----------|
| [concepto] | [€] | [€] |
| **Total** | **[€]** | **[€]** |

### Métrica de Éxito
| Métrica | Target mes 1 | Target mes 3 |
|---------|-------------|-------------|
| [métrica principal] | [valor] | [valor] |

### Riesgo Principal
[Qué puede salir mal y cómo mitigarlo]

---

## Ranking de Ideas

| # | Idea | Coste | Impacto | Tiempo | Score |
|---|------|-------|---------|--------|-------|
| 1 | [idea] | [€] | [1-5] | [semanas] | [score] |

## Recomendación
[Top 3 ideas para implementar este mes y por qué]
```

---

## Persistencia

```bash
node tools/db/save_research.js --title "Ideas Marketing — [fecha]" --summary "Ideas de campañas"
node tools/db/memory.js set marketing-agent last_campaign_at '"[timestamp]"' shared
```

---

## Notas

- Priorizar ideas **orgánicas** en early-stage. Paid solo si hay presupuesto confirmado.
- Cada idea debe ser ejecutable por los agentes de Emiralia, no por un equipo humano de 10 personas.
- Las ideas más potentes combinan **contenido educativo + distribución en comunidades**.
- Complementar con `/estrategia-gtm` para el plan completo.
