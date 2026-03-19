---
name: ideas-posicionamiento
description: >
  Usar cuando se necesite definir o refinar el posicionamiento de Emiralia
  frente a competidores. Genera territorios de posicionamiento diferencial
  con análisis de fit por audiencia, mensajes y canales.
agent: Marketing Agent
disable-model-invocation: true
argument-hint: "[competidor para diferenciarse o 'general']"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - FOCUS: Competidor específico o 'general' para posicionamiento amplio
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Ideas de Posicionamiento

## ¿Qué hace este skill?

Genera **territorios de posicionamiento diferencial** para Emiralia frente a la competencia. Cada territorio incluye el mensaje central, fit con la audiencia, implicaciones de canal y riesgos.

## Cuándo usarlo

- Al definir la identidad de marca de Emiralia.
- Antes de crear campañas de marketing.
- Cuando se quiere diferenciar de un competidor específico.
- Como parte del workflow GTM.

---

## Territorios de posicionamiento base

| Territorio | Mensaje core | Tono |
|-----------|-------------|------|
| **El experto accesible** | "Tu asesor inmobiliario EAU en español" | Profesional, cercano |
| **El buscador inteligente** | "El Google de propiedades en Dubai para españoles" | Tech, innovador |
| **El guía de confianza** | "Invierte en Dubai con la guía que sí entiendes" | Educativo, seguro |
| **El dato que decide** | "Datos reales para inversiones inteligentes en EAU" | Analítico, premium |

---

## Proceso paso a paso

Actúa como un **Brand Strategist** especializado en posicionamiento de marketplaces. Para `$ARGUMENTS`:

### Paso 1: Analizar el posicionamiento actual de competidores
### Paso 2: Generar 4-5 territorios de posicionamiento
### Paso 3: Evaluar cada territorio con criterios
### Paso 4: Recomendar el territorio óptimo

---

## Plantilla de output

```markdown
# Ideas de Posicionamiento — Emiralia
**Fecha**: [fecha]

## Territorio [N]: [Nombre]

### Mensaje Central
> [Statement de posicionamiento en 1 frase]

### Fit con Audiencia
| Segmento | Fit | Por qué |
|----------|-----|---------|
| Inversores España | [Alto/Medio/Bajo] | [razón] |
| Inversores LatAm | [Alto/Medio/Bajo] | [razón] |
| Expats EAU | [Alto/Medio/Bajo] | [razón] |

### Implicaciones de Mensajería
- Homepage headline: "[propuesta]"
- Meta description SEO: "[propuesta]"
- Tagline redes sociales: "[propuesta]"
- Elevator pitch: "[propuesta]"

### Canales Óptimos
| Canal | Efectividad con este posicionamiento |
|-------|-------------------------------------|
| [canal] | [Alta/Media/Baja] y por qué |

### Riesgos
- [Riesgo del territorio y cómo mitigarlo]

---

## Matriz Comparativa

| Criterio | Territorio 1 | Territorio 2 | Territorio 3 | Territorio 4 |
|----------|-------------|-------------|-------------|-------------|
| Diferenciación | [1-5] | [1-5] | [1-5] | [1-5] |
| Credibilidad | [1-5] | [1-5] | [1-5] | [1-5] |
| Memorabilidad | [1-5] | [1-5] | [1-5] | [1-5] |
| Escalabilidad | [1-5] | [1-5] | [1-5] | [1-5] |
| **Total** | **[X]** | **[X]** | **[X]** | **[X]** |

## Recomendación
[Territorio seleccionado y justificación]
```

---

## Persistencia

```bash
node tools/db/save_research.js --title "Posicionamiento — [fecha]" --summary "Territorios de posicionamiento"
node tools/db/memory.js set marketing-agent current_positioning '"[territorio seleccionado]"' shared
```

---

## Notas

- El posicionamiento debe ser **creíble** con las capacidades actuales de Emiralia.
- Evitar posicionamientos genéricos tipo "la mejor plataforma". Ser específico.
- Complementar con `/analisis-competidores` para entender huecos en el mercado.
