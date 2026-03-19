---
name: tamanio-mercado
description: >
  Usar cuando se necesite estimar el tamaño del mercado objetivo de Emiralia
  (TAM/SAM/SOM). Calcula el mercado total, accesible y capturable para el
  segmento de inversores hispanohablantes en el mercado inmobiliario de EAU.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[enfoque: completo|tam|sam|som|sensibilidad]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - FOCUS: Nivel de análisis (completo, tam, sam, som, sensibilidad)
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Tamaño de Mercado (TAM/SAM/SOM)

## ¿Qué hace este skill?

Estima el tamaño del mercado de Emiralia usando la metodología **TAM/SAM/SOM** con enfoque **top-down y bottom-up**. Utiliza datos reales del mercado inmobiliario de EAU y estimaciones del segmento hispanohablante.

## Cuándo usarlo

- Para fundraising: inversores necesitan ver el TAM/SAM/SOM.
- Al definir la estrategia de producto: ¿merece la pena este nicho?
- Para priorizar mercados: ¿España o LatAm tienen más potencial?
- Al evaluar un nuevo vertical (alquiler, comercial, etc.).

---

## Datos de referencia del mercado

**Mercado inmobiliario EAU (fuentes: DLD, REIDIN, Knight Frank):**

| Dato | Valor | Fuente |
|------|-------|--------|
| Transacciones anuales Dubai | ~120,000 (2024) | DLD |
| Valor total transacciones Dubai | ~400,000M AED (~100,000M EUR) | DLD |
| Precio medio transacción | ~3.3M AED (~825,000 EUR) | Calculado |
| % compradores internacionales | ~40% | DLD/Knight Frank |
| Comisión agente promedio | 2% del precio | Estándar mercado |

**Segmento hispanohablante en EAU:**

| Dato | Valor | Fuente |
|------|-------|--------|
| Expats españoles en EAU | ~12,000 | INE / embajada |
| Expats latinoamericanos en EAU | ~25,000-40,000 | Estimación consulados |
| Hispanohablantes globales | ~600 millones | Instituto Cervantes |
| Inversores españoles en inmobiliario internacional | ~5% del total inversores | Banco de España |
| Búsquedas "comprar propiedad Dubai" en español | ~5,000/mes | Estimación Google Trends |

---

## Proceso paso a paso

Actúa como un **analista de mercado senior** con experiencia en real estate y marketplaces. Para `$ARGUMENTS`:

### Paso 1: Definir las capas del mercado
Piensa paso a paso. Calcula cada capa con fuentes y supuestos explícitos.

### Paso 2: Calcular TAM (Top-Down)
El mercado total al que podríamos acceder si no hubiera restricciones.

### Paso 3: Calcular SAM (Bottom-Up)
El segmento realmente accesible con nuestro producto actual.

### Paso 4: Calcular SOM (Realistic)
Lo que podemos capturar en los próximos 3 años de forma realista.

### Paso 5: Análisis de sensibilidad
¿Cómo cambian los números si los supuestos varían ±20%?

---

## Plantilla de output

```markdown
# Market Sizing — Emiralia
**Fecha**: [fecha]

## Resumen Ejecutivo
| Métrica | Valor | Base |
|---------|-------|------|
| TAM | [€] | Mercado total PropTech EAU para compradores internacionales |
| SAM | [€] | Segmento hispanohablante accesible digitalmente |
| SOM (3 años) | [€] | Capturable por Emiralia |

## TAM — Total Addressable Market
**Definición**: Todo el mercado de transacciones inmobiliarias en EAU donde un portal digital podría participar (vía comisión de referencia o publicidad).

**Cálculo Top-Down:**
- Transacciones anuales EAU: ~120,000
- % compradores internacionales: 40% = 48,000 transacciones
- Precio medio: 825,000 EUR
- Valor total: 48,000 × 825,000 = **39,600M EUR**
- Revenue potencial (2% comisión referral): **792M EUR/año**

## SAM — Serviceable Addressable Market
**Definición**: El subconjunto del TAM al que Emiralia puede realmente llegar con su producto (hispanohablantes + digital).

**Cálculo Bottom-Up:**
- Hispanohablantes con interés en invertir en EAU: ~50,000-100,000 personas
  - Expats en EAU: ~40,000
  - Inversores desde España: ~20,000-40,000 interesados
  - Inversores desde LatAm: ~20,000-40,000 interesados
- Tasa de conversión a comprador activo: ~5% = 2,500-5,000
- Ticket medio: 300,000 EUR (foco en segmento accesible: JVC, Jumeirah Village, DSO)
- Valor transacciones: 2,500 × 300,000 = **750M EUR**
- Revenue potencial (referral fee 1%): **7.5M EUR/año**

## SOM — Serviceable Obtainable Market
**Definición**: Lo que Emiralia puede capturar realistamente en 3 años.

**Supuestos:**
- Año 1: 50 transacciones referidas (0.5% market share del SAM)
- Año 2: 200 transacciones (2%)
- Año 3: 500 transacciones (5%)

| Año | Transacciones | Revenue (1% referral) | Revenue (publicidad) |
|-----|---------------|----------------------|---------------------|
| 1 | 50 | 150,000 EUR | 30,000 EUR |
| 2 | 200 | 600,000 EUR | 120,000 EUR |
| 3 | 500 | 1,500,000 EUR | 300,000 EUR |

## Análisis de Sensibilidad

| Variable | Base | Optimista (+20%) | Pesimista (-20%) |
|----------|------|-------------------|-------------------|
| Hispanohablantes interesados | 50,000 | 60,000 | 40,000 |
| Tasa conversión a comprador | 5% | 6% | 4% |
| Ticket medio | 300,000 EUR | 360,000 EUR | 240,000 EUR |
| **SOM Año 3** | **1.5M EUR** | **2.6M EUR** | **0.9M EUR** |

## Supuestos Clave y Riesgos
| Supuesto | Riesgo si es incorrecto | Cómo validar |
|----------|------------------------|--------------|
| 40,000 expats hispanos en EAU | SAM se reduce significativamente | Datos consulares oficiales |
| 5% conversión a comprador | SOM se reduce proporcionalmente | Test con landing page + ads |
| 1% referral fee viable | Revenue model no funciona | Negociar con 3 agencias piloto |

## Conclusión y Recomendación
[Resumen: ¿El mercado justifica la inversión? ¿Por qué sí/no?]
```

---

## Persistencia

```bash
node tools/db/save_research.js --title "Market Sizing TAM/SAM/SOM — [fecha]" --summary "Estimación de mercado"
node tools/db/memory.js set pm-agent market_size_tam '"[valor EUR]"' shared
node tools/db/memory.js set pm-agent market_size_sam '"[valor EUR]"' shared
node tools/db/memory.js set pm-agent market_size_som_y3 '"[valor EUR]"' shared
node tools/db/memory.js set pm-agent market_sizing_date '"[timestamp]"' shared
```

---

## Notas

- Los números deben presentarse con **supuestos explícitos**. Todo dato estimado se marca como tal.
- Usar datos de fuentes reales cuando estén disponibles (DLD, Knight Frank, JLL, REIDIN).
- El análisis de sensibilidad es **obligatorio**: un market sizing sin sensibilidad no es útil.
- Actualizar anualmente o ante cambios significativos del mercado EAU.
- Complementar con `/analisis-competidores` para entender el market share disponible.
