# Skill: EOD Report 📝

Synthesizes the daily activity of an agent into a structured End-Of-Day (EOD) report. This skill ensures data consistency and provides a clear audit trail for PMs.

## Actions

### `generate_eod`
Processes raw events for a specific agent and date to create a report.
- **Arguments**:
  - `agent_id`: The ID of the agent (e.g., 'scraper-ralph').
  - `date`: (Optional) The date in YYYY-MM-DD format. Defaults to today.
- **Workflow**:
  1. Fetches all records from `raw_events` for the agent and date.
  2. Map events to 'completed', 'in-progress', or 'blocked' categories.
  3. POSTs the resulting JSON to `/api/eod-reports`.

## CLI Usage
```bash
node tools/workspace-skills/eod-generator.js --test [agent_id]
```
