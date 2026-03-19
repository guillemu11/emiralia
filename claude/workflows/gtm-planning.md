# Workflow: GTM Planning (Planificación Go-to-Market)

Este workflow encadena los skills estratégicos para producir un plan completo de Go-to-Market para Emiralia, desde la selección del mercado de entrada hasta la estrategia de canales y presupuesto.

## Objetivos
- Seleccionar el mercado de entrada óptimo (beachhead) para Emiralia.
- Analizar la competencia en el segmento hispanohablante.
- Definir el posicionamiento diferencial.
- Producir un plan GTM ejecutable con roadmap, canales y presupuesto.

## Actores
- **PM Agent**: Lidera la estrategia y toma las decisiones de mercado.
- **Marketing Agent**: Aporta perspectiva de canales y posicionamiento.
- **Usuario**: Valida decisiones clave en cada checkpoint.

## Inputs requeridos
- Mercado(s) objetivo a evaluar (España, LatAm, Expats, o todos).
- Presupuesto disponible para los primeros 6 meses (opcional).
- Restricciones conocidas (regulatorias, de tiempo, de equipo).

## Proceso Paso a Paso

### Paso 1: Selección del Beachhead
**Skill**: `/segmento-entrada`
- Evaluar cada mercado candidato con la matriz de criterios.
- Producir un ranking con recomendación fundamentada.

**Checkpoint 1**: Presentar el beachhead recomendado al usuario. Esperar confirmación antes de continuar.

### Paso 2: Análisis Competitivo en el Segmento
**Skill**: `/analisis-competidores`
- Analizar competidores relevantes para el beachhead seleccionado.
- Identificar gaps explotables en el segmento hispanohablante.

### Paso 3: Definición de Posicionamiento
**Skill**: `/ideas-posicionamiento`
- Generar territorios de posicionamiento basados en los gaps competitivos.
- Seleccionar el territorio más fuerte para el beachhead.

**Checkpoint 2**: Presentar opciones de posicionamiento al usuario. Esperar selección.

### Paso 4: Plan GTM Completo
**Skill**: `/estrategia-gtm`
- Con el beachhead, análisis competitivo y posicionamiento definidos, generar el plan GTM completo.
- Incluir: canales, mensajes, roadmap 0-180 días, presupuesto por fase.

### Paso 5: Persistencia
- Guardar el plan GTM en `pm_reports` vía `tools/db/save_research.js`.
- Actualizar memoria compartida:

```bash
node tools/db/memory.js set pm-agent gtm_plan_date '"<fecha>"' shared
node tools/db/memory.js set pm-agent beachhead_market '"<mercado seleccionado>"' shared
node tools/db/memory.js set marketing-agent beachhead_market '"<mercado seleccionado>"' shared
node tools/db/memory.js set marketing-agent current_positioning '"<territorio seleccionado>"' shared
```

## Output
| Tipo | Destino | Modo |
|------|---------|------|
| document | PostgreSQL > `pm_reports` | create_new |

## Edge Cases
| Situación | Acción |
|-----------|--------|
| Usuario no decide beachhead | Usar datos disponibles para recomendar; si persiste ambigüedad, proponer test A/B con contenido en 2 mercados |
| No hay presupuesto definido | Asumir estrategia orgánica 100% (SEO + content) y documentarlo |
| Competidor lanza versión español | Escalar urgencia; re-ejecutar análisis competitivo antes de continuar |

## Frecuencia
- **Inicial**: Una vez al definir la estrategia de Emiralia.
- **Revisión**: Trimestral o ante cambio significativo de mercado.
