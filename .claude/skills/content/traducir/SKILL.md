---
name: traducir
description: >
  Traduce contenido inmobiliario de EAU entre ingles y espanol con variantes
  regionales: Espana (es-ES), Mexico (es-MX) y Colombia (es-CO). Usa
  terminologia inmobiliaria precisa y adaptada por region. Tambien soporta
  traduccion inversa espanol → ingles. Invocar cuando pidan traducir, translate,
  version en espanol de, adaptar al espanol, o /traducir.
agent: Translation Agent
allowed-tools:
  - Read
  - Edit
  - Bash
  - Grep
tools:
  - tools/translate/translate.js
  - tools/translate/glossary.js
  - tools/db/memory.js
  - tools/db/wat-memory.js
inputs:
  - TEXT: Texto en ingles (o espanol) a traducir
  - TO: Variante destino (es-ES | es-MX | es-CO | en). Default es-ES
  - FROM: Idioma origen (en | es). Default en
  - MODE: property (precision inmobiliaria) | general. Default property
outputs:
  type: document
  destination:
    category: local
    target: consola / archivo
  write_mode: create_new
---

# Skill: Traducir

## Que hace este skill?

Traduce contenido inmobiliario con precision y adaptacion cultural para el mercado hispanohablante. Usa Claude (Sonnet 4.6) con un prompt especializado que incluye un glosario de terminos inmobiliarios de EAU adaptados por variante regional.

**Variantes soportadas:**

| Codigo | Mercado | Ejemplos de adaptacion |
|--------|---------|------------------------|
| `es-ES` | Espana | piso, promotora, aparcamiento, entrada, vosotros |
| `es-MX` | Mexico | departamento, desarrolladora, estacionamiento, enganche, ustedes |
| `es-CO` | Colombia | apartamento, constructora, parqueadero, cuota inicial, ustedes |
| `en` | English | Traduccion inversa a ingles |

## Cuando usar este skill

- Fichas de propiedad de PropertyFinder (ingles → espanol con variante)
- Descripciones de amenidades, zonas o developers para el CMS
- Copies de campana de marketing adaptados por mercado
- Comunicaciones con brokers o developers (espanol → ingles)
- Lotes de terminos para tablas de amenidades o tipos de propiedad

## Ejecucion

### Traduccion individual

```bash
node tools/translate/translate.js --text="$TEXT" --from=$FROM --to=$TO --mode=$MODE
```

Para textos largos (property descriptions completas), usar stdin:

```bash
echo "$TEXT" | node tools/translate/translate.js --from=$FROM --to=$TO --mode=property
```

### Traduccion por lotes

Preparar un archivo JSON con el formato:
```json
[
  {"id": "prop-123", "text": "3-bedroom apartment in Dubai Marina"},
  {"id": "prop-456", "text": "Off-plan villa with private pool"}
]
```

O un archivo CSV:
```csv
id,text
prop-123,"3-bedroom apartment in Dubai Marina"
prop-456,"Off-plan villa with private pool"
```

Ejecutar:
```bash
node tools/translate/translate.js --batch=input.json --from=en --to=es-MX --output=output.json
```

El output incluye: `id`, `original`, `translated`, `variant`, y `error` si hubo fallo.

### Proceso paso a paso

1. **Determinar variante objetivo.** Si el usuario no ha especificado (es-ES, es-MX, es-CO), preguntar: "Para que mercado es esta traduccion: Espana, Mexico o Colombia?"
2. **Verificar el texto.** Confirmar que no esta vacio. Si contiene numeros, alertar que seran copiados exactamente.
3. **Ejecutar la traduccion.** Usar el comando correspondiente (individual o batch).
4. **Presentar resultado.** Mostrar la traduccion con los terminos clave del glosario aplicados.
5. **Persistir memoria.**

```bash
node tools/db/memory.js set translation-agent last_translation_at "\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" shared
node tools/db/memory.js set translation-agent last_target_variant "\"$TO\"" shared
node tools/db/memory.js set translation-agent last_task_completed "\"traduccion-completada\"" shared
```

## Comportamiento ante errores

| Error | Accion |
|-------|--------|
| `ANTHROPIC_API_KEY` no definido | Detener. Pedir al usuario que anade la key al `.env` |
| Variante no soportada | Mostrar lista de variantes validas y preguntar |
| Texto vacio | Pedir el texto antes de ejecutar |
| API timeout o error de red | Reintentar una vez; si falla de nuevo, notificar |
| Texto > 3.000 palabras | Sugerir dividir en secciones (titulo, descripcion, amenidades) |
| Error en item de batch | Registrar error en output y continuar con el siguiente item |

## Ejemplos

```bash
# Ficha de propiedad para Espana
node tools/translate/translate.js --text="3-bedroom apartment in Dubai Marina. Sea view. Off-plan. Handover Q4 2026." --from=en --to=es-ES --mode=property

# Copy de marketing para Mexico
node tools/translate/translate.js --text="Invest in Dubai's fastest growing district." --from=en --to=es-MX --mode=general

# Email inverso para broker
node tools/translate/translate.js --text="Estamos interesados en el proyecto de Emaar en Downtown." --from=es --to=en --mode=general

# Batch de propiedades para Colombia
node tools/translate/translate.js --batch=properties.json --from=en --to=es-CO --output=properties-es-CO.json
```
