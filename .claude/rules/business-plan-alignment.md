# Rule: Business Plan Alignment

Aplica a: todos los agentes y conversaciones.
Prioridad: ALTA — este documento define el norte estrategico del proyecto.

---

## Cuando se activa

Esta regla se activa automaticamente cuando:

- Se propone una nueva feature, idea de producto o cambio de arquitectura
- Se planifica un sprint, se prioriza trabajo o se ejecuta `/pm-challenge`
- Se discuten mercados, datos a scrappear, fuentes de datos o agentes a construir
- Se evaluan partnerships, integraciones o decisiones de infraestructura
- Se disena schema de datos, se anaden tablas o se modifica el modelo de datos
- Se ejecutan skills de estrategia (`/estrategia-gtm`, `/segmento-entrada`, `/priorizar-features`)

---

## Accion requerida

Antes de responder sobre cualquiera de los temas anteriores:

1. Consultar `.claude/BUSINESS_PLAN.md`, seccion **"Estado Actual vs Vision"**
2. Evaluar: esta decision acerca a Emiralia a la Vision, o la aleja?
3. Evaluar: sirve al **cliente pagador (developers)**, al usuario final, o a ambos?
4. Si hay conflicto con el plan: senalarlo explicitamente antes de proceder

---

## Patrones de desalineacion a detectar

| Patron | Descripcion | Respuesta esperada |
|--------|-------------|-------------------|
| **Scope creep de mercado** | Proponer expansion a otro pais antes de validar B2B en UAE | Primero validar revenue con developers en UAE (Phase 1) |
| **B2C drift** | Features para inversores sin considerar impacto en propuesta de valor para developers | Todo feature debe analizarse desde ambas perspectivas |
| **Complejidad prematura** | Arquitecturas multi-region, multi-idioma antes de tener un developer pagando | Make it work in UAE first |
| **Datos sin estrategia** | Scrappear mas propiedades sin plan para convertirlas en listings de developer verificado | Data Agent no amplia cobertura sin developer que valide |

---

## Formato de flag

Cuando detectes una decision que no alinea con el Business Plan:

```
[ALIGNMENT CHECK] Esta propuesta [descripcion] podria no alinear con [seccion especifica de BUSINESS_PLAN.md].
El plan indica: [lo que dice el plan].
Pregunta: confirmamos que queremos hacer una excepcion consciente?
```

---

## Excepciones

Si el usuario decide cambiar una parte del Business Plan:
1. Actualizar `BUSINESS_PLAN.md` en la misma sesion
2. Registrar la decision como cambio estrategico
