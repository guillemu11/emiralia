# Plan: Dashboard a Produccion + Telegram Bot 24/7

## Contexto

El dashboard funciona solo en local. El bot de Telegram solo responde cuando el PC esta encendido porque corre como `node tools/telegram/bot.js` en tu maquina. Subir a GitHub NO soluciona eso — GitHub solo aloja codigo. Necesitamos un **servidor cloud** que ejecute ambos servicios 24/7.

**Objetivo:** Desplegar dashboard + telegram bot en Railway. El website NO se despliega (no esta listo). Todo desde un solo repo en GitHub.

---

## Plataforma: Railway

- Monorepo friendly: un repo, multiples servicios
- PostgreSQL gestionado como add-on
- Deploy automatico al hacer push a GitHub
- ~$8-13/mes (Hobby plan da $5 credito gratis)

**Arquitectura en Railway:**
```
GitHub (emiralia/) --> Railway Project
  ├── Servicio: dashboard     (Express sirve API + frontend buildeado)
  ├── Servicio: telegram-bot  (node tools/telegram/bot.js, 24/7)
  └── Add-on: PostgreSQL      (compartido entre ambos)
```

---

## Fase 1: Preparar el codigo para produccion

### 1.1 Crear `.gitignore`
- Excluir: `node_modules/`, `.env`, `dist/`, `*.log`, `tmp/`, `Web-screenshots/`

### 1.2 Arreglar API_URL hardcodeada (15 archivos)
- **Problema:** `const API_URL = 'http://localhost:3001/api'` hardcodeado en App.jsx y 14 archivos mas
- **Solucion:** Crear `apps/dashboard/src/api.js`:
  ```js
  export const API_URL = (import.meta.env.VITE_API_URL ?? '') + '/api';
  ```
- Reemplazar la constante local en los 15 archivos por `import { API_URL } from '../api.js'`
- En produccion `VITE_API_URL` sera vacio → URLs relativas (`/api/projects`)
- En local el proxy de Vite redirige `/api` a `localhost:3001`

**Archivos a modificar:**
- `apps/dashboard/src/App.jsx`
- `apps/dashboard/src/components/` — BrainstormPanel, InboxPanel, PMAgentChat, PipelineBoard, WeeklyReport
- `apps/dashboard/src/pages/` — AgentDetail, AuditLog, CollaborationHub, DailyStandup, DepartmentDetail, IntelligenceHub, PmReports, WeeklyBoard, WorkspaceOverview

### 1.3 server.js: servir frontend en produccion
Anadir a `apps/dashboard/server.js`:
- `express.static('dist')` para servir los archivos buildeados
- Catch-all SPA: cualquier ruta no-API devuelve `index.html`
- Solo activo cuando `NODE_ENV=production`

### 1.4 Nuevo Dockerfile multi-stage
Reemplazar el Dockerfile actual (que ejecuta `npm run dev`) por:
- **Stage 1 (builder):** Instala deps + `vite build` → genera `dist/`
- **Stage 2 (runtime):** Solo copia lo necesario + ejecuta `node apps/dashboard/server.js`
- Build context desde raiz del repo (para que `../../tools/` funcione)

### 1.5 Proxy en vite.config.js para dev local
```js
proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } }
```
Asi en local tambien funcionan URLs relativas sin necesitar `.env.local`.

---

## Fase 2: Git + GitHub

```bash
git init
git add .gitignore apps/ tools/ package.json package-lock.json docker-compose.yml .claude/ .env.example
# NO anadir: .env, node_modules, dist, tmp*, Web-screenshots
git commit -m "chore: initial commit - emiralia monorepo"
```

Luego crear repo en GitHub (privado recomendado) y push:
```bash
git remote add origin https://github.com/<TU_USERNAME>/emiralia.git
git branch -M main
git push -u origin main
```

---

## Fase 3: Configurar Railway

### 3.1 PostgreSQL
- Anadir add-on PostgreSQL en Railway
- Aplicar schema: copiar `tools/db/schema.sql` + `tools/db/seed.sql` en la pestana Query de Railway

### 3.2 Servicio Dashboard
- Repo: emiralia | Dockerfile: `apps/dashboard/Dockerfile` | Root: `/`
- Puerto: 3001
- Generar dominio publico (ej: `emiralia-dashboard.up.railway.app`)
- Variables de entorno:

| Variable | Valor |
|----------|-------|
| `PG_HOST` | `${{Postgres.PGHOST}}` |
| `PG_PORT` | `${{Postgres.PGPORT}}` |
| `PG_DB` | `${{Postgres.PGDATABASE}}` |
| `PG_USER` | `${{Postgres.PGUSER}}` |
| `PG_PASSWORD` | `${{Postgres.PGPASSWORD}}` |
| `ANTHROPIC_API_KEY` | tu key |
| `NODE_ENV` | `production` |
| `DASHBOARD_PORT` | `3001` |

### 3.3 Servicio Telegram Bot
- Repo: emiralia | Start command: `node tools/telegram/bot.js` | Root: `/`
- SIN puerto (usa long polling, no HTTP)
- Mismas vars de DB + `TELEGRAM_BOT_TOKEN` + `OPENAI_API_KEY` + `ANTHROPIC_API_KEY`

---

## Fase 4: Verificacion

1. Abrir la URL publica del dashboard → carga el React SPA
2. DevTools > Network → las llamadas van a `/api/projects` (relativas, no localhost)
3. Los proyectos cargan correctamente (DB conectada)
4. Enviar mensaje al bot en Telegram → responde (aunque tu PC este apagada)
5. Crear proyecto via Telegram → aparece en el dashboard (DB compartida)

---

## Resumen de archivos a crear/modificar

| Archivo | Accion |
|---------|--------|
| `.gitignore` | Crear |
| `apps/dashboard/src/api.js` | Crear (export API_URL) |
| `apps/dashboard/src/App.jsx` | Modificar (import API_URL) |
| `apps/dashboard/src/components/*.jsx` (5) | Modificar (import API_URL) |
| `apps/dashboard/src/pages/*.jsx` (9) | Modificar (import API_URL) |
| `apps/dashboard/server.js` | Modificar (static + catch-all) |
| `apps/dashboard/Dockerfile` | Reemplazar (multi-stage production) |
| `apps/dashboard/vite.config.js` | Modificar (proxy dev) |

**Total: 19 archivos** (2 nuevos, 17 modificados)

---

## Coste estimado

| Servicio | Coste/mes |
|----------|-----------|
| Dashboard (always-on) | ~$5 |
| Telegram Bot (always-on) | ~$3 |
| PostgreSQL | ~$5 |
| **Total** | **~$8-13** |
