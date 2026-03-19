# Telegram Bot — Referencia Completa de Comandos 📱

> Documentación exhaustiva de todos los comandos disponibles en el bot de Telegram

**Última actualización:** 2026-03-20

---

## 📋 Índice

- [Comandos Básicos](#comandos-básicos)
- [Gestión de Agentes](#gestión-de-agentes)
- [Ejecución de Skills](#ejecución-de-skills)
- [Operaciones CRUD](#operaciones-crud)
- [Conversaciones](#conversaciones)
- [Administración](#administración)
- [Ejemplos Avanzados](#ejemplos-avanzados)

---

## Comandos Básicos

### `/start`

Inicia el bot y muestra información del agente activo.

**Sintaxis:**
```
/start
```

**Respuesta:**
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

**Notas:**
- Registra automáticamente al usuario en la base de datos
- Si el usuario está en `TELEGRAM_ADMIN_IDS`, es auto-autorizado como admin
- Si no está autorizado, el bot le dirá que espere autorización

---

### `/help`

Muestra ayuda completa con todos los comandos.

**Sintaxis:**
```
/help
```

**Respuesta:**
```
📖 AYUDA COMPLETA — AGENT COMMAND CENTER

[Lista completa de comandos categorizados]
```

---

## Gestión de Agentes

### `/agents`

Muestra lista interactiva de los 9 agentes disponibles.

**Sintaxis:**
```
/agents
```

**Respuesta:**
Mensaje con inline keyboard mostrando:
```
📊 Agentes Disponibles (9)

🧠 pm-agent          📊 data-agent
✍️ content-agent     🌐 translation-agent
🎨 frontend-agent    💻 dev-agent
📢 marketing-agent   🔍 research-agent
🔧 wat-auditor-agent

Selecciona un agente para activarlo:
[Botones interactivos]
```

**Ejemplo de uso:**
```
Usuario: /agents
Bot: [Muestra lista]
Usuario: [Toca botón "📊 data-agent"]
Bot: ✅ Ahora hablas con Data Agent
     Role: Data Intelligence & Scraping

     Skills disponibles:
     /skill propertyfinder-scraper
     /skill consultas-sql
     [...]
```

---

### `/agent <agent-id>`

Cambia el agente activo por comando de texto (alternativa a `/agents`).

**Sintaxis:**
```
/agent <agent-id>
```

**Parámetros:**
- `agent-id`: ID del agente (`pm-agent`, `data-agent`, etc.)

**Ejemplos:**
```bash
/agent pm-agent
/agent data-agent
/agent marketing-agent
```

**Respuesta:**
```
✅ Ahora hablas con Data Agent
   Role: Data Intelligence & Scraping

   Skills disponibles:
   • /skill propertyfinder-scraper
   • /skill consultas-sql
   • /skill normalizar-datos
```

**Errores comunes:**
```bash
# ❌ ID incorrecto
/agent data
→ "Agente 'data' no encontrado. Usa /agents para ver la lista."

# ❌ ID con typo
/agent pm_agent
→ "Agente 'pm_agent' no encontrado. ¿Quisiste decir 'pm-agent'?"
```

---

### `/whoami`

Muestra información del agente activo actual.

**Sintaxis:**
```
/whoami
```

**Respuesta:**
```
🤖 Agente Activo: PM Agent

📋 Información:
• ID: pm-agent
• Rol: Product Manager & Project Coordinator
• Departamento: Product

⚡ Skills disponibles:
• /skill crear-prd
• /skill challenge
• /skill priorizar-features
• /skill analizar-competencia

🔧 Tools disponibles:
• saveProject()
• listProjects()
• queryDatabase()
• trackSkill()

💬 Última actividad: hace 2 horas
```

---

## Ejecución de Skills

### `/skill <name> [args]`

Ejecuta un skill del agente activo.

**Sintaxis:**
```
/skill <skill-name> [key=value key2=value2 ...]
```

**Parámetros:**
- `skill-name`: Nombre del skill (sin `/`)
- `args` (opcional): Argumentos en formato `key=value`

**Ejemplos:**

#### Sin argumentos:
```bash
/skill crear-prd
```

#### Con argumentos simples:
```bash
/skill consultas-sql city=Dubai
/skill traducir text="Welcome to Emiralia" target=es-MX
```

#### Con múltiples argumentos:
```bash
/skill propertyfinder-scraper city=Dubai property_type=apartment min_price=500000 max_price=1000000
```

#### Con argumentos largos (usar comillas):
```bash
/skill challenge idea="Crear un dashboard de analytics para developers con filtros por zona, tipo de propiedad y rango de precios"
```

**Respuesta:**
```
⚡ Ejecutando skill: consultas-sql
   Args: city=Dubai

[Streaming de respuesta en tiempo real...]

✅ Completado en 3.2s
```

**Errores comunes:**
```bash
# ❌ Skill no existe
/skill consultas
→ "Skill 'consultas' no encontrado. Skills disponibles: /skill consultas-sql, ..."

# ❌ Agente sin permiso
/agent frontend-agent
/skill propertyfinder-scraper
→ "Frontend Agent no tiene acceso al skill 'propertyfinder-scraper'. Este skill solo está disponible para: data-agent"

# ❌ Argumentos mal formateados
/skill consultas-sql city Dubai
→ "Error en argumentos. Formato correcto: key=value"
```

---

## Operaciones CRUD

### `/create <tipo> key=value ...`

Crea un nuevo recurso.

**Sintaxis:**
```
/create <resource-type> key1=value1 key2=value2 ...
```

**Tipos de recursos:**
- `project` — Proyectos (PM Agent)
- `task` — Tareas (PM Agent)
- `memory` — Memoria del agente (todos)
- `inbox_item` — Items de inbox (PM Agent)

**Ejemplos:**

```bash
# Crear proyecto
/create project name="Dashboard v2" description="Renovar dashboard con nuevos features" status=active priority=high

# Crear tarea
/create task title="Implementar auth" project_id=1 status=todo priority=medium

# Guardar en memoria
/create memory key=last_scrape_date value="2026-03-20"

# Crear inbox item
/create inbox_item title="Review PR #42" type=code_review priority=high
```

**Respuesta:**
```
✅ Proyecto creado exitosamente

ID: 15
Name: Dashboard v2
Status: active
Priority: high
Created: 2026-03-20 10:30 UTC
```

---

### `/read <tipo> <id>`

Lee un recurso específico.

**Sintaxis:**
```
/read <resource-type> <id>
```

**Ejemplos:**

```bash
# Leer proyecto
/read project 15

# Leer propiedad (Data Agent)
/read property 12345

# Leer memoria
/read memory last_scrape_date
```

**Respuesta:**
```
📋 Project #15

Name: Dashboard v2
Description: Renovar dashboard con nuevos features
Status: active
Priority: high
Created: 2026-03-20 10:30 UTC
Updated: 2026-03-20 11:15 UTC
```

---

### `/update <tipo> <id> key=value ...`

Actualiza un recurso existente.

**Sintaxis:**
```
/update <resource-type> <id> key1=value1 key2=value2 ...
```

**Ejemplos:**

```bash
# Actualizar proyecto
/update project 15 status=in_progress progress=30

# Actualizar tarea
/update task 42 status=done

# Actualizar memoria
/update memory last_scrape_date value="2026-03-20T15:00:00Z"
```

**Respuesta:**
```
✅ Proyecto actualizado exitosamente

ID: 15
Status: in_progress → in_progress
Progress: 0% → 30%
Updated: 2026-03-20 15:20 UTC
```

---

### `/delete <tipo> <id>`

Elimina un recurso.

**Sintaxis:**
```
/delete <resource-type> <id>
```

**Ejemplos:**

```bash
/delete project 15
/delete task 42
/delete inbox_item 8
```

**Respuesta:**
```
⚠️ ¿Estás seguro de que quieres eliminar el proyecto #15?

Name: Dashboard v2
Status: active

[Botón: Sí, eliminar] [Botón: Cancelar]
```

**Nota:** Requiere confirmación para prevenir eliminaciones accidentales.

---

### `/list <tipo> [filtros]`

Lista recursos con filtros opcionales.

**Sintaxis:**
```
/list <resource-type> [key=value ...]
```

**Ejemplos:**

```bash
# Listar todos los proyectos
/list projects

# Listar proyectos activos
/list projects status=active

# Listar tareas pendientes
/list tasks status=todo

# Listar propiedades (Data Agent)
/list properties city=Dubai

# Listar memoria del agente
/list memory
```

**Respuesta:**
```
📋 Proyectos Activos (5)

1. Dashboard v2 (in_progress, 30%) — Updated 2h ago
2. API v3 (active, 0%) — Updated 5h ago
3. Mobile App (active, 0%) — Updated 1d ago
4. Analytics Platform (active, 0%) — Updated 3d ago
5. Marketing Website (active, 0%) — Updated 1w ago

Total: 5 proyectos
```

**Paginación automática:**
Si hay más de 20 resultados, se muestran en chunks de 20:
```
📋 Propiedades en Dubai (247)

[Primeros 20 resultados...]

Página 1 de 13
[Botón: Siguiente →]
```

---

## Conversaciones

### `/clear_history`

Borra el historial de conversación con el agente activo.

**Sintaxis:**
```
/clear_history
```

**Respuesta:**
```
⚠️ ¿Estás seguro de que quieres borrar tu historial con PM Agent?

Esta acción no se puede deshacer.

[Botón: Sí, borrar] [Botón: Cancelar]
```

**Nota:**
- Solo borra el historial del canal Telegram
- No afecta el historial del Dashboard
- Los eventos en `raw_events` se mantienen

---

### `/conversation_stats`

Muestra estadísticas de la conversación actual.

**Sintaxis:**
```
/conversation_stats
```

**Respuesta:**
```
📊 Estadísticas de Conversación

Agente: PM Agent
Canal: Telegram

📈 Mensajes:
• Total: 142 mensajes
• Tuyos: 71 mensajes
• Del agente: 71 respuestas

⏱️ Timeline:
• Primera interacción: 2026-03-15 09:00 UTC
• Última interacción: hace 30 minutos
• Duración: 5 días

💬 Actividad:
• Promedio: 28 mensajes/día
• Día más activo: 2026-03-18 (45 mensajes)
```

---

## Administración

### `/authorize <user_id>`

Autoriza a un usuario para usar el bot.

**Sintaxis:**
```
/authorize <telegram-user-id> [role]
```

**Parámetros:**
- `user_id`: Telegram user ID (número)
- `role` (opcional): `viewer` | `operator` | `admin` (default: `operator`)

**Ejemplos:**

```bash
# Autorizar como operator
/authorize 123456789

# Autorizar como admin
/authorize 123456789 admin

# Autorizar como viewer (solo lectura)
/authorize 123456789 viewer
```

**Respuesta:**
```
✅ Usuario autorizado exitosamente

User ID: 123456789
Username: @johndoe
Role: operator
Authorized by: @admin (6334755199)
```

**Permisos por rol:**

| Rol | Permisos |
|-----|----------|
| `viewer` | Solo lectura (CRUD read/list) |
| `operator` | Lectura + escritura (CRUD completo, skills) |
| `admin` | Todo + comandos de administración |

**Restricción:** Solo usuarios admin pueden ejecutar este comando.

---

### `/revoke <user_id>`

Revoca el acceso de un usuario.

**Sintaxis:**
```
/revoke <telegram-user-id>
```

**Ejemplos:**

```bash
/revoke 123456789
```

**Respuesta:**
```
⚠️ ¿Estás seguro de que quieres revocar el acceso de @johndoe?

User ID: 123456789
Role: operator

[Botón: Sí, revocar] [Botón: Cancelar]
```

**Restricción:** Solo usuarios admin pueden ejecutar este comando.

---

### `/list_users`

Lista todos los usuarios registrados.

**Sintaxis:**
```
/list_users
```

**Respuesta:**
```
👥 Usuarios Registrados (8)

✅ Autorizados (5):
1. @admin (6334755199) — admin — Activo hace 1h
2. @operator1 (123456789) — operator — Activo hace 3h
3. @viewer1 (987654321) — viewer — Activo hace 1d
4. @operator2 (111222333) — operator — Activo hace 2d
5. @viewer2 (444555666) — viewer — Activo hace 1w

❌ No autorizados (3):
1. @pending1 (777888999) — Esperando autorización
2. @pending2 (101112131) — Esperando autorización
3. @pending3 (141516171) — Esperando autorización
```

**Restricción:** Solo usuarios admin pueden ejecutar este comando.

---

## Ejemplos Avanzados

### Workflow Completo: PM Agent

```bash
# 1. Activar PM Agent
/agent pm-agent

# 2. Ver proyectos activos
/list projects status=active

# 3. Crear nuevo proyecto
/create project name="Analytics Dashboard" description="Dashboard para métricas de propiedades" status=active priority=high

# 4. Crear PRD con skill
/skill crear-prd project_id=16

# 5. Crear tareas
/create task title="Diseñar wireframes" project_id=16 status=todo priority=high
/create task title="Implementar backend API" project_id=16 status=todo priority=medium
/create task title="Crear frontend" project_id=16 status=todo priority=medium

# 6. Actualizar progreso
/update project 16 status=in_progress progress=20

# 7. Ver estadísticas
/conversation_stats
```

---

### Workflow Completo: Data Agent

```bash
# 1. Activar Data Agent
/agent data-agent

# 2. Scrapear propiedades de Dubai
/skill propertyfinder-scraper city=Dubai property_type=apartment min_price=500000 max_price=1000000

# 3. Consultar propiedades scrapeadas
/skill consultas-sql city=Dubai

# 4. Listar propiedades
/list properties city=Dubai

# 5. Ver propiedad específica
/read property 12345

# 6. Guardar última fecha de scraping
/create memory key=last_scrape_dubai value="2026-03-20T15:30:00Z"
```

---

### Workflow Completo: Content Agent

```bash
# 1. Activar Content Agent
/agent content-agent

# 2. Generar listing de propiedad
/skill generar-listing property_id=12345 target=es-ES

# 3. Guardar borrador en memoria
/create memory key=draft_listing_12345 value="{...contenido JSON...}"

# 4. Traducir a otro idioma
/skill traducir text="Luxury 2BR apartment in Marina Bay" target=es-MX

# 5. Revisar borradores guardados
/list memory
```

---

### Workflow Completo: Marketing Agent

```bash
# 1. Activar Marketing Agent
/agent marketing-agent

# 2. Planificar campaña
/skill estrategia-gtm segmento=inversores-latam canal=instagram

# 3. Crear campaña
/create project name="Campaña Instagram LATAM" description="Targeting inversores de México y Colombia" status=planning priority=high

# 4. Analizar competencia
/skill analizar-competencia competidor="Bayut"

# 5. Guardar insights
/create memory key=instagram_latam_insights value="{...insights JSON...}"
```

---

## 🔒 Seguridad y Rate Limiting

### Rate Limiting

**Límite:** 10 mensajes por minuto por usuario

**Qué cuenta como mensaje:**
- Comandos (`/skill`, `/create`, etc.)
- Mensajes de chat normal
- Callbacks de botones inline

**Qué NO cuenta:**
- Respuestas del bot
- Notificaciones automáticas

**Si excedes el límite:**
```
⏸️ Demasiados mensajes

Has enviado 10 mensajes en el último minuto.
Por favor, espera 45 segundos antes de continuar.

Próximo mensaje disponible: 15:30:45 UTC
```

---

### Input Sanitization

El bot sanitiza automáticamente todos los inputs para prevenir:
- Command injection
- SQL injection
- XSS
- Template injection

**Caracteres bloqueados:**
- `` ` `` (backticks)
- `$()` (command substitution)
- `|`, `&`, `;` (shell operators)
- `<script>` (XSS tags)

**Si envías input peligroso:**
```
⚠️ Input no válido

Tu mensaje contiene caracteres no permitidos.
Por seguridad, ha sido rechazado.

Caracteres bloqueados: ` $ ( ) | & ;
```

---

## ❓ FAQ

### ¿Cómo sé qué skills están disponibles para mi agente?

Usa `/whoami` para ver los skills del agente activo.

### ¿Puedo ejecutar un skill de otro agente sin cambiar?

No. Debes cambiar al agente con `/agent <id>` primero.

### ¿Se guardan mis conversaciones?

Sí, todas las conversaciones se guardan en PostgreSQL y persisten entre sesiones.

### ¿Cuántos mensajes se guardan?

Las conversaciones se auto-trimman a 50 mensajes si exceden 100.

### ¿Puedo ver mis conversaciones desde el Dashboard?

Sí, pero son conversaciones separadas (Telegram ≠ Dashboard).

### ¿Qué pasa si el bot no responde?

1. Verifica que el bot esté corriendo: `node tools/telegram/bot.js`
2. Revisa los logs para ver errores
3. Verifica que estés autorizado: `/list_users` (si eres admin)

### ¿Puedo usar el bot desde móvil?

Sí, Telegram funciona en móvil perfectamente. Es el canal principal para operación 24/7.

---

## 📞 Soporte

**Issues:** Reportar en el repositorio interno

**Documentación adicional:**
- [README General](./README.md)
- [Dashboard Guide](./dashboard-guide.md)
- [Quick Start](./quick-start.md)

---

**✨ ¡Empieza con `/start` en Telegram!**
