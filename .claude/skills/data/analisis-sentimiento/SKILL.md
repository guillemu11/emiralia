---
name: analisis-sentimiento
description: >
  Usar cuando se necesite analizar el sentimiento y extraer insights de
  feedback de usuarios, reviews de competidores o comentarios en comunidades
  de inversores hispanohablantes.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[fuente de feedback o texto a analizar]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - FEEDBACK_SOURCE: Fuente de feedback o texto directo a analizar
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Análisis de Sentimiento

## ¿Qué hace este skill?

Analiza **feedback de usuarios** y extrae sentimiento, temas recurrentes, Jobs To Be Done implícitos y mejoras accionables. Adaptado al contexto de inversores hispanohablantes evaluando propiedades en EAU.

## Cuándo usarlo

- Para analizar comentarios de usuarios de la plataforma.
- Para estudiar reviews de competidores (Trustpilot, App Store).
- Para procesar feedback de comunidades de Telegram/WhatsApp.
- Para extraer insights de conversaciones con leads.

---

## Fuentes de feedback para Emiralia

| Fuente | Acceso | Volumen | Valor |
|--------|--------|---------|-------|
| Comentarios plataforma | Directo (futuro) | Bajo (early stage) | Alto |
| Reviews PropertyFinder (App Store) | Público | Alto | Medio |
| Reviews Bayut (App Store) | Público | Alto | Medio |
| Trustpilot agencias Dubai | Público | Medio | Alto |
| Grupos Telegram inversores | Requiere acceso | Medio | Alto |
| Feedback directo de leads | CRM (futuro) | Bajo | Muy alto |

---

## Proceso paso a paso

### Paso 1: Recopilar feedback
Aceptar texto directamente o indicar la fuente para analizar.

### Paso 2: Clasificar sentimiento por tema
Para cada fragmento de feedback, asignar:
- **Sentimiento**: Positivo / Neutral / Negativo
- **Tema**: UX, Precio, Confianza, Contenido, Legal, Atención

### Paso 3: Extraer Jobs To Be Done implícitos
¿Qué está intentando hacer el usuario? ¿Qué frustración expresa?

### Paso 4: Priorizar mejoras accionables

---

## Plantilla de output

```markdown
# Análisis de Sentimiento — [Fuente]
**Fecha**: [fecha]
**Fragmentos analizados**: [N]

## Resumen de Sentimiento

| Sentimiento | Cantidad | Porcentaje |
|-------------|----------|-----------|
| Positivo | [N] | [%] |
| Neutral | [N] | [%] |
| Negativo | [N] | [%] |

## Sentimiento por Tema

| Tema | Positivo | Neutral | Negativo | Score |
|------|----------|---------|----------|-------|
| UX / Usabilidad | [N] | [N] | [N] | [1-5] |
| Precio / Valor | [N] | [N] | [N] | [1-5] |
| Confianza / Seguridad | [N] | [N] | [N] | [1-5] |
| Contenido en español | [N] | [N] | [N] | [1-5] |
| Proceso legal | [N] | [N] | [N] | [1-5] |
| Atención al cliente | [N] | [N] | [N] | [1-5] |

## Top Feedback (citas textuales)

### Positivo destacado
> "[cita textual]" — Tema: [tema]

### Negativo destacado
> "[cita textual]" — Tema: [tema]

## Jobs To Be Done Implícitos

| JTBD | Frecuencia | Satisfecho | Oportunidad |
|------|-----------|-----------|-------------|
| [job] | [veces mencionado] | [Sí/No/Parcial] | [Alta/Media/Baja] |

## Satisfaction Gaps

| Necesidad | Importancia | Satisfacción actual | Gap | Acción |
|-----------|------------|--------------------|----|--------|
| [necesidad] | [Alta/Media] | [Alta/Media/Baja] | [grande/pequeño] | [acción] |

## Mejoras Accionables (priorizadas)

| # | Mejora | Tema | Impacto | Esfuerzo | Agente |
|---|--------|------|---------|----------|--------|
| 1 | [mejora] | [tema] | [Alto/Medio] | [S/M/L] | [agente] |
```

---

## Persistencia

```bash
node tools/db/save_research.js --title "Sentiment Analysis — [fuente] [fecha]" --summary "Análisis de sentimiento"
node tools/db/memory.js set pm-agent last_sentiment_analysis '"[fecha]"' shared
```

---

## Notas

- El análisis de reviews de **competidores** es especialmente valioso: revela qué quieren los usuarios que los competidores no les dan.
- En early-stage, cada fragmento de feedback es oro. No descartar nada.
- Los satisfaction gaps (importancia alta + satisfacción baja) son las mayores oportunidades de producto.
- Complementar con `/perfil-cliente-ideal` para conectar feedback con ICPs.
