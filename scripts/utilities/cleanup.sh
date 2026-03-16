#!/bin/bash
# ============================================================
# Cleanup Script - Emiralia
# ============================================================
# Elimina archivos temporales del root
# ============================================================

echo "🧹 Limpiando archivos temporales..."

# Logs
rm -f *.log
echo "  ✅ Logs eliminados"

# PIDs
rm -f *.pid
echo "  ✅ PIDs eliminados"

# Imágenes temporales
rm -f tmp_*.jpg
rm -f localhost_*.png
echo "  ✅ Screenshots temporales eliminados"

# Verificar que no hay SQL en root
SQL_COUNT=$(ls *.sql 2>/dev/null | wc -l)
if [ "$SQL_COUNT" -gt 0 ]; then
  echo "  ⚠️  ADVERTENCIA: Hay $SQL_COUNT archivos .sql en root"
  echo "      Deberían estar en scripts/migrations/archive/"
  ls *.sql
fi

# Verificar que no hay scripts de deployment en root
SCRIPT_COUNT=$(ls railway-*.sh import-*.js 2>/dev/null | wc -l)
if [ "$SCRIPT_COUNT" -gt 0 ]; then
  echo "  ⚠️  ADVERTENCIA: Hay $SCRIPT_COUNT scripts en root"
  echo "      Deberían estar en scripts/deployment/ o scripts/migrations/"
  ls railway-*.sh import-*.js 2>/dev/null
fi

echo "✅ Limpieza completada"
