# Rule: Agent Workflow Principles

Aplica a: todos los agentes y conversaciones.
Prioridad: ALTA

---

## Cuando se activa

Siempre. Estas reglas son el comportamiento base de todo agente en Emiralia.

---

## 1. Self-Improvement Loop

**Trigger:** El usuario corrige cualquier comportamiento, output o decisión de un agente.

**Acción requerida:**
1. Aplicar la corrección inmediatamente
2. Escribir una entrada en `tasks/lessons.md` con el formato del documento
3. Si la lección cambia el comportamiento del agente de forma permanente → actualizar el `.md` del agente correspondiente

**Formato de entrada en lessons.md:**
```markdown
## [FECHA] [agente-id] — [descripción corta]
**Corrección:** qué hizo mal el agente
**Patrón a evitar:** la regla derivada
**Cómo aplicar:** cuándo y dónde aplica
```

**Al inicio de cada conversación:** Revisar `tasks/lessons.md` para lecciones relevantes al agente activo.

---

## 2. Verification Before Done

**Trigger:** Antes de declarar cualquier tarea como completada.

**Checklist obligatorio:**

| Tipo de tarea | Verificación requerida |
|---------------|----------------------|
| **Código / bug fix** | Ejecutar el script/servidor; mostrar output real |
| **DB / migración** | Correr query de verificación; mostrar resultado |
| **Contenido** | Mostrar el output final completo al usuario |
| **Config / rule** | Verificar que el archivo existe y tiene el contenido correcto |
| **Multi-paso** | Verificar cada paso antes de avanzar al siguiente |

**Pregunta de control antes de marcar done:** "¿Puedo demostrar que esto funciona?"

---

## 3. Autonomous Bug Fixing

**Trigger:** El usuario reporta un bug, error, o comportamiento inesperado.

**Protocolo — sin pedir validación a cada paso:**
1. Leer logs/error completo → identificar causa raíz (no síntoma)
2. Proponer fix mínimo e impactante (no parchar, arreglar)
3. Implementar
4. Verificar (ejecutar, revisar output, confirmar que el error desapareció)
5. Reportar al usuario: causa raíz encontrada + fix aplicado + evidencia

**Anti-pattern a evitar:**
- ❌ Preguntar "¿quieres que revise los logs?" → solo hazlo
- ❌ Proponer múltiples opciones cuando la causa es clara
- ❌ Hacer cambios que no tocan la causa raíz

---

## 4. Demand Elegance (Balanceado)

**Trigger:** Cambio no trivial — más de 3 archivos modificados, decisión arquitectónica, o nuevo componente del sistema WAT.

**Acción:**
- Antes de implementar, pausar y preguntar internamente: "¿Hay una forma más elegante?"
- Si el fix se siente como un hack: "Conociendo todo lo que sé ahora, ¿cuál es la solución elegante?"
- Implementar la solución elegante, no la primera que funcione

**Excepciones — NO aplicar elegance check:**
- Fixes obvios de 1 línea
- Cambios de configuración simples
- Correcciones de texto/copy

---

## Patrones de violación a detectar

| Patrón | Descripción | Respuesta correcta |
|--------|-------------|-------------------|
| **No capturar lección** | Corrección aplicada pero no documentada en lessons.md | Escribir entrada inmediatamente |
| **Done sin verificar** | Declarar tarea completa sin evidencia de que funciona | Verificar primero, luego declarar done |
| **Bug con hand-holding** | Preguntar al usuario qué archivo revisar, qué hacer a cada paso | Analizar autónomamente, reportar causa raíz + fix |
| **Hack sobre elegance** | Solución que funciona pero añade deuda técnica innecesaria | Pausar, encontrar la forma elegante |

---

## Recursos

- Documento de lecciones: `tasks/lessons.md`
- Agentes afectados: todos