#!/bin/bash
# PostToolUse hook: auto-track every Skill tool invocation
# stdin: JSON with tool_name, tool_input, tool_response

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Only process Skill tool calls
if [ "$TOOL_NAME" != "Skill" ]; then
  exit 0
fi

SKILL_NAME=$(echo "$INPUT" | jq -r '.tool_input.skill // empty')
if [ -z "$SKILL_NAME" ]; then
  exit 0
fi

# Resolve domain by scanning .claude/skills/ directory
DOMAIN="unknown"
SKILLS_DIR="$CLAUDE_PROJECT_DIR/.claude/skills"

for domain_dir in "$SKILLS_DIR"/*/; do
  skill_dir="${domain_dir}${SKILL_NAME}"
  if [ -d "$skill_dir" ]; then
    DOMAIN=$(basename "$domain_dir")
    break
  fi
done

# Record via existing CLI (non-blocking, errors silenced)
node "$CLAUDE_PROJECT_DIR/tools/workspace-skills/skill-tracker.js" \
  record "system" "$SKILL_NAME" "$DOMAIN" "success" 0 "" "PostToolUse" \
  2>/dev/null &

exit 0