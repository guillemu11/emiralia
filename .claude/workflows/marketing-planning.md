# Workflow: Marketing Planning (Planificación de Marketing Mensual)

Este workflow estructura la planificación mensual de marketing para Emiralia, desde la definición de métricas norte hasta la generación de ideas de campaña.

## Objetivos
- Definir o revisar la North Star Metric y métricas de input.
- Mapear el journey del cliente para identificar oportunidades de marketing.
- Generar ideas de campaña alineadas con la estrategia.
- Producir un plan de marketing mensual documentado.

## Actores
- **Marketing Agent**: Lidera la planificación de marketing.
- **PM Agent**: Proporciona contexto estratégico y valida alineación con producto.
- **Content Agent**: Recibe briefs para producción de contenido.
- **Usuario**: Valida el plan y aprueba presupuesto.

## Inputs requeridos
- Mes de planificación.
- Presupuesto disponible (opcional, default: orgánico).
- Resultados del mes anterior (si existen).
- Cambios estratégicos relevantes.

## Proceso Paso a Paso

### Paso 1: Revisar Métricas Norte
**Skill**: `/metricas-norte`

```bash
# Verificar si ya existe una NSM definida
node tools/db/memory.js get marketing-agent north_star_metric
```

- Si no existe: ejecutar el skill completo para definir NSM + input metrics.
- Si existe: revisar si sigue siendo válida dados los cambios recientes.

### Paso 2: Mapear Journey del Cliente
**Skill**: `/mapa-viaje-cliente`
- Identificar las etapas del journey con más oportunidades de marketing.
- Mapear qué contenido y canales son más efectivos en cada etapa.

**Checkpoint 1**: Presentar las 3 etapas con mayor oportunidad al usuario.

### Paso 3: Generar Ideas de Campaña
**Skill**: `/ideas-marketing`
- Generar 5+ ideas alineadas con las oportunidades identificadas.
- Priorizar por coste/impacto.

### Paso 4: Definir Posicionamiento (si es necesario)
**Skill**: `/ideas-posicionamiento`
- Solo si el posicionamiento no está definido o necesita refresh.

```bash
node tools/db/memory.js get marketing-agent current_positioning
```

### Paso 5: Compilar Plan Mensual
Consolidar los outputs en un plan de marketing mensual:

```
## Plan de Marketing — [Mes Año]

### North Star Metric
[NSM] = [valor actual] → [objetivo mes]

### Input Metrics
| Métrica | Actual | Objetivo | Canal |
|---------|--------|----------|-------|

### Campañas del Mes
| # | Campaña | Canal | Presupuesto | Métrica éxito | Responsable |
|---|---------|-------|-------------|---------------|-------------|

### Calendario de Contenido
| Semana | Pieza | Canal | Objetivo |
|--------|-------|-------|----------|

### Budget Total
| Canal | Presupuesto | % del Total |
|-------|-------------|-------------|
```

### Paso 6: Persistencia
- Guardar plan en `pm_reports` vía `tools/db/save_research.js`.
- Actualizar memoria:

```bash
node tools/db/memory.js set marketing-agent last_marketing_plan '"<mes año>"' shared
node tools/db/memory.js set marketing-agent active_channels '"[<canales>]"' shared
node tools/db/memory.js set marketing-agent last_task_completed '"Marketing plan <mes>"' shared
node tools/db/memory.js set marketing-agent last_task_at '"<timestamp>"' shared
```

## Output
| Tipo | Destino | Modo |
|------|---------|------|
| document | PostgreSQL > `pm_reports` | create_new |

## Edge Cases
| Situación | Acción |
|-----------|--------|
| Sin datos del mes anterior | Documentar como baseline; establecer métricas desde cero |
| Presupuesto rechazado | Regenerar plan solo con canales orgánicos |
| Competidor lanza campaña agresiva | Ejecutar `/battlecard-competitivo` como paso adicional antes del plan |

## Frecuencia
- **Mensual**: Primera semana de cada mes.
- **Ad-hoc**: Ante cambios significativos de mercado o competencia.
