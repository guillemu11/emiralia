# Quick Start Guide ⚡

> Empieza a operar con agentes en 5 minutos

**Última actualización:** 2026-03-20

---

## 🎯 Objetivo

Al final de esta guía podrás:
- ✅ Chatear con agentes desde Telegram
- ✅ Chatear con agentes desde Dashboard
- ✅ Ejecutar skills y operaciones CRUD

**Tiempo estimado:** 5-10 minutos

---

## 📋 Pre-requisitos

Antes de empezar, verifica que tengas:

- [ ] PostgreSQL corriendo (puerto 5433)
- [ ] `.env` configurado con API keys
- [ ] Telegram instalado (móvil o desktop)
- [ ] Node.js 18+ instalado

---

## 🚀 Paso 1: Setup Inicial (2 min)

### 1.1 Arrancar Base de Datos

```bash
# Desde la raíz del proyecto
docker-compose up -d

# Verificar que esté corriendo
docker-compose ps
# Deberías ver: emiralia-postgres (Up)
```

### 1.2 Ejecutar Migrations

```bash
node tools/db/run-migrations.js
```

**Resultado esperado:**
```
✅ Migration agent_conversations applied successfully
✅ Migration telegram_users applied successfully
✅ 2 migrations completed
```

### 1.3 Verificar Configuración

```bash
# Ver archivo .env (debe tener estas variables)
cat .env | grep -E "(TELEGRAM_BOT_TOKEN|ANTHROPIC_API_KEY|TELEGRAM_ADMIN_IDS)"
```

**Si faltan variables:**
```bash
# Añadir a .env
echo "TELEGRAM_BOT_TOKEN=your_bot_token" >> .env
echo "ANTHROPIC_API_KEY=your_api_key" >> .env
echo "TELEGRAM_ADMIN_IDS=your_telegram_user_id" >> .env
```

**¿Cómo obtener tu Telegram User ID?**
1. Abre Telegram
2. Busca el bot `@userinfobot`
3. Envía `/start`
4. Copia tu User ID (número largo)

---

## 📱 Paso 2: Telegram Bot (2 min)

### 2.1 Iniciar el Bot

```bash
node tools/telegram/bot.js
```

**Resultado esperado:**
```
🤖 Telegram Bot Starting...
✅ Database connection OK
✅ Bot is listening for updates
```

### 2.2 Primer Contacto

1. Abre Telegram
2. Busca tu bot (usa el username que obtuviste de @BotFather)
3. Envía: `/start`

**Deberías recibir:**
```
🤖 Bienvenido al Sistema Multi-Agente de Emiralia

Actualmente hablas con: PM Agent
Rol: Product Manager & Project Coordinator

📋 Comandos disponibles:
/agents — Ver todos los agentes
/whoami — Ver agente actual
/skill <name> [args] — Ejecutar skill
/help — Ver ayuda completa
```

### 2.3 Cambiar de Agente

```
/agents
```

**Verás un teclado con 9 agentes:**
```
🧠 pm-agent          📊 data-agent
✍️ content-agent     🌐 translation-agent
🎨 frontend-agent    💻 dev-agent
📢 marketing-agent   🔍 research-agent
🔧 wat-auditor-agent
```

Toca **"📊 data-agent"**.

**Confirmación:**
```
✅ Ahora hablas con Data Agent
   Role: Data Intelligence & Scraping

   Skills disponibles:
   • /skill propertyfinder-scraper
   • /skill consultas-sql
   • /skill normalizar-datos
```

### 2.4 Ejecutar tu Primer Skill

```
/skill consultas-sql city=Dubai
```

**Verás streaming en tiempo real:**
```
⚡ Ejecutando skill: consultas-sql
   Args: city=Dubai

[Respuesta streaming...]

📊 Propiedades en Dubai:
Total: 1,247 propiedades
Precio promedio: $850,000
[...]

✅ Completado en 2.8s
```

---

## 🌐 Paso 3: Dashboard Web (1 min)

### 3.1 Iniciar Dashboard

**Nueva terminal:**
```bash
cd apps/dashboard
npm run dev
```

**Resultado esperado:**
```
> dashboard@1.0.0 dev
> node server.js

✅ Database connection OK
🚀 Server running on http://localhost:3001
```

### 3.2 Abrir en Navegador

Abre: [http://localhost:3001](http://localhost:3001)

### 3.3 Navegar a Agentes

1. Click en **"Agents"** en la barra superior
2. Verás los 9 agentes disponibles
3. Click en **"PM Agent"**

### 3.4 Abrir Chat

1. La tab **"Chat"** está abierta por defecto
2. Escribe en el input inferior: `¿Qué proyectos activos tenemos?`
3. Presiona **Enter**

**Verás:**
- Tu mensaje aparece inmediatamente
- El agente responde con **streaming en tiempo real**
- Respuesta completa en ~3 segundos

---

## ✅ Verificación Final

Si llegaste aquí, deberías poder hacer todo esto:

### Telegram ✅

- [ ] Enviar `/start` y recibir bienvenida
- [ ] Cambiar agente con `/agents`
- [ ] Ver agente activo con `/whoami`
- [ ] Ejecutar un skill con `/skill <name> args`
- [ ] Listar recursos con `/list projects`

### Dashboard ✅

- [ ] Abrir [http://localhost:3001](http://localhost:3001)
- [ ] Ver lista de 9 agentes
- [ ] Abrir chat con un agente
- [ ] Enviar mensaje y recibir respuesta streaming
- [ ] Ver historial de conversación

---

## 🎯 Próximos Pasos

Ahora que tienes el sistema funcionando, prueba:

### 1. Workflow PM Agent

```bash
# Telegram
/agent pm-agent
/list projects status=active
/create project name="Test Project" description="Testing ACC" status=active priority=high
/skill crear-prd project_id=<id_del_proyecto_creado>
```

### 2. Workflow Data Agent

```bash
# Telegram
/agent data-agent
/skill propertyfinder-scraper city=Dubai property_type=apartment
/skill consultas-sql city=Dubai
/list properties city=Dubai
```

### 3. Workflow Content Agent

```bash
# Telegram
/agent content-agent
/skill generar-listing property_id=12345 target=es-ES
/create memory key=draft_12345 value="Borrador de listing..."
```

---

## 🐛 Troubleshooting Rápido

### El bot no responde

```bash
# Verificar que esté corriendo
ps aux | grep "node.*telegram/bot.js"

# Si no está, iniciarlo
node tools/telegram/bot.js
```

### Dashboard muestra error 500

```bash
# Verificar que la DB esté corriendo
docker-compose ps

# Verificar que el servidor esté corriendo
ps aux | grep "node.*dashboard/server.js"

# Revisar logs
tail -f apps/dashboard/logs/error.log
```

### No estoy autorizado en Telegram

```bash
# Verificar que tu user_id esté en TELEGRAM_ADMIN_IDS
cat .env | grep TELEGRAM_ADMIN_IDS

# Si no está, añadirlo
echo "TELEGRAM_ADMIN_IDS=tu_user_id_aqui" >> .env

# Reiniciar el bot
# Ctrl+C en la terminal del bot
node tools/telegram/bot.js
```

---

## 📚 Documentación Completa

- [README General](./README.md) — Arquitectura y overview
- [Comandos de Telegram](./telegram-commands.md) — Referencia exhaustiva
- [Dashboard Guide](./dashboard-guide.md) — Guía detallada del dashboard
- [Proyecto Completo](../../.claude/projects/agent-command-center.md) — Documento ejecutable

---

## 🎉 ¡Listo!

Ya tienes el **Agent Command Center** completamente operativo.

**Siguientes pasos recomendados:**

1. Lee la [documentación completa de comandos](./telegram-commands.md)
2. Explora los 9 agentes disponibles
3. Ejecuta skills avanzados
4. Experimenta con operaciones CRUD

**¿Problemas?** Revisa el [README](./README.md) o reporta un issue.

---

**✨ ¡Bienvenido al futuro de la operación multi-agente!**
