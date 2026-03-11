# Workflow: Data Intelligence (Inteligencia de Datos de Propiedades)

Este workflow estructura el análisis periódico de los datos de propiedades de Emiralia para extraer insights accionables sobre el mercado inmobiliario de EAU.

## Objetivos
- Analizar la distribución y calidad de los datos de propiedades.
- Identificar tendencias por comunidad, precio y tipo de propiedad.
- Detectar anomalías o problemas de calidad de datos.
- Producir un informe de inteligencia de datos para el PM Agent y Marketing Agent.

## Actores
- **Data Agent**: Ejecuta las consultas y produce el análisis.
- **PM Agent**: Consume insights para decisiones de producto.
- **Marketing Agent**: Consume insights para campañas y contenido.

## Inputs requeridos
- Período de análisis (default: últimos 30 días).
- Foco específico (opcional): comunidad, tipo propiedad, rango precio.

## Proceso Paso a Paso

### Paso 1: Health Check de Datos
**Skill**: `/consultas-sql`

Ejecutar queries de diagnóstico:

```sql
-- Total propiedades y cobertura
SELECT city, COUNT(*) as total,
       COUNT(CASE WHEN price_aed IS NOT NULL THEN 1 END) as con_precio,
       COUNT(CASE WHEN description IS NOT NULL THEN 1 END) as con_descripcion,
       COUNT(CASE WHEN images IS NOT NULL THEN 1 END) as con_imagenes
FROM properties GROUP BY city;

-- Propiedades añadidas en el período
SELECT DATE(scraped_at) as fecha, COUNT(*) as nuevas
FROM properties
WHERE scraped_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(scraped_at) ORDER BY fecha;

-- Calidad de datos: campos nulos críticos
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN price_aed IS NULL THEN 1 END) as sin_precio,
  COUNT(CASE WHEN community IS NULL THEN 1 END) as sin_comunidad,
  COUNT(CASE WHEN size_sqft IS NULL THEN 1 END) as sin_superficie
FROM properties;
```

### Paso 2: Análisis por Cohortes
**Skill**: `/analisis-cohortes`

- Cohorte por comunidad: precio medio, propiedades disponibles, tendencia.
- Cohorte por rango de precio: distribución y volumen.
- Cohorte por tipo de propiedad: apartments vs villas vs townhouses.
- Cohorte temporal: evolución del inventario por semana de scraping.

### Paso 3: Detección de Tendencias
Analizar los datos para identificar:
- Comunidades con más crecimiento en listings.
- Rangos de precio con mayor movimiento.
- Developers más activos (off-plan).
- Anomalías: precios irreales, duplicados, datos incompletos.

### Paso 4: Generar Informe
Compilar en formato estructurado:

```
## Informe de Inteligencia de Datos — [Fecha]

### Resumen Ejecutivo
- Total propiedades: [N]
- Nuevas en el período: [N]
- Calidad media de datos: [%]

### Top 10 Comunidades por Volumen
| Comunidad | Propiedades | Precio medio AED | Tendencia |
|-----------|-------------|------------------|-----------|

### Distribución por Precio
| Rango (AED) | Cantidad | % del Total |
|-------------|----------|-------------|

### Developers Más Activos (Off-Plan)
| Developer | Listings | Comunidades | Precio medio |
|-----------|----------|-------------|--------------|

### Alertas de Calidad
| Problema | Propiedades afectadas | Severidad |
|----------|-----------------------|-----------|

### Insights Accionables
1. [Insight para PM Agent]
2. [Insight para Marketing Agent]
3. [Insight para Content Agent]
```

### Paso 5: Persistencia
- Guardar informe en `pm_reports` vía `tools/db/save_research.js`.
- Actualizar memoria:

```bash
node tools/db/memory.js set data-agent last_intelligence_report '"<fecha>"' shared
node tools/db/memory.js set data-agent total_properties '"<N>"' shared
node tools/db/memory.js set data-agent data_quality_score '"<porcentaje>"' shared
```

## Output
| Tipo | Destino | Modo |
|------|---------|------|
| document | PostgreSQL > `pm_reports` | create_new |

## Edge Cases
| Situación | Acción |
|-----------|--------|
| Base de datos vacía | Ejecutar primero `/propertyfinder-scraper` y documentar que no hay datos |
| Calidad < 60% | Escalar al Data Agent para re-scraping con foco en campos faltantes |
| Anomalías de precio detectadas | Marcar propiedades para revisión manual antes de publicar en plataforma |

## Frecuencia
- **Semanal**: Informe básico de health check + tendencias.
- **Mensual**: Informe completo con análisis de cohortes y recomendaciones.
