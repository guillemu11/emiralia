#!/bin/bash
# ============================================================
# Railway Auto-Deploy Script - Emiralia
# ============================================================
# Automatiza la creación de servicios dashboard y website
# ============================================================

set -e

# ─── Leer credenciales de .env en lugar de hardcodear ───
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

PROJECT_ID="${RAILWAY_PROJECT_ID}"
RAILWAY_TOKEN="${RAILWAY_TOKEN}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"

if [ -z "$PROJECT_ID" ] || [ -z "$RAILWAY_TOKEN" ]; then
  echo "❌ Error: Variables de entorno faltantes"
  echo "   Asegúrate de tener .env con:"
  echo "   RAILWAY_PROJECT_ID=..."
  echo "   RAILWAY_TOKEN=..."
  echo "   ANTHROPIC_API_KEY=..."
  exit 1
fi

API_URL="https://backboard.railway.app/graphql/v2"

echo "🚀 Railway Auto-Deploy - Emiralia"
echo "Project ID: $PROJECT_ID"
echo ""

# ─── Helper: GraphQL Query ─────────────────────────────────
query_railway() {
  local query="$1"
  curl -s "$API_URL" \
    -H "Authorization: Bearer $RAILWAY_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$query\"}"
}

# ─── 1. Obtener GitHub Repo ID ─────────────────────────────
echo "📋 Paso 1/6: Obteniendo repositorio GitHub..."

# Primero necesitamos el repo ID conectado a Railway
REPOS_QUERY="query { me { githubRepos { id name owner { login } } } }"
REPOS_RESPONSE=$(query_railway "$REPOS_QUERY")

echo "Repos disponibles:"
echo "$REPOS_RESPONSE" | jq -r '.data.me.githubRepos[] | "\(.owner.login)/\(.name) - ID: \(.id)"' 2>/dev/null || echo "$REPOS_RESPONSE"

# Extraer el repo ID de emiralia (ajustar según el nombre exacto)
REPO_ID=$(echo "$REPOS_RESPONSE" | jq -r '.data.me.githubRepos[] | select(.name | contains("emiralia")) | .id' | head -1)

if [ -z "$REPO_ID" ]; then
  echo "❌ No se encontró el repositorio 'emiralia' conectado a Railway"
  echo "   Por favor conecta tu repo primero en Railway Dashboard"
  exit 1
fi

echo "✅ Repo encontrado: $REPO_ID"
echo ""

# ─── 2. Crear Servicio Dashboard ────────────────────────────
echo "📋 Paso 2/6: Creando servicio 'dashboard'..."

CREATE_DASHBOARD_MUTATION="mutation {
  serviceCreate(input: {
    projectId: \"$PROJECT_ID\"
    name: \"dashboard\"
    source: {
      repo: \"$REPO_ID\"
      rootDirectory: \"apps/dashboard\"
    }
  }) {
    id
    name
  }
}"

DASHBOARD_RESPONSE=$(query_railway "$(echo $CREATE_DASHBOARD_MUTATION | tr '\n' ' ')")
DASHBOARD_SERVICE_ID=$(echo "$DASHBOARD_RESPONSE" | jq -r '.data.serviceCreate.id')

if [ -z "$DASHBOARD_SERVICE_ID" ] || [ "$DASHBOARD_SERVICE_ID" = "null" ]; then
  echo "⚠️  Error al crear dashboard service"
  echo "$DASHBOARD_RESPONSE"
  echo "   Intentando obtener servicio existente..."

  # Intentar obtener servicios existentes
  SERVICES_QUERY="query { project(id: \"$PROJECT_ID\") { services { edges { node { id name } } } } }"
  SERVICES_RESPONSE=$(query_railway "$SERVICES_QUERY")
  DASHBOARD_SERVICE_ID=$(echo "$SERVICES_RESPONSE" | jq -r '.data.project.services.edges[] | select(.node.name == "dashboard") | .node.id')
fi

echo "✅ Dashboard Service ID: $DASHBOARD_SERVICE_ID"
echo ""

# ─── 3. Configurar Variables de Dashboard ───────────────────
echo "📋 Paso 3/6: Configurando variables de entorno del dashboard..."

# Primero necesitamos obtener el Plugin ID de PostgreSQL
PLUGINS_QUERY="query { project(id: \"$PROJECT_ID\") { plugins { edges { node { id name } } } } }"
PLUGINS_RESPONSE=$(query_railway "$PLUGINS_QUERY")
POSTGRES_ID=$(echo "$PLUGINS_RESPONSE" | jq -r '.data.project.plugins.edges[] | select(.node.name | contains("Postgres")) | .node.id' | head -1)

echo "PostgreSQL Plugin ID: $POSTGRES_ID"

# Configurar variables una por una
VARS=(
  "PG_SSL:true"
  "PORT:3001"
  "DASHBOARD_PORT:3001"
  "ANTHROPIC_API_KEY:$ANTHROPIC_API_KEY"
)

for VAR in "${VARS[@]}"; do
  KEY="${VAR%%:*}"
  VALUE="${VAR#*:}"

  echo "  Setting $KEY..."

  VAR_MUTATION="mutation {
    variableUpsert(input: {
      projectId: \"$PROJECT_ID\"
      serviceId: \"$DASHBOARD_SERVICE_ID\"
      name: \"$KEY\"
      value: \"$VALUE\"
    })
  }"

  query_railway "$(echo $VAR_MUTATION | tr '\n' ' ')" > /dev/null
done

# Variables de referencia a PostgreSQL (syntax especial)
echo "  Setting PostgreSQL references..."

PG_VARS=(
  "PG_HOST:PGHOST"
  "PG_PORT:PGPORT"
  "PG_DB:PGDATABASE"
  "PG_USER:PGUSER"
  "PG_PASSWORD:PGPASSWORD"
)

for VAR in "${PG_VARS[@]}"; do
  KEY="${VAR%%:*}"
  PG_KEY="${VAR#*:}"
  VALUE="\\\${{Postgres.$PG_KEY}}"

  echo "  Setting $KEY -> $PG_KEY..."

  VAR_MUTATION="mutation {
    variableUpsert(input: {
      projectId: \"$PROJECT_ID\"
      serviceId: \"$DASHBOARD_SERVICE_ID\"
      name: \"$KEY\"
      value: \"$VALUE\"
    })
  }"

  query_railway "$(echo $VAR_MUTATION | tr '\n' ' ')" > /dev/null
done

echo "✅ Variables configuradas"
echo ""

# ─── 4. Configurar Build Settings Dashboard ─────────────────
echo "📋 Paso 4/6: Configurando build settings del dashboard..."

UPDATE_DASHBOARD_MUTATION="mutation {
  serviceUpdate(input: {
    serviceId: \"$DASHBOARD_SERVICE_ID\"
    startCommand: \"node server.js\"
  })
}"

query_railway "$(echo $UPDATE_DASHBOARD_MUTATION | tr '\n' ' ')" > /dev/null

echo "✅ Build settings configurados"
echo ""

# ─── 5. Crear Servicio Website ──────────────────────────────
echo "📋 Paso 5/6: Creando servicio 'website'..."

CREATE_WEBSITE_MUTATION="mutation {
  serviceCreate(input: {
    projectId: \"$PROJECT_ID\"
    name: \"website\"
    source: {
      repo: \"$REPO_ID\"
      rootDirectory: \"apps/website\"
    }
  }) {
    id
    name
  }
}"

WEBSITE_RESPONSE=$(query_railway "$(echo $CREATE_WEBSITE_MUTATION | tr '\n' ' ')")
WEBSITE_SERVICE_ID=$(echo "$WEBSITE_RESPONSE" | jq -r '.data.serviceCreate.id')

if [ -z "$WEBSITE_SERVICE_ID" ] || [ "$WEBSITE_SERVICE_ID" = "null" ]; then
  echo "⚠️  Error al crear website service, intentando obtener existente..."
  WEBSITE_SERVICE_ID=$(echo "$SERVICES_RESPONSE" | jq -r '.data.project.services.edges[] | select(.node.name == "website") | .node.id')
fi

echo "✅ Website Service ID: $WEBSITE_SERVICE_ID"
echo ""

# ─── 6. Configurar Build Settings Website ───────────────────
echo "📋 Paso 6/6: Configurando build settings del website..."

UPDATE_WEBSITE_MUTATION="mutation {
  serviceUpdate(input: {
    serviceId: \"$WEBSITE_SERVICE_ID\"
    buildCommand: \"npm install && npm run build\"
    startCommand: \"npm run preview -- --host 0.0.0.0 --port \\\$PORT\"
  })
}"

query_railway "$(echo $UPDATE_WEBSITE_MUTATION | tr '\n' ' ')" > /dev/null

echo "✅ Build settings configurados"
echo ""

# ─── 7. Trigger Deployments ──────────────────────────────────
echo "🚀 Triggering deployments..."

# Dashboard
DEPLOY_DASHBOARD="mutation {
  serviceDeploy(input: {
    serviceId: \"$DASHBOARD_SERVICE_ID\"
  }) {
    id
  }
}"

query_railway "$(echo $DEPLOY_DASHBOARD | tr '\n' ' ')" > /dev/null
echo "  ✅ Dashboard deployment iniciado"

# Website
DEPLOY_WEBSITE="mutation {
  serviceDeploy(input: {
    serviceId: \"$WEBSITE_SERVICE_ID\"
  }) {
    id
  }
}"

query_railway "$(echo $DEPLOY_WEBSITE | tr '\n' ' ')" > /dev/null
echo "  ✅ Website deployment iniciado"

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ Deployment automatizado completado!"
echo ""
echo "📊 Próximos pasos:"
echo "   1. Ve a Railway Dashboard: https://railway.app/project/$PROJECT_ID"
echo "   2. Genera dominios para ambos servicios en Settings → Networking"
echo "   3. Ejecuta el schema SQL en PostgreSQL (Query tab)"
echo "   4. Espera ~3 minutos a que los builds completen"
echo ""
echo "🔗 Enlaces rápidos:"
echo "   Dashboard: https://railway.app/project/$PROJECT_ID/service/$DASHBOARD_SERVICE_ID"
echo "   Website: https://railway.app/project/$PROJECT_ID/service/$WEBSITE_SERVICE_ID"
echo "════════════════════════════════════════════════════════"
