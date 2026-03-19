# [Agent Name]

---
status: activo | planificado
department: interno | mixto | ops
role: [one-line description]
---

## Rol

[Descripción detallada del rol del agente en el sistema WAT]

## Status

**Status:** [✅ Activo | 📋 Planificado | 🚧 En Desarrollo]
**Timeline:** [Q1 2026 | Q2 2026 | etc.]
**Bloqueadores:** [ninguno | lista de bloqueadores]

## Skills Asignados

| Skill | Comando | Model | Cuándo Usarlo |
|-------|---------|-------|---------------|
| [[skill-name]] | `/skill-name` | sonnet | [description] |
| [[another-skill]] | `/another-skill` | opus | [description] |

## Tools Disponibles

- [[tool-name-1]] — [description]
- [[tool-name-2]] — [description]
- [[tools/db/memory.js]] — Leer y escribir memoria persistente del agente
- [[tools/db/wat-memory.js]] — Consultar estado compartido de otros agentes

## Memoria WAT

### Claves Recomendadas

**Scope `shared` (visible por otros agentes):**
- `status` — current agent status (idle, processing, blocked)
- `last_run` — timestamp of last execution
- `key_metric` — main metric being tracked

**Scope `private` (solo este agente):**
- `config` — internal configuration
- `cache` — temporary cached data

### Comandos

```bash
# Leer memoria
node tools/db/memory.js get agent-id <key>

# Escribir memoria
node tools/db/memory.js set agent-id <key> <value> shared

# Ver estado de otros agentes
node tools/db/wat-memory.js status
```

## Workflows

**Participa en:**
- [[workflow-1]] — [role in workflow]
- [[workflow-2]] — [role in workflow]

## Coordinación con Otros Agentes

| Agente | Workflow Común | Memoria Compartida | Frecuencia |
|--------|----------------|-------------------|------------|
| [[other-agent]] | [[workflow-name]] | `shared_key` | Diaria |

## Dependencies

**Integrations:**
- [[postgresql]] — [what it uses the integration for]
- [[apify]] — [what it uses the integration for]

**Critical Files:**
- [file-path.js](../../../path/to/file.js) — [description]

## Related

- [[AGENTS.md]] — agent registry
- [[WORKFLOWS.md]] — workflows using this agent
- [[SKILLS.md]] — skills this agent can invoke
