# Skill: Weekly Brainstorm 📅

Facilitates the Monday strategy session for a department, summarizing the previous week's performance and planning the next steps. Executed primarily by PM agents (e.g., Petra).

## Actions

### `generate_session`
Generates a new weekly session record in the database.
- **Arguments**:
  - `department`: The ID of the department (e.g., 'data', 'seo').
  - `week_number`: The ISO week number.
- **Workflow**:
  1. Pulls all EOD reports from the last 7 days for the department.
  2. Analyzes agent blockers and completed tasks.
  3. Outputs a structured session with steps and recommended projects.
  4. Persists to `weekly_sessions` table via API.

## CLI Usage
```bash
node tools/workspace-skills/weekly-generator.js --run [dept] [week]
```
