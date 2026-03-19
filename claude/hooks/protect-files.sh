#!/bin/bash
# Hook: PreToolUse (Edit|Write)
# Protege archivos sensibles de edición accidental

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Archivos protegidos
PROTECTED_PATTERNS=(
  ".env"
  "docker-compose.yml"
  "package-lock.json"
  ".git/"
)

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "BLOQUEADO: No se puede editar '$FILE_PATH' (patrón protegido: '$pattern'). Si necesitas modificarlo, hazlo manualmente." >&2
    exit 2
  fi
done

exit 0
