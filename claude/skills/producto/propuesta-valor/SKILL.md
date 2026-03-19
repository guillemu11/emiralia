---
name: propuesta-valor
description: >
  Usar cuando se necesite definir, articular o refinar la propuesta de valor
  de Emiralia o de un feature específico. Utiliza el framework JTBD (Jobs To Be Done)
  de 6 partes adaptado al contexto de inversores hispanohablantes en EAU.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[producto, feature o segmento a evaluar]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - SUBJECT: Producto completo o feature específico a evaluar
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Propuesta de Valor (JTBD)

## ¿Qué hace este skill?

Define la propuesta de valor usando el framework **Jobs To Be Done** de 6 partes. Mapea la transformación completa del usuario: quién es, qué busca, su situación actual (con frustraciones), cómo Emiralia resuelve su problema, el resultado deseado, y las alternativas que compite contra.

## Cuándo usarlo

- Al definir la propuesta de valor general de Emiralia.
- Al lanzar un nuevo feature que necesita una justificación clara de valor.
- Antes de crear contenido de marketing (para alinear mensajes).
- Cuando el posicionamiento no está claro o hay debate interno.

---

## Proceso paso a paso

Actúa como un **experto en estrategia de producto y JTBD** especializado en PropTech. Para `$ARGUMENTS`:

### Paso 1: Definir el cliente
Identifica con precisión quién es el usuario objetivo. No solo demografía, sino contexto situacional.

### Paso 2: Mapear la situación actual (Before)
Documenta las frustraciones, limitaciones y workarounds que el usuario sufre hoy.

### Paso 3: Identificar los triggers
¿Qué eventos empujan al usuario a buscar una solución? (Crisis económica, bonus anual, herencia, mudanza, etc.)

### Paso 4: Diseñar la transformación (How)
¿Cómo exactamente Emiralia resuelve el problema? Funcionalidades concretas.

### Paso 5: Describir el resultado deseado (After)
El estado emocional y práctico del usuario después de usar Emiralia.

### Paso 6: Listar alternativas competitivas
¿Qué hace el usuario si no usa Emiralia? Evaluar cada alternativa.

---

## Plantilla de output

```markdown
# Propuesta de Valor — [Sujeto]
**Fecha**: [fecha]

## 1. ¿Quién es nuestro cliente?
| Atributo | Descripción |
|----------|-------------|
| Perfil | [Inversor hispanohablante interesado en EAU] |
| Edad | [Rango] |
| Ubicación | [España, LatAm, o ya en EAU] |
| Situación financiera | [Capacidad de inversión] |
| Experiencia previa | [Primera inversión internacional / experimentado] |
| Motivación principal | [Rentabilidad / protección capital / Golden Visa / lifestyle] |

## 2. Situación Actual (Before) — Frustraciones
| Frustración | Impacto | Severidad |
|-------------|---------|-----------|
| Plataformas solo en inglés/árabe | No puede filtrar ni comparar eficientemente | Alta |
| Proceso legal EAU desconocido | Miedo a estafas o errores costosos | Crítica |
| Intermediarios no hablan español | Comunicación ineficiente, malentendidos | Alta |
| No entiende off-plan vs ready | Decisiones desinformadas | Media |
| Precios en AED sin contexto | No puede evaluar si es buena inversión | Media |

## 3. Triggers (¿Qué les empuja a actuar?)
- [Trigger 1: ve un artículo sobre rentabilidad en Dubai]
- [Trigger 2: conoce a alguien que compró en Dubai]
- [Trigger 3: inestabilidad económica en su país]
- [Trigger 4: recibe un bonus/herencia]
- [Trigger 5: Golden Visa como plan B de residencia]

## 4. Cómo Emiralia Resuelve el Problema
| Funcionalidad | Frustración que resuelve |
|---------------|------------------------|
| Búsqueda 100% en español | Barrera de idioma eliminada |
| Guías legales EAU para extranjeros | Miedo al proceso desconocido |
| Comparativas de rentabilidad por zona | Decisiones informadas |
| Contacto con agentes verificados | Confianza en intermediarios |
| Precios en EUR + contexto de mercado | Evaluación intuitiva |

## 5. Resultado Deseado (After)
| Aspecto | Antes | Después |
|---------|-------|---------|
| Conocimiento | "No sé por dónde empezar" | "Entiendo el mercado y mis opciones" |
| Confianza | "Me da miedo que me estafen" | "Confío en el proceso y en mi agente" |
| Acción | "Llevo meses pensándolo" | "Contacté al agente correcto y avancé" |
| Decisión | "No sé si es buena inversión" | "Tengo datos para decidir con seguridad" |

## 6. Alternativas Competitivas
| Alternativa | Pros | Contras | Cuándo gana |
|-------------|------|---------|-------------|
| PropertyFinder + Google Translate | Gratis, gran inventario | UX terrible, errores traducción, sin contexto | Usuario bilingüe que no necesita guía |
| Agente bilingüe local | Trato personalizado | Caro (3-5% comisión), difícil de encontrar | Inversión > 1M AED |
| No invertir / otro país | Sin riesgo EAU | Pierde oportunidad de rentabilidad | Aversión alta al riesgo |
| Portal español (Idealista) | En español | No cubre EAU | Quiere invertir en España, no EAU |

## Statement de Propuesta de Valor
> **Para** [cliente objetivo]
> **que** [necesidad/frustración principal],
> **Emiralia es** [categoría de producto]
> **que** [beneficio principal].
> **A diferencia de** [alternativa principal],
> **Emiralia** [diferenciador clave].
```

---

## Persistencia

```bash
node tools/db/save_research.js --title "Propuesta de Valor — [sujeto]" --summary "JTBD 6 partes"
node tools/db/memory.js set pm-agent value_proposition_updated_at '"[timestamp]"' shared
```

---

## Notas

- El statement final es el mensaje más importante: debe caber en un tweet.
- Las frustraciones deben ser **reales y verificables**, no suposiciones.
- Complementar con `/perfil-cliente-ideal` para los arquetipos y `/analisis-competidores` para las alternativas.
- Si se aplica a un feature (no al producto completo), ajustar el scope del "cliente" al usuario del feature.
