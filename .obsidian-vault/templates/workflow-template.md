# [Workflow Name]

---
status: activo | planificado
trigger: manual | scheduled | event-driven
frequency: diario | semanal | mensual | on-demand
---

## Objetivo

[One-line description of what this workflow achieves]

## Status

**Status:** [✅ Activo | 📋 Planificado | 🚧 En Desarrollo]
**Trigger:** [Manual | Scheduled (cron) | Event-driven]
**Frecuencia:** [Diario 3am | Semanal lunes 9am | On-demand]

## Agentes Involucrados

- [[agent-1]] — [role in workflow]
- [[agent-2]] — [role in workflow]
- [[agent-3]] — [role in workflow]

## Inputs

| Input | Tipo | Required | Default | Example |
|-------|------|----------|---------|---------|
| `input1` | string | ✅ | — | "Dubai Marina" |
| `input2` | number | ❌ | 100 | 500 |

## Outputs

| Output | Tipo | Destino | Modo | Description |
|--------|------|---------|------|-------------|
| `output1` | JSON | database | create_new | List of properties |
| `output2` | Markdown | local | overwrite | Report |

## Pasos

### 1. [Step Name]
**Agente:** [[agent-name]]
**Skill:** [[skill-name]] (`/skill-name`)
**Input:** [description]
**Output:** [description]

### 2. [Step Name]
**Agente:** [[agent-name]]
**Skill:** [[skill-name]] (`/skill-name`)
**Input:** [description]
**Output:** [description]

### 3. [Step Name]
**Agente:** [[agent-name]]
**Skill:** [[skill-name]] (`/skill-name`)
**Input:** [description]
**Output:** [description]

## Edge Cases

### Case 1: [Description]
**Síntoma:** [what happens]
**Solución:** [how to handle it]

### Case 2: [Description]
**Síntoma:** [what happens]
**Solución:** [how to handle it]

## Memoria WAT

**Claves compartidas entre agentes:**
- `key1` — [description]
- `key2` — [description]

## Success Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Dependencies

**Tools:**
- [[tool-1]] — [what it's used for]
- [[tool-2]] — [what it's used for]

**Integrations:**
- [[integration-name]] — [what it's used for]

## Related

- [[WORKFLOWS.md]] — workflow registry
- [[related-workflow]] — similar or dependent workflow
