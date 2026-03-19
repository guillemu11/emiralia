---
name: battlecard-competitivo
description: >
  Usar cuando se necesite un battlecard competitivo para situaciones de ventas
  o partnerships. Genera fichas por competidor con fortalezas, debilidades,
  objeciones y respuestas preparadas.
agent: Marketing Agent
disable-model-invocation: true
argument-hint: "[competidor: propertyfinder|bayut|houza|agencias|todos]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - COMPETITOR: Competidor específico o 'todos'
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Battlecard Competitivo

## ¿Qué hace este skill?

Genera **battlecards de ventas** para cada competidor de Emiralia. Diseñados para cuando un potencial partner, agencia o inversor pregunte "¿por qué Emiralia y no PropertyFinder?".

## Cuándo usarlo

- Antes de reuniones con agencias inmobiliarias.
- Para preparar al Sales Agent con argumentos.
- Cuando un usuario pregunta "¿qué os diferencia de X?".
- Como referencia rápida del equipo comercial.

---

## Competidores cubiertos

| Competidor | Tipo | Fortaleza principal | Debilidad en hispanos |
|-----------|------|---------------------|----------------------|
| PropertyFinder | Portal líder | Mayor inventario EAU | Solo inglés/árabe |
| Bayut | Portal líder | SEO fuerte, grupo Dubizzle | Solo inglés/árabe |
| Houza | Emergente | UX moderna, foco off-plan | Solo inglés, inventario limitado |
| Agencias bilingües | Intermediarios | Trato personal | Caras, no escalables, opacas |

---

## Plantilla de output

Para cada competidor:

```markdown
# Battlecard: Emiralia vs [Competidor]
**Última actualización**: [fecha]

## [Competidor] en 1 línea
[Descripción concisa]

## Sus Fortalezas (ser honestos)
- [Fortaleza 1 — reconocer lo que hacen bien]
- [Fortaleza 2]
- [Fortaleza 3]

## Sus Debilidades (en el segmento hispanohablante)
- [Debilidad 1 — específica al segmento hispano]
- [Debilidad 2]
- [Debilidad 3]

## 3 Puntos de Diferenciación de Emiralia
1. **[Diferenciador 1]**: [Explicación concreta con beneficio]
2. **[Diferenciador 2]**: [Explicación concreta con beneficio]
3. **[Diferenciador 3]**: [Explicación concreta con beneficio]

## Objeciones y Respuestas

| Objeción del prospecto | Respuesta preparada |
|-----------------------|---------------------|
| "PropertyFinder tiene más propiedades" | "Tenemos el mismo inventario (fuente PropertyFinder), pero presentado en español con contexto legal que ellos no ofrecen." |
| "Ya uso Bayut, ¿para qué cambiar?" | "No necesitas cambiar — Emiralia complementa tu búsqueda añadiendo información en español sobre zonas, regulación y rentabilidad." |
| "¿Y si necesito un agente que hable español?" | "Te conectamos directamente con agentes verificados que hablan español en EAU." |

## Cuándo Ganamos vs Cuándo No

### Ganamos cuando:
- El prospecto no habla inglés fluido
- Necesita entender el proceso legal de EAU
- Busca comparativas de rentabilidad en su idioma
- Es su primera inversión internacional

### No competimos cuando:
- El prospecto es bilingüe perfecto y ya conoce el mercado
- Busca propiedades en un emirato que aún no cubrimos
- Necesita un agente presencial inmediato (nosotros somos digital-first)
```

---

## Persistencia

```bash
node tools/db/save_research.js --title "Battlecard — [competidor]" --summary "Battlecard competitivo de ventas"
node tools/db/memory.js set marketing-agent battlecard_last_updated '"[timestamp]"' shared
```

---

## Notas

- **Honestidad es credibilidad.** Nunca decir que PropertyFinder es malo — reconocer sus fortalezas.
- Las objeciones deben basarse en **conversaciones reales** (no inventadas).
- Actualizar **trimestralmente** o cuando un competidor lance algo nuevo.
- Complementar con `/analisis-competidores` para el análisis profundo.
