---
name: mcp-setup
description: Use when adding, configuring, removing or auditing MCP servers. Use when someone asks to add an MCP, set up an MCP server, configure integrations like Supabase/Gmail/Notion/Apify, or check what MCPs are active.
argument-hint: "nombre del MCP o list"
---

## What This Skill Does

Gestiona la configuración de MCP servers en Claude Code para el proyecto Emiralia.

## Niveles de configuración

| Nivel | Archivo | Scope |
|-------|---------|-------|
| **Usuario (global)** | `~/.claude/settings.json` → `mcpServers` | Todos los proyectos |
| **Proyecto** | `.claude/settings.json` → `mcpServers` | Solo Emiralia |

**Regla:** Usar nivel **proyecto** para MCPs específicos de Emiralia (bases de datos, scrapers). Usar nivel **usuario** para MCPs de uso general (Gmail, Notion, etc.).

## MCP Servers activos

### Global (`~/.claude/settings.json`)
- **Apify** — `@apify/actors-mcp-server@latest` — scraping / data agent
- **Railway** — `@railway/mcp-server@latest` — deployments, logs, variables, métricas

### Sesión Claude.ai (disponibles en conversación)
- **Supabase** — 30+ tools SQL/migrations/edge functions
- **Gmail** — leer/buscar/redactar emails
- **Notion** — páginas/bases de datos/comentarios

### Proyecto (`.claude/settings.json`)
- Ninguno configurado actualmente

---

## Comando: `list`

Si `$ARGUMENTS` es `list` o está vacío, mostrar el resumen de MCPs activos (tabla de arriba, actualizada).

```bash
# Ver configuración global
cat ~/.claude/settings.json | python3 -m json.tool

# Ver configuración del proyecto
cat .claude/settings.json | python3 -m json.tool
```

---

## Comando: añadir un MCP

Si `$ARGUMENTS` contiene el nombre de un MCP a añadir:

### Paso 1: Determinar nivel

Preguntar al usuario:
- ¿Debe estar disponible solo en Emiralia, o en todos tus proyectos?
- Si solo Emiralia → `.claude/settings.json`
- Si global → `~/.claude/settings.json`

### Paso 2: Estructura base

```json
{
  "mcpServers": {
    "<nombre>": {
      "command": "npx",
      "args": ["-y", "<paquete-npm>@latest"],
      "env": {
        "API_KEY": "<valor-desde-.env>"
      }
    }
  }
}
```

### Paso 3: MCPs comunes — referencias rápidas

| MCP | Paquete | Env var requerida |
|-----|---------|------------------|
| Apify | `@apify/actors-mcp-server` | `APIFY_TOKEN` |
| Supabase | `@supabase/mcp-server-supabase` | `SUPABASE_ACCESS_TOKEN` |
| Playwright | `@playwright/mcp` | — |
| Filesystem | `@modelcontextprotocol/server-filesystem` | — |
| PostgreSQL | `@modelcontextprotocol/server-postgres` | `DATABASE_URL` |
| Brave Search | `@modelcontextprotocol/server-brave-search` | `BRAVE_API_KEY` |

### Paso 4: Escribir la configuración

1. Leer el archivo target con Read
2. Añadir el bloque `mcpServers` con Edit
3. Verificar que las API keys estén en `.env`, no hardcodeadas directamente
4. Confirmar al usuario que debe **reiniciar Claude Code** para que el MCP cargue

### Paso 5: Verificar

```bash
# Tras reiniciar Claude Code, verificar que el MCP aparece en /mcp
# O ejecutar un tool del MCP para confirmar que responde
```

---

## Comando: eliminar un MCP

Si el usuario pide eliminar un MCP:

1. Leer el archivo de configuración
2. Identificar el bloque a eliminar
3. Usar Edit para quitarlo
4. Recordar al usuario reiniciar Claude Code

---

## Notas

- **API keys siempre en `.env`**, nunca hardcodeadas en settings.json
- Los MCPs de Claude.ai (`mcp__claude_ai_*`) están gestionados por Anthropic, no se configuran localmente
- Tras cualquier cambio en `settings.json`, es necesario reiniciar Claude Code para que tome efecto
- Si un MCP falla al cargar, revisar: paquete npm existe, API key correcta, permisos de red