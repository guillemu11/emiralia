---
name: analisis-competidores
description: >
  Usar cuando se necesite analizar la competencia de Emiralia en el mercado
  PropTech de EAU. Genera una matriz competitiva detallada con fortalezas,
  debilidades y oportunidades de diferenciación en el segmento hispanohablante.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[competidor: propertyfinder|bayut|houza|agencias|todos]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - COMPETITOR: Competidor específico o 'todos' para análisis completo
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Análisis de Competidores

## ¿Qué hace este skill?

Produce un **análisis competitivo estructurado** del mercado PropTech de EAU desde la perspectiva del segmento hispanohablante. Incluye matriz comparativa, fortalezas/debilidades, gaps explotables y recomendaciones de diferenciación.

## Cuándo usarlo

- Al definir la estrategia de producto (complemento de `/estrategia-producto`).
- Antes de lanzar una campaña de marketing (para afinar mensajes).
- Cuando un competidor lanza una funcionalidad nueva relevante.
- Para preparar battlecards de ventas (input para `/battlecard-competitivo`).

---

## Competidores conocidos del ecosistema

| Competidor | Tipo | Mercado | Idiomas | Fortaleza principal |
|-----------|------|---------|---------|---------------------|
| **PropertyFinder.ae** | Portal líder | EAU | Inglés, Árabe | Mayor inventario, marca consolidada |
| **Bayut.com** | Portal líder (Dubizzle Group) | EAU | Inglés, Árabe | SEO fuerte, integración Dubizzle |
| **Houza.com** | Portal emergente | Dubai | Inglés | UX moderna, foco off-plan |
| **Kyero.com** | Portal español | España, Portugal | Español | Audiencia hispana, pero no cubre EAU |
| **Idealista International** | Portal español | Europa | Español | Marca potente en España, sin EAU |
| **Agencias bilingües** | Intermediarios | Dubai | Español, Inglés | Trato personal, pero costoso y no escalable |

---

## Proceso paso a paso

Actúa como un **analista de inteligencia competitiva** en el sector PropTech. Para `$ARGUMENTS`:

### Paso 1: Recopilar información
- Revisar las webs de los competidores especificados.
- Identificar funcionalidades, precios, idiomas, UX.
- Buscar reviews de usuarios (Trustpilot, App Store, Google Play).

### Paso 2: Construir la matriz competitiva
Evaluar cada competidor en 10 criterios clave con escala 1-5.

### Paso 3: Identificar gaps
¿Qué necesidades del segmento hispanohablante no están cubiertas por ningún competidor?

### Paso 4: Recomendar diferenciación
Estrategias concretas que Emiralia puede implementar para explotar los gaps.

---

## Plantilla de output

```markdown
# Análisis Competitivo — Emiralia
**Fecha**: [fecha]
**Competidores analizados**: [lista]

## Matriz Competitiva

| Criterio | Emiralia | PropertyFinder | Bayut | Houza | Agencias |
|----------|----------|----------------|-------|-------|----------|
| Contenido en español | 5 | 1 | 1 | 1 | 3 |
| Inventario de propiedades | 2 | 5 | 5 | 3 | 2 |
| UX / Diseño | 4 | 4 | 3 | 4 | 2 |
| Información legal para extranjeros | 4 | 2 | 2 | 2 | 4 |
| Comparativas de rentabilidad | 4 | 2 | 3 | 2 | 3 |
| SEO en español | 5 | 1 | 1 | 1 | 1 |
| Confianza / marca | 2 | 5 | 5 | 2 | 3 |
| Cobertura geográfica EAU | 3 | 5 | 5 | 3 | 2 |
| Soporte al comprador | 3 | 3 | 3 | 2 | 5 |
| Precio/comisión | 5 | 5 | 5 | 5 | 2 |

**Escala**: 1=Inexistente, 2=Básico, 3=Aceptable, 4=Bueno, 5=Excelente

## Análisis por Competidor

### [Competidor]
**Fortalezas:**
- [fortaleza 1]
- [fortaleza 2]

**Debilidades en el segmento hispanohablante:**
- [debilidad 1]
- [debilidad 2]

**Gap explotable:**
- [oportunidad concreta que Emiralia puede aprovechar]

## Mapa de Oportunidades

| Oportunidad | Urgencia | Esfuerzo | Impacto |
|-------------|----------|----------|---------|
| [oportunidad 1] | Alta | [S/M/L] | [Alto/Medio] |

## Recomendaciones de Diferenciación
1. **[Recomendación 1]**: [Detalle y justificación]
2. **[Recomendación 2]**: [Detalle y justificación]
3. **[Recomendación 3]**: [Detalle y justificación]

## Amenazas a Vigilar
| Amenaza | Probabilidad | Impacto | Señal de alerta |
|---------|-------------|---------|-----------------|
| PropertyFinder lanza versión español | Baja | Crítico | Anuncio en redes/prensa |
| Nueva startup PropTech en español | Media | Alto | Aparece en búsquedas SEO |
```

---

## Persistencia

```bash
node tools/db/save_research.js --title "Análisis Competitivo — [fecha]" --summary "Matriz competitiva y gaps"
node tools/db/memory.js set pm-agent competitor_analysis_date '"[timestamp]"' shared
node tools/db/memory.js set pm-agent competitors_analyzed '"[N]"' shared
```

---

## Notas

- Ser **honesto** con las fortalezas de los competidores. No infravalorar a PropertyFinder o Bayut.
- Los gaps deben ser **verificables**: si dices que no tienen contenido en español, verificarlo.
- Actualizar este análisis **trimestralmente** o ante cambios relevantes del mercado.
- Complementa con `/battlecard-competitivo` para uso en ventas.
