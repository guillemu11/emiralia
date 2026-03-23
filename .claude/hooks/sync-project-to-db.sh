#!/bin/bash
# PostToolUse hook: Write|Edit
# Auto-syncs .claude/projects/*.md to DB when created or modified.

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Only process Write and Edit tool calls
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only handle .claude/projects/*.md
if [[ "$FILE_PATH" != *".claude/projects/"*".md" ]]; then
  exit 0
fi

# Run sync script non-blocking (errors must never fail the hook)
node "$CLAUDE_PROJECT_DIR/tools/db/sync_project_to_db.js" "$FILE_PATH" 2>/dev/null &

exit 0
