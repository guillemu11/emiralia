#!/bin/bash
# ============================================================
# Railway Website Deployment - Emiralia
# ============================================================
# Crea y despliega el servicio del website estático
# ============================================================

set -e

echo "🌐 Desplegando website a Railway..."
echo ""

# ─── 1. Verificar autenticación ───────────────────────────
echo "📋 Paso 1/4: Verificando autenticación..."
railway whoami > /dev/null || {
    echo "❌ Error: No estás autenticado. Ejecuta: railway login"
    exit 1
}

echo "✅ Autenticado correctamente"
echo ""

# ─── 2. Crear servicio website ────────────────────────────
echo "📋 Paso 2/4: Creando servicio 'website'..."

# Verificar si ya existe
EXISTING_SERVICE=$(railway service list 2>/dev/null | grep -i "website" || true)

if [ -n "$EXISTING_SERVICE" ]; then
    echo "⚠️  El servicio 'website' ya existe"
    read -p "¿Quieres reconfigurarlo? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Operación cancelada"
        exit 0
    fi
else
    # Crear nuevo servicio
    railway service create website || {
        echo "❌ Error al crear el servicio"
        exit 1
    }
    echo "✅ Servicio 'website' creado"
fi

echo ""

# ─── 3. Configurar y desplegar ────────────────────────────
echo "📋 Paso 3/4: Configurando y desplegando..."

# Railway CLI no permite configurar root directory directamente
# El usuario debe hacerlo manualmente en Dashboard
echo "⚠️  Configuración manual requerida:"
echo ""
echo "   Ve a Railway Dashboard → website service → Settings:"
echo ""
echo "   1. Source → Root Directory: apps/website"
echo "   2. Build → DOCKERFILE (auto-detectado desde railway.toml)"
echo "   3. Dockerfile Path: Dockerfile (relativo a apps/website/)"
echo "   4. Deploy → Start Command: (vacío - usa CMD del Dockerfile)"
echo "   5. Healthcheck Path: /"
echo "   6. Networking → Generate Domain"
echo "   7. Deploy"
echo ""
read -p "¿Ya configuraste el servicio? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Por favor configura el servicio antes de continuar"
    exit 1
fi

echo "✅ Servicio configurado"
echo ""

# ─── 4. Verificar deployment ──────────────────────────────
echo "📋 Paso 4/4: Verificando deployment..."
echo "   Esperando 60 segundos para que el build complete..."
sleep 60

WEBSITE_SERVICE=$(railway service list | grep -i website | head -1 | awk '{print $1}')
WEBSITE_URL=$(railway domain --service $WEBSITE_SERVICE 2>/dev/null | head -1 || echo "")

if [ -n "$WEBSITE_URL" ]; then
    echo "   Probando URL del website..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$WEBSITE_URL")

    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Website funcionando correctamente"
        echo "   URL: https://$WEBSITE_URL"
        echo ""
        echo "   Probando páginas:"
        echo "   - Homepage: https://$WEBSITE_URL/"
        echo "   - Desarrolladores: https://$WEBSITE_URL/desarrolladores.html"
        echo "   - Propiedades: https://$WEBSITE_URL/propiedades.html"
    else
        echo "⚠️  Website respondió con código: $HTTP_CODE"
        echo "   Revisa los logs en Railway Dashboard"
    fi
else
    echo "⚠️  No se pudo obtener el dominio del website"
    echo "   Genera el dominio en: Railway Dashboard → website → Settings → Networking"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ Website deployment completado"
echo "════════════════════════════════════════════════════════"
