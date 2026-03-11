---
name: activity-tracking
description: Registra acciones granulares de agentes en raw_events para transparencia y sintesis EOD.
model: haiku
---

# Skill: Activity Tracking

A utility skill used to record granular agent actions into the `raw_events` table. This provides the transparency needed for the EOD synthesis.

## Actions

### `record_activity`
Logs a new event to the database.
- **Arguments**:
  - `agent_id`: The ID of the agent.
  - `event_type`: Category of event (e.g., 'tool_call', 'task_complete', 'error').
  - `content`: A JSON object with the event details (message, tool name, result, etc.).

## Integration
Inject this skill into any autonomous loop to capture its lifecycle.

## CLI Usage
```bash
node tools/workspace-skills/activity-harvester.js --test
```
