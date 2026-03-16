# Core Infrastructure — Tool Execution Engine

**Status:** ✅ Completed (2026-03-17)

## Overview

Sistema de ejecución de tools con validación de permisos, timeouts, y logging automático.

## Files Created

1. **`tool-registry.json`** (202 LOC) — Registry de 21 tools esenciales
2. **`tool-executor.js`** (229 LOC) — Motor de ejecución con permisos, timeouts, logging
3. **`validate-tool-execution.js`** (147 LOC) — Spike inicial de validación
4. **`test-tool-executor.js`** (302 LOC) — Suite de integración (10 tests)

**Total:** ~880 LOC

## Features Implemented

### ✅ Tool Registry
- 21 tools mapeados en JSON (memory, query, tracking, PM, translate, research)
- Metadata: path, export, timeout, permissions, category, args
- Wildcards (`*`) y permisos específicos por agente

### ✅ Tool Executor
- **Ejecución directa** via dynamic import (sin subprocess)
- **Validación de permisos** (wildcard o lista de agentes permitidos)
- **Timeout enforcement** (configurable por tool o por invocación)
- **Event logging** en `raw_events` (started, completed, failed, timeout)
- **Error handling** con contexto (agentId, toolName, duration)
- **Caching** de imports para performance

### ✅ Public API

```javascript
import { executeToolForAgent, getAvailableTools, getToolMetadata } from './tools/core/tool-executor.js';

// Execute tool
const result = await executeToolForAgent('data-agent', 'query.properties', ['SELECT * FROM agents']);

// Get tools available for agent
const tools = await getAvailableTools('pm-agent');

// Get tool metadata
const meta = await getToolMetadata('memory.set');
```

## Test Results

**Validation Spike (6 tests):**
- ✅ All passed
- ⚡ Avg latency: 12ms
- ✅ Direct import confirmed (no CLI/subprocess needed)

**Integration Tests (10 tests):**
- ✅ All passed
- ⚡ Total duration: 141ms
- ✅ Permission validation working
- ✅ Event logging working
- ✅ Timeout enforcement working
- ✅ Performance: 20 executions in 71ms (~3.5ms each)

## Performance Benchmarks

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Average tool execution | <2s | 12ms | ✅ 166x faster |
| Permission check | <100ms | <1ms | ✅ |
| Event logging | <500ms | <10ms | ✅ |
| 20 parallel executions | <2s | 71ms | ✅ 28x faster |

## Event Logging

All tool executions automatically logged to `raw_events`:

```json
{
  "agent_id": "data-agent",
  "event_type": "tool_execution",
  "content": {
    "tool_name": "query.properties",
    "status": "completed",
    "duration_ms": 32,
    "result_type": "object",
    "result_length": 10
  }
}
```

**Event statuses:**
- `started` — Tool invocation started
- `completed` — Successful execution
- `failed` — Error during execution
- `timeout` — Exceeded timeout limit

## Permissions Model

### Wildcard Permission (`*`)
All agents can use these tools:
- `memory.set`, `memory.get`, `memory.list`, `memory.shared`
- `skill.track`, `activity.record`
- `pm.extract-json`

### Restricted Tools
Only specific agents can use:
- `query.properties` → data-agent, pm-agent, marketing-agent
- `project.*` → pm-agent only
- `translate.*` → translation-agent, content-agent, marketing-agent
- `wat-memory.system-state` → pm-agent, wat-auditor-agent

### Error Handling

```javascript
try {
  await executeToolForAgent('wrong-agent', 'query.properties', [sql]);
} catch (error) {
  // error.code === 'PERMISSION_DENIED'
  // error.agentId === 'wrong-agent'
  // error.toolName === 'query.properties'
}
```

## Next Steps

**Recommended order:**
1. ✅ **Feature 1.1: Tool Execution Engine** (DONE)
2. 🔜 **Feature 1.2: Context Injection** — Build system prompt from agent def + memory + events
3. 🔜 **Feature 1.3: Event Logger** — Unified wrapper for all event types
4. 🔜 **Feature 2: Database Schema** — New tables for conversations

## Usage Examples

### Execute Query Tool
```javascript
import { executeToolForAgent } from './tools/core/tool-executor.js';

const properties = await executeToolForAgent(
  'data-agent',
  'query.properties',
  ['SELECT community, COUNT(*) FROM properties GROUP BY community LIMIT 10']
);
```

### Save to Memory
```javascript
const result = await executeToolForAgent(
  'pm-agent',
  'memory.set',
  ['pm-agent', 'last_project_created', { id: 42, title: 'Agent Command Center' }, 'shared']
);
```

### Track Skill Invocation
```javascript
await executeToolForAgent(
  'content-agent',
  'skill.track',
  ['content-agent', 'traducir', 'content', 'completed', 1200, 'text=Hello', 'user']
);
```

### Custom Timeout & No Logging
```javascript
const result = await executeToolForAgent(
  'data-agent',
  'query.properties',
  [sql],
  {
    timeout: 60000, // 1 minute
    logEvents: false // Don't log to raw_events
  }
);
```

## Blockers Resolved

| Blocker | Status | Resolution |
|---------|--------|------------|
| Tools require CLI execution | ✅ Resolved | Direct import via ES6 modules |
| Windows dynamic import paths | ✅ Resolved | Convert to `file://` URLs |
| Permission validation | ✅ Implemented | Registry-based with wildcards |
| Event logging overhead | ✅ Non-issue | <10ms per log |

## Known Limitations

1. **No async tool execution** — All tools run synchronously (blocking)
   - Mitigation: Timeout prevents hanging
   - Future: Add background job queue for long-running tools

2. **No tool versioning** — Tools are always latest version
   - Mitigation: Breaking changes require registry update
   - Future: Add version field to registry

3. **Cache never invalidates** — Tool functions cached forever
   - Mitigation: `clearToolCache()` available for testing
   - Future: Watch files and invalidate on change

4. **No transaction support** — Tools execute independently
   - Mitigation: Tools should be idempotent
   - Future: Add transaction wrapper for multi-tool operations

## Dependencies

- `fs/promises` (Node.js built-in)
- `url`, `path` (Node.js built-in)
- `./db/pool.js` (existing)
- All tools in registry (21 modules)

## Maintenance

**To add a new tool:**

1. Create tool in `tools/` with export functions
2. Add entry to `tool-registry.json`:
   ```json
   "tool-name": {
     "path": "../path/to/tool.js",
     "export": "functionName",
     "type": "function",
     "category": "category",
     "timeout": 5000,
     "description": "What it does",
     "args": ["arg1", "arg2"],
     "permissions": "*" // or ["agent-1", "agent-2"]
   }
   ```
3. Run tests: `node tools/core/test-tool-executor.js`

**To modify permissions:**
- Edit `tool-registry.json` → `tools[toolName].permissions`

**To change timeout:**
- Edit `tool-registry.json` → `tools[toolName].timeout`
