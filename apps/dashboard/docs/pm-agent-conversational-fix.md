# PM Agent — Correcccion del Comportamiento Conversacional

**Fecha**: 2026-03-06
**Estado**: Implementado
**Archivos modificados**:
- `tools/pm-agent/core.js` (PM_SYSTEM_PROMPT)
- `.claude/agents/product/pm-agent.md`

---

## Problema

El PM Agent entraba en loops infinitos de preguntas clarificatorias, perdia contexto mid-conversacion, y nunca entregaba valor. Ejemplo real: un usuario pregunto "cuantos agentes necesitamos para el MVP?" y tras 10+ turnos el agente seguia preguntando "a que te refieres?" sin responder jamas.

Esto ocurria tanto en el **Dashboard inbox** como en **Telegram** porque ambos canales comparten el mismo system prompt en `tools/pm-agent/core.js`.

### Sintomas identificados

1. **Loop infinito de preguntas clarificatorias** — El agente nunca respondia la pregunta original
2. **Perdida de contexto** — El usuario decia "ambos" y el agente preguntaba "a que te refieres con ambos?" cuando el mismo habia ofrecido las dos opciones
3. **Estilo "consultor que cobra por hora"** — Frameworks innecesarios, "Pregunta 1 de 5", jerga sin valor
4. **Zero value delivery** — Despues de 10 turnos, el usuario no tenia nada: ni un numero, ni un plan, ni una opinion

---

## Causa Raiz

El `PM_SYSTEM_PROMPT` imponia un protocolo rigido de 3 fases:

1. **Escucha Activa** — Resume la idea (obligatorio)
2. **Cuestionamiento Estrategico** — Haz UNA pregunta por mensaje, max 5 rondas (obligatorio)
3. **Propuesta de Arquitectura** — Solo despues de las rondas de preguntas

Este protocolo **obligaba** al agente a interrogar antes de aportar valor. Combinado con la personalidad "Desafiante por diseno", el resultado era un agente que cuestionaba todo, incluso respuestas perfectamente claras.

---

## Solucion Implementada

### Filosofia: "Valor primero, refinamiento despues"

Se reescribio el `PM_SYSTEM_PROMPT` con estas reglas centrales:

| Regla | Antes | Despues |
|-------|-------|---------|
| Orden de respuesta | Preguntar -> responder | Responder -> preguntar (si es necesario) |
| Preguntas | Obligatorias, 1 por turno, max 5 | Solo si hay ambiguedad genuina, max 1-2 por mensaje |
| Valor por mensaje | Solo preguntas permitidas | Cada mensaje DEBE aportar valor (insights, datos, propuesta) |
| Contexto | No gestionado | Obligatorio resolver referencias del historial |
| Propuesta | Solo tras rondas de preguntas | Desde el primer mensaje si la idea es clara |

### Cambios en el System Prompt (`tools/pm-agent/core.js`)

**Eliminado:**
- Personalidad "Crack" con tono adversarial
- Protocolo rigido de 3 fases con rondas obligatorias
- "Desafiante por diseno"

**Anadido:**
- 6 reglas de conversacion obligatorias (responder primero, mantener contexto, preguntar solo ante ambiguedad, etc.)
- Personalidad "Challenger constructivo" — misma capacidad estrategica, entregada como insights
- Flujo flexible sin rondas minimas
- Lista explicita de anti-patterns (lo que NUNCA hacer)

### Cambios en la Definicion del Agente (`.claude/agents/product/pm-agent.md`)

- Personalidad: "Desafiante y Riguroso" -> "Challenger constructivo"
- Protocolo: 4 fases rigidas -> flujo flexible con principio de "valor primero"

---

## Impacto

- **Dashboard inbox**: Corregido (usa `chatWithPMAgent()` de core.js)
- **Telegram bot**: Corregido (usa `chatWithPMAgent()` de core.js)
- **Generacion de borradores**: Sin cambios (usa `SUMMARY_SYSTEM_PROMPT` separado)
- **Generacion de proyectos**: Sin cambios (usa override explicito en `generateProject()`)
- **DB schema**: Sin cambios
- **Frontend**: Sin cambios

---

## Verificacion

Enviar estos mensajes de prueba por ambos canales:

| Test | Input | Resultado esperado |
|------|-------|--------------------|
| Pregunta directa | "Cuantos agentes hacen falta para el MVP?" | Respuesta directa con lista y razonamiento |
| Idea simple | "Quiero anadir un blog" | Evaluacion inmediata + propuesta |
| Referencia contextual | Responder "ambos" a pregunta con 2 opciones | NO debe preguntar "a que te refieres?" |
| Input vago | "Mejorar el SEO" | Propuesta parcial con suposiciones razonables |
| Idea clara y completa | Mensaje largo con idea bien definida | Propuesta completa en el primer mensaje |
