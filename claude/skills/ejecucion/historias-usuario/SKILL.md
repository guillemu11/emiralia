---
name: historias-usuario
description: >
  Usar cuando se necesite escribir user stories o job stories para features
  de Emiralia. Genera historias siguiendo los formatos 3 C's + INVEST y
  When/Want/So adaptados al contexto PropTech EAU.
agent: PM Agent
disable-model-invocation: true
argument-hint: "[feature o epic]"
tools:
  - tools/db/memory.js
  - tools/db/wat-memory.js
  - tools/db/save_research.js
inputs:
  - FEATURE: Feature o epic para el que escribir historias
outputs:
  type: document
  destination:
    category: database
    target: PostgreSQL > tabla `pm_reports`
  write_mode: create_new
---

# Skill: Historias de Usuario

## ¿Qué hace este skill?

Genera **User Stories** y **Job Stories** para features de Emiralia, usando los formatos estándar adaptados al contexto de inversores hispanohablantes en el mercado inmobiliario de EAU.

## Cuándo usarlo

- Después de crear un PRD, para desglosar en historias ejecutables.
- Cuando el Dev Agent necesita especificaciones claras de qué construir.
- Para definir criterios de aceptación antes de implementar.

---

## Formatos

### User Story (3 C's + INVEST)
```
Como [rol en contexto Emiralia],
quiero [acción en la plataforma],
para [resultado de negocio en contexto EAU].
```

**3 C's**: Card (la historia), Conversation (discusión), Confirmation (criterios)
**INVEST**: Independent, Negotiable, Valuable, Estimable, Small, Testable

### Job Story
```
Cuando [situación de búsqueda de propiedad en EAU],
quiero [motivación específica al contexto],
para poder [resultado de inversión/vivienda].
```

---

## Roles disponibles en Emiralia

| Rol | Descripción |
|-----|-------------|
| Inversor hispanohablante | Usuario principal que busca propiedades en EAU |
| Expat hispano en EAU | Usuario que ya vive en EAU y quiere comprar |
| Agente inmobiliario | Agente que recibe leads de Emiralia |
| Administrador | Equipo interno de Emiralia |

---

## Plantilla de output

```markdown
# Historias de Usuario — [Feature/Epic]
**Fecha**: [fecha]

## User Stories

### US-[N]: [Título]
**Como** [inversor hispanohablante / expat en EAU / agente inmobiliario],
**quiero** [acción concreta en Emiralia],
**para** [beneficio medible].

**Criterios de Aceptación:**
- **Dado** [contexto del mercado EAU],
  **cuando** [acción del usuario],
  **entonces** [resultado verificable].
- **Dado** [otro contexto],
  **cuando** [otra acción],
  **entonces** [otro resultado].

**Estimación**: [S/M/L]
**Agente**: [Dev/Content/Data/Frontend]
**Prioridad**: [Must/Should/Could]

---

## Job Stories

### JS-[N]: [Título]
**Cuando** [situación real del usuario en contexto EAU],
**quiero** [motivación del usuario],
**para poder** [resultado deseado].

**Contexto adicional**: [detalles del mercado EAU relevantes]

---

## Resumen
| ID | Tipo | Título | Esfuerzo | Agente |
|----|------|--------|----------|--------|
| US-1 | User Story | [título] | [S/M/L] | [agente] |
| JS-1 | Job Story | [título] | [S/M/L] | [agente] |
```

---

## Persistencia

```bash
node tools/db/save_research.js --title "User Stories — [feature]" --summary "Historias de usuario y job stories"
```

---

## Notas

- Cada user story debe ser **testable**: si no puedes escribir un criterio de aceptación, la historia es demasiado vaga.
- Las job stories son mejores para **descubrir necesidades**; las user stories para **especificar implementación**.
- Máximo 8-10 historias por feature. Si hay más, dividir en sub-features.
- Complementar con `/crear-prd` para el documento completo y `/pre-mortem` para riesgos.
