# Dashboard Web — Guía de Usuario 🌐

> Interfaz visual para operar con agentes desde el navegador

**Última actualización:** 2026-03-20

---

## 🚀 Acceso

**URL Local:** [http://localhost:3001](http://localhost:3001)

**URL Producción:** (Railway, por configurar)

---

## 📱 Interfaz Principal

### 1. Home Page

Al abrir el dashboard verás:

```
┌─────────────────────────────────────────────┐
│  🏠 EMIRALIA — AGENT COMMAND CENTER         │
├─────────────────────────────────────────────┤
│                                              │
│  📊 Dashboard  |  🤖 Agents  |  📈 Metrics  │
│                                              │
├─────────────────────────────────────────────┤
│  Sistema Multi-Agente Operativo             │
│                                              │
│  🟢 9 agentes activos                       │
│  📈 142 conversaciones hoy                  │
│  ⚡ 28 skills ejecutados                    │
│                                              │
└─────────────────────────────────────────────┘
```

---

### 2. Agents Page

Navega a **"Agents"** en la barra superior:

```
🤖 Agentes Disponibles (9)

┌─────────────────────┐  ┌─────────────────────┐
│  🧠 PM Agent        │  │  📊 Data Agent      │
│  Product Manager    │  │  Scraping & Data    │
│  [Ver Detalles]     │  │  [Ver Detalles]     │
└─────────────────────┘  └─────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐
│  ✍️ Content Agent   │  │  🌐 Translation     │
│  Content Creation   │  │  ES-EN Translation  │
│  [Ver Detalles]     │  │  [Ver Detalles]     │
└─────────────────────┘  └─────────────────────┘

[...más agentes...]
```

---

### 3. Agent Detail Page

Al hacer clic en un agente (ej: `pm-agent`):

```
┌─────────────────────────────────────────────────────┐
│  🧠 PM Agent                              [← Back]  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Tabs: [ Chat ] | Skills | Memory | Activity        │
│                                                      │
├─────────────────────────────────────────────────────┤
│  Chat Tab (activa por defecto)                      │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  📜 Conversation History                       │ │
│  │                                                 │ │
│  │  User: ¿Qué proyectos activos tenemos?        │ │
│  │  09:30 AM                                      │ │
│  │                                                 │ │
│  │  PM Agent: Actualmente tenemos 5 proyectos... │ │
│  │  09:30 AM                                      │ │
│  │                                                 │ │
│  │  [Scroll para ver más...]                     │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  💬 Type your message...                       │ │
│  │                                      [Send →]  │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 💬 Usando el Chat

### Enviar Mensaje

1. **Escribe** tu mensaje en el input inferior
2. **Presiona Enter** o haz clic en "Send"
3. El mensaje aparece inmediatamente (optimistic update)
4. El agente responde con **streaming en tiempo real**

**Shortcuts de teclado:**
- `Enter` → Enviar mensaje
- `Shift + Enter` → Nueva línea (sin enviar)
- `Esc` → Limpiar input

---

### Streaming en Tiempo Real

Cuando el agente responde, verás el texto aparecer **palabra por palabra** (SSE streaming):

```
PM Agent está escribiendo...

PM Agent: Actualmente tenemos
PM Agent: Actualmente tenemos 5
PM Agent: Actualmente tenemos 5 proyectos activos:
PM Agent: Actualmente tenemos 5 proyectos activos:

1. Dashboard
PM Agent: Actualmente tenemos 5 proyectos activos:

1. Dashboard v2
2. API v3
[...]
```

**Indicadores visuales:**
- 🟡 **Escribiendo...** — Agente está generando respuesta
- 🟢 **Completado** — Respuesta finalizada
- 🔴 **Error** — Algo falló (ver mensaje de error)

---

### Historial de Conversación

El chat carga automáticamente el historial al abrir la página:

**Características:**
- ✅ Carga últimos 50 mensajes
- ✅ Auto-scroll a mensajes nuevos
- ✅ Scroll manual para ver mensajes antiguos
- ✅ Persistencia completa (no se pierde al recargar)

**Formato de mensajes:**
```
┌─────────────────────────────────────┐
│  User                               │
│  ¿Qué proyectos tenemos?            │
│  09:30 AM                           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  PM Agent                           │
│  Tenemos 5 proyectos activos:       │
│  1. Dashboard v2 (in_progress)      │
│  2. API v3 (active)                 │
│  [...]                              │
│  09:30 AM                           │
└─────────────────────────────────────┘
```

---

### Limpiar Historial

⚠️ **Nota:** Actualmente no hay botón "Clear History" en el Dashboard UI (pending implementation).

**Workaround:**
Usa el bot de Telegram con `/clear_history` para borrar el historial del canal Telegram.

**Alternativa manual:**
```sql
DELETE FROM agent_conversations
WHERE agent_id = 'pm-agent'
AND user_id = 'dashboard-user'
AND channel = 'dashboard';
```

---

## 🗂️ Tabs del Agent Detail

### Tab: Chat (default)

Ver sección anterior [Usando el Chat](#usando-el-chat).

---

### Tab: Skills

Muestra todos los skills disponibles para el agente.

**Ejemplo para PM Agent:**

```
⚡ Skills Disponibles (8)

┌────────────────────────────────────────┐
│  crear-prd                             │
│  Genera un PRD completo para proyecto  │
│  Args: project_id                      │
│  [Ejecutar]                            │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  challenge                             │
│  Desafía una idea con preguntas duras  │
│  Args: idea                            │
│  [Ejecutar]                            │
└────────────────────────────────────────┘

[...más skills...]
```

**Acciones:**
- 🔍 **Ver detalle:** Click en skill → Muestra descripción completa
- ⚡ **Ejecutar:** Click en "Ejecutar" → Abre modal con form de argumentos
- 📋 **Copiar comando:** Copy-to-clipboard del formato Telegram `/skill <name>`

⚠️ **Nota:** Ejecución directa desde UI está pendiente (Feature 13, roadmap). Por ahora, usa el chat o Telegram.

---

### Tab: Memory

Muestra la memoria compartida del agente.

**Ejemplo para Data Agent:**

```
🧠 Memoria Compartida (12 items)

┌────────────────────────────────────────┐
│  last_scrape_dubai                     │
│  2026-03-20T15:30:00Z                  │
│  Updated: hace 2 horas                 │
│  [Edit] [Delete]                       │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  total_properties_scraped              │
│  2,847                                 │
│  Updated: hace 5 horas                 │
│  [Edit] [Delete]                       │
└────────────────────────────────────────┘

[...más items...]
```

**Acciones:**
- ➕ **Añadir memoria:** Click en "Add Memory" → Form con key/value
- ✏️ **Editar:** Click en "Edit" → Modal para modificar valor
- 🗑️ **Borrar:** Click en "Delete" → Confirmación y eliminación

⚠️ **Nota:** Interfaz de gestión de memoria está pendiente (Feature 14, roadmap). Por ahora, usa comandos CRUD de Telegram o scripts CLI.

---

### Tab: Activity

Muestra los últimos eventos del agente (de la tabla `raw_events`).

**Ejemplo:**

```
📊 Actividad Reciente (20 eventos)

⚡ hace 10 min — skill_invocation
   Skill: propertyfinder-scraper
   Args: city=Dubai
   Duration: 12.3s
   Status: success

📝 hace 15 min — agent_message
   Content: "He scrapeado 47 propiedades nuevas..."
   Channel: telegram

🔧 hace 20 min — tool_execution
   Tool: query_properties.js
   Args: {"city": "Dubai"}
   Duration: 1.2s
   Status: success

➕ hace 30 min — crud_create
   Resource: project
   ID: 16
   Status: success

[...más eventos...]
```

**Filtros disponibles:**
- 🔽 **Por tipo de evento:** tool_execution, skill_invocation, agent_message, crud_*
- 📅 **Por fecha:** Hoy, Última semana, Último mes, Custom range
- 🤖 **Por agente:** (si estás en la vista global de todos los agentes)

**Exportar:**
- 📥 **Download CSV:** Exporta los eventos filtrados a CSV
- 📥 **Download JSON:** Exporta en formato JSON

---

## 🔒 Autenticación (Producción)

### API Key Auth

En producción, el Dashboard requiere API Key para acceder a los endpoints.

**Configuración:**

```bash
# .env
DASHBOARD_API_KEY=your-secret-api-key-here
```

**Cómo funciona:**
1. Frontend incluye el API Key en el header `X-API-Key`
2. Backend valida el key antes de procesar requests
3. Si el key es inválido o falta → `401 Unauthorized`

**En desarrollo:**
Si `DASHBOARD_API_KEY` no está configurado, el auth está deshabilitado (permite desarrollo sin fricción).

---

## 🎨 Personalización

### Tema Claro/Oscuro

⚠️ **Pendiente implementación** (Feature 15, roadmap).

Por ahora, el Dashboard usa tema claro fijo.

---

### Idioma

⚠️ **Pendiente implementación** (Feature 16, roadmap).

Por ahora, el Dashboard está en español fijo.

---

## 🐛 Troubleshooting

### El chat no carga el historial

**Problema:** Al abrir el chat, no se ven mensajes previos.

**Soluciones:**
1. Verifica que el backend esté corriendo: `cd apps/dashboard && npm run dev`
2. Revisa la consola del navegador (F12) para ver errores de red
3. Verifica que la DB esté corriendo: `docker-compose ps`
4. Revisa que exista la conversación en DB:
   ```sql
   SELECT * FROM agent_conversations
   WHERE agent_id = 'pm-agent'
   AND user_id = 'dashboard-user'
   AND channel = 'dashboard';
   ```

---

### El streaming no funciona

**Problema:** Los mensajes del agente aparecen de golpe, no palabra por palabra.

**Causas comunes:**
1. **SSE bloqueado:** Algunos proxies/firewalls bloquean Server-Sent Events
2. **Browser cache:** Limpia la caché del navegador (Ctrl+Shift+R)
3. **Backend error:** Revisa logs del servidor para ver si hay errores en el stream

**Verificar SSE:**
1. Abre DevTools → Network
2. Envía un mensaje
3. Busca el request `POST /api/agents/pm-agent/chat`
4. Debe mostrar `Type: eventsource` y `Status: 200`
5. En la pestaña "EventStream" deberías ver eventos `data: {...}`

---

### Error 401 Unauthorized

**Problema:** Al enviar mensaje, error `401 Unauthorized`.

**Causa:** API Key missing o incorrecto (solo en producción).

**Solución:**
1. Verifica que `DASHBOARD_API_KEY` esté configurado en `.env`
2. Verifica que el frontend esté usando el mismo key
3. En desarrollo, puedes remover `DASHBOARD_API_KEY` de `.env` para deshabilitar auth

---

### Error 500 al enviar mensaje

**Problema:** Al enviar mensaje, error `500 Internal Server Error`.

**Solución:**
1. Revisa los logs del servidor en la terminal donde corriste `npm run dev`
2. Errores comunes:
   - **Anthropic API key inválido:** Verifica `ANTHROPIC_API_KEY` en `.env`
   - **DB connection failed:** Verifica que PostgreSQL esté corriendo
   - **Agent not found:** Verifica que el `agentId` sea válido (9 agentes disponibles)

---

## 📊 Métricas y Analytics

### Conversaciones

Ver estadísticas globales:

```
📈 Dashboard Metrics (Última semana)

Conversaciones Activas: 12
Mensajes Enviados: 847
Mensajes del Agente: 823
Promedio Mensajes/Día: 121

Agentes Más Usados:
1. PM Agent — 342 mensajes (41%)
2. Data Agent — 198 mensajes (24%)
3. Content Agent — 145 mensajes (17%)
[...]
```

⚠️ **Pendiente implementación** (Feature 17, roadmap).

Por ahora, consulta directamente en DB:

```sql
SELECT
  agent_id,
  COUNT(*) as total_messages,
  MAX(last_message_at) as last_interaction
FROM agent_conversations
WHERE channel = 'dashboard'
GROUP BY agent_id
ORDER BY total_messages DESC;
```

---

## 🚀 Próximas Features

### Fase 2 (Post-MVP)

- [ ] **Tool Execution Log Visual** — Ver tools ejecutados en tiempo real durante el chat
- [ ] **Skill Execution desde UI** — Ejecutar skills con forms en lugar de chat
- [ ] **Memory Management UI** — CRUD completo de memoria desde el dashboard
- [ ] **Clear History Button** — Botón para limpiar historial desde UI
- [ ] **Multi-User Support** — Login con email, conversaciones por usuario
- [ ] **Export Conversations** — Exportar chat a PDF/Markdown
- [ ] **Voice Input** — Dictar mensajes con Web Speech API
- [ ] **File Attachments** — Subir archivos (PDFs, imágenes) al chat
- [ ] **Markdown Rendering** — Renderizar markdown en mensajes del agente
- [ ] **Code Syntax Highlighting** — Highlight para bloques de código
- [ ] **Dark Mode** — Tema oscuro
- [ ] **i18n** — Soporte multi-idioma (ES/EN)
- [ ] **Analytics Dashboard** — Métricas de uso, gráficos, insights

---

## 📞 Soporte

**Issues:** Reportar en el repositorio interno

**Documentación adicional:**
- [README General](./README.md)
- [Comandos de Telegram](./telegram-commands.md)
- [Quick Start](./quick-start.md)

---

**✨ ¡Empieza chateando con tus agentes en [http://localhost:3001](http://localhost:3001)!**
