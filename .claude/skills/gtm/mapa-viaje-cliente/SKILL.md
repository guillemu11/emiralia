---
name: mapa-viaje-cliente
description: >
  Usar cuando se necesite mapear el journey completo del comprador hispanohablante
  de propiedades en EAU. Cubre las 8 etapas desde el descubrimiento hasta el cierre,
  con touchpoints, emociones, pain points y oportunidades para Emiralia.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[etapa: todas|descubrimiento|educacion|contacto|cierre]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - STAGE: Etapa específica o 'todas' para el journey completo
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Mapa de Viaje del Cliente

## ¿Qué hace este skill?

Genera un **Customer Journey Map** completo para el comprador hispanohablante de propiedades en EAU. Mapea las 8 etapas del proceso de compra con touchpoints, emociones, pain points y oportunidades específicas para Emiralia.

## Cuándo usarlo

- Para entender dónde interviene Emiralia en el proceso de compra.
- Al diseñar nuevas funcionalidades (¿en qué etapa ayudan?).
- Para planificar contenido y marketing por etapa del journey.
- Al optimizar la conversión entre etapas.

---

## Las 8 etapas del journey inmobiliario EAU

| # | Etapa | Duración típica | Estado emocional |
|---|-------|-----------------|-----------------|
| 1 | Descubrimiento | Pasivo | Curiosidad |
| 2 | Investigación inicial | 1-4 semanas | Entusiasmo + incertidumbre |
| 3 | Comparación | 2-8 semanas | Análisis, confusión |
| 4 | Educación legal/fiscal | 1-4 semanas | Miedo, cautela |
| 5 | Contacto con agente | 1-2 semanas | Vulnerabilidad |
| 6 | Visita (presencial/virtual) | 1-4 semanas | Emoción, presión |
| 7 | Due diligence | 2-4 semanas | Ansiedad |
| 8 | Cierre y registro | 1-2 semanas | Alivio, orgullo |

---

## Proceso paso a paso

Actúa como un **UX Researcher** especializado en buyer journeys inmobiliarios. Para `$ARGUMENTS`:

### Paso 1: Seleccionar etapa(s) a mapear
### Paso 2: Para cada etapa, documentar los 5 elementos clave
### Paso 3: Identificar oportunidades de intervención de Emiralia
### Paso 4: Priorizar por impacto en conversión

---

## Plantilla de output

Para cada etapa:

```markdown
# Customer Journey Map — Emiralia
**Fecha**: [fecha]

## Etapa [N]: [Nombre]

### Contexto
[Qué está haciendo y pensando el usuario en esta etapa]

### Touchpoints
| Touchpoint | Canal | Frecuencia |
|-----------|-------|-----------|
| [Ej: Busca "invertir en Dubai" en Google] | Search | Alta |
| [Ej: Ve vídeo de YouTube sobre Dubai] | YouTube | Media |

### Emociones
| Emoción | Intensidad | Trigger |
|---------|-----------|---------|
| [Curiosidad] | Alta | [Ve rentabilidades atractivas] |
| [Miedo] | Media | [No entiende el proceso legal] |

### Pain Points
| Pain Point | Severidad | Causa raíz |
|-----------|-----------|------------|
| [No encuentra info en español] | Alta | [Plataformas solo en EN/AR] |
| [No sabe si los precios son reales] | Alta | [Falta de transparencia] |

### Oportunidades para Emiralia
| Oportunidad | Funcionalidad | Impacto estimado |
|-------------|--------------|-----------------|
| [Contenido SEO en español] | Blog + guías | Captura tráfico en etapa 1-2 |
| [Comparador de precios por zona] | Feature búsqueda | Reduce confusión en etapa 3 |

### Métricas de conversión
- De etapa [N] a etapa [N+1]: [% estimado]
- Bottleneck principal: [qué impide avanzar]
- Acción para mejorar conversión: [recomendación]
```

---

## Persistencia

```bash
node tools/db/save_research.js --title "Customer Journey Map — [fecha]" --summary "Journey 8 etapas comprador EAU"
node tools/db/memory.js set pm-agent journey_map_date '"[timestamp]"' shared
```

---

## Notas

- El journey de compra de propiedad en EAU es **largo** (3-12 meses). No esperar conversiones rápidas.
- La etapa de **Educación** (4) es donde Emiralia tiene mayor ventaja competitiva.
- Las etapas 6-8 requieren **humanos** (agentes inmobiliarios). Emiralia facilita pero no ejecuta.
- Complementar con `/perfil-cliente-ideal` para adaptar el journey por arquetipo.
