#!/bin/bash
# ============================================================
# Railway Deployment Setup - Emiralia
# ============================================================
# Este script automatiza la configuración de Railway
# Ejecutar después de: railway login && railway link
# ============================================================

set -e  # Exit on error

echo "🚀 Iniciando configuración de Railway..."
echo ""

# ─── 1. Verificar autenticación ───────────────────────────
echo "📋 Paso 1/5: Verificando autenticación..."
railway whoami || {
    echo "❌ Error: No estás autenticado"
    echo "   Ejecuta: railway login"
    exit 1
}

railway status || {
    echo "❌ Error: Proyecto no vinculado"
    echo "   Ejecuta: railway link"
    exit 1
}

echo "✅ Autenticado correctamente"
echo ""

# ─── 2. Configurar variables de entorno del dashboard ─────
echo "📋 Paso 2/5: Configurando variables de entorno del dashboard..."

# Obtener service ID del dashboard
DASHBOARD_SERVICE=$(railway service list | grep -i dashboard | head -1 | awk '{print $1}')

if [ -z "$DASHBOARD_SERVICE" ]; then
    echo "❌ No se encontró el servicio 'dashboard'"
    echo "   Verifica que el servicio esté creado en Railway"
    exit 1
fi

echo "   Servicio dashboard encontrado: $DASHBOARD_SERVICE"

# Configurar variables de DB (referencias a PostgreSQL)
echo "   Configurando variables de PostgreSQL..."
railway variables --service $DASHBOARD_SERVICE set PG_SSL=true

# Configurar ANTHROPIC_API_KEY desde .env local
if [ -f .env ]; then
    ANTHROPIC_KEY=$(grep ANTHROPIC_API_KEY .env | cut -d '=' -f2)
    if [ -n "$ANTHROPIC_KEY" ]; then
        railway variables --service $DASHBOARD_SERVICE set ANTHROPIC_API_KEY=$ANTHROPIC_KEY
        echo "   ✅ ANTHROPIC_API_KEY configurada"
    fi
fi

echo "✅ Variables de entorno configuradas"
echo ""

# ─── 3. Ejecutar schema SQL en PostgreSQL ────────────────
echo "📋 Paso 3/5: Inicializando base de datos..."

# Railway no permite ejecutar SQL directamente desde CLI, debe hacerse vía Dashboard
echo "⚠️  Para ejecutar el schema SQL:"
echo "   1. Ve a Railway Dashboard → Postgres → Query"
echo "   2. Copia y pega el contenido de: tools/db/schema.sql"
echo "   3. Ejecuta la query"
echo ""
read -p "¿Ya ejecutaste el schema SQL? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "   Por favor ejecuta el schema SQL antes de continuar"
    exit 1
fi

echo "✅ Schema verificado"
echo ""

# ─── 4. Redesplegar dashboard ─────────────────────────────
echo "📋 Paso 4/5: Redesplegando dashboard con nuevas variables..."
railway up --service $DASHBOARD_SERVICE --detach

echo "✅ Dashboard redesplegado"
echo ""

# ─── 5. Verificar que funciona ────────────────────────────
echo "📋 Paso 5/5: Verificando deployment..."
echo "   Esperando 30 segundos para que el servicio arranque..."
sleep 30

DASHBOARD_URL=$(railway domain --service $DASHBOARD_SERVICE 2>/dev/null | head -1)

if [ -n "$DASHBOARD_URL" ]; then
    echo "   Probando API endpoint..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DASHBOARD_URL/api/agents")

    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Dashboard funcionando correctamente"
        echo "   URL: https://$DASHBOARD_URL"
    else
        echo "⚠️  Dashboard respondió con código: $HTTP_CODE"
        echo "   Revisa los logs en Railway Dashboard"
    fi
else
    echo "⚠️  No se pudo obtener el dominio del dashboard"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ Setup completado"
echo ""
echo "📊 Próximos pasos:"
echo "   1. Abre: https://emiralia-dashboard-production.up.railway.app"
echo "   2. Verifica que el dashboard cargue datos"
echo "   3. Ejecuta: ./railway-website-deploy.sh para desplegar el website"
echo "════════════════════════════════════════════════════════"
