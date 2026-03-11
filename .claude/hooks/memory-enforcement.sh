#!/bin/bash
# Hook: Stop
# Recuerda al agente que debe persistir su estado en memoria WAT
# Este hook añade un recordatorio al contexto de Claude

echo "RECORDATORIO: Si completaste una tarea, persiste tu estado en memoria WAT antes de terminar:
- node tools/db/memory.js set <agentId> last_task_completed '<descripcion>' shared
- node tools/db/memory.js set <agentId> last_task_at '$(date -u +%Y-%m-%dT%H:%M:%SZ)' shared"

exit 0
