# Plan Final: Emiralia a Producción — Todo en Railway

## Contexto

Emiralia corre 100% local con Docker. Si el PC se apaga, todo se cae. No hay git. Este plan pone todo en la nube con Railway como única plataforma.

**Hallazgo clave:** `apps/dashboard/server.js` ya ES el API server completo (tiene todas las rutas `/api/*`). `apps/api/src/index.js` es un duplicado viejo. En producción solo necesitamos `dashboard/server.js`.

---

## Arquitectura Target

```
GitHub (emiralia — repo privado)
  │
  └── Railway (~$16/mo)
        ├── PostgreSQL (add-on, compartido por todo)
        ├── dashboard (Express: React build + API /api/*)
        ├── telegram-bot (node tools/telegram/bot.js, 24/7)
        └── website (estático, Vite build, Nixpacks)
```

**Coste: ~$16/mes**

- Railway PostgreSQL: ~$5/mo
- Railway dashboard: ~$5/mo
- Railway telegram-bot: ~$3/mo
- Railway website: ~$3/mo

**Ventajas:**
- Una sola plataforma para todo (compute + DB + website)
- Misma red, ~0ms latencia entre servicios
- Un dashboard, un billing, deploy automático al push

---

## Fase 1 — Git + GitHub (prerequisito)

1. Crear `.gitignore` (node_modules, .env, dist, tmp, Web-screenshots, *.log)
2. `git init` + primer commit
3. `gh repo create emiralia --private` + push

---

## Fase 2 — SSL en todos los pools (7 archivos)

Agregar a cada `new Pool({...})`:
```js
ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false }
```

El condicional `PG_SSL=false` permite seguir usando Docker local sin SSL.

| Archivo | Tipo |
|---------|------|
| `tools/db/pool.js` | Pool compartido (arregla 10+ tools automáticamente) |
| `apps/dashboard/server.js` | Pool inline |
| `apps/api/src/index.js` | Pool inline (para uso local) |
| `tools/db/save_project.js` | Pool inline |
| `tools/fetch_dataset.js` | Pool inline |
| `tools/telegram/bot.js` | Pool inline |
| `tools/apify_propertyfinder.js` | Pool inline |

---

## Fase 3 — Fix API_URL hardcodeada (16 archivos)

4. Crear `apps/dashboard/src/api.js`:
```js
export const API_URL = (import.meta.env.VITE_API_URL ?? '') + '/api';
```

5. Reemplazar `const API_URL = 'http://localhost:3001/api'` por `import { API_URL } from '../api.js'` en **15 archivos**:
   - `App.jsx`
   - 5 components: BrainstormPanel, InboxPanel, PipelineBoard, PMAgentChat, WeeklyReport
   - 9 pages: AgentDetail, AuditLog, CollaborationHub, DailyStandup, DepartmentDetail, IntelligenceHub, PmReports, WeeklyBoard, WorkspaceOverview

6. Agregar proxy en `apps/dashboard/vite.config.js`:
```js
proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } }
```

---

## Fase 4 — Dashboard production-ready

7. Modificar `apps/dashboard/server.js` — servir React build cuando `NODE_ENV=production`:
   - `express.static('dist')` para archivos buildeados
   - Catch-all SPA: rutas no-API devuelven `index.html`

8. Reemplazar `apps/dashboard/Dockerfile` con multi-stage:
   - Stage 1 (builder): `npm install` + `vite build` → genera `dist/`
   - Stage 2 (runtime): copia `dist/`, `server.js`, `tools/` → ejecuta `node server.js`
   - Build context desde raíz del repo (para que `../../tools/` funcione)

---

## Fase 5 — Railway

9. Crear proyecto Railway + add-on PostgreSQL

10. Aplicar schema en Railway PostgreSQL:
    - Agregar `CREATE EXTENSION IF NOT EXISTS btree_gist;` al inicio de `tools/db/schema.sql`
    - Ejecutar schema.sql + seed.sql en la pestaña Query de Railway

11. **Servicio dashboard:**
    - Dockerfile: `apps/dashboard/Dockerfile`, root `/`
    - Puerto: 3001, dominio público (ej: `emiralia-dashboard.up.railway.app`)
    - Variables de entorno:

    | Variable | Valor |
    |----------|-------|
    | `PG_HOST` | `${{Postgres.PGHOST}}` |
    | `PG_PORT` | `${{Postgres.PGPORT}}` |
    | `PG_DB` | `${{Postgres.PGDATABASE}}` |
    | `PG_USER` | `${{Postgres.PGUSER}}` |
    | `PG_PASSWORD` | `${{Postgres.PGPASSWORD}}` |
    | `PG_SSL` | `true` |
    | `ANTHROPIC_API_KEY` | tu key |
    | `NODE_ENV` | `production` |
    | `DASHBOARD_PORT` | `3001` |

12. **Servicio telegram-bot:**
    - Start: `node tools/telegram/bot.js`, sin puerto (long polling)
    - Variables: mismas de DB + `TELEGRAM_BOT_TOKEN` + `OPENAI_API_KEY` + `ANTHROPIC_API_KEY`

13. **Servicio website:**
    - Repo: emiralia, root directory: `apps/website`
    - Build: Nixpacks (auto-detecta Vite)
    - Puerto: 5173 (o el que Vite genere en `npm run preview`)
    - Dominio público (ej: `emiralia.up.railway.app`)
    - Sin variables de entorno (100% estático)
    - Start command: `npm run build && npm run preview -- --host 0.0.0.0`

---

## Fase 7 — Simplificar Docker local

14. Reducir `docker-compose.yml` a solo Redis (eliminar postgres, api, dashboard, adminer)
15. Actualizar `.env` local con credenciales Railway PostgreSQL + `PG_SSL=true`

**Dev local después del plan:**
```bash
docker compose up redis -d          # solo si testeas apps/api/
cd apps/dashboard && npm run dev    # Vite en puerto 4000 con proxy
node apps/dashboard/server.js       # Express API en puerto 3001, conecta a Railway PG
```

---

## Fase 8 — Verificación

- [ ] `node tools/db/memory.js list pm-agent` → conecta a Railway PG
- [ ] `node apps/dashboard/server.js` + `curl localhost:3001/api/agents` → responde
- [ ] `npm run dev` en dashboard → Network tab muestra `/api/...` (no localhost)
- [ ] URL Railway → dashboard carga React SPA con datos
- [ ] Mensaje a bot en Telegram → responde con PC apagado
- [ ] Crear proyecto en Telegram → aparece en dashboard Railway (misma DB)
- [ ] URL Railway website → landing page y página desarrolladores cargan correctamente

---

## Resumen de cambios

| Archivo | Acción |
|---------|--------|
| `.gitignore` | CREAR |
| `tools/db/schema.sql` | Agregar btree_gist extension |
| `tools/db/pool.js` | Agregar SSL |
| `apps/dashboard/server.js` | SSL + static serving + SPA catch-all |
| `apps/api/src/index.js` | SSL |
| `tools/db/save_project.js` | SSL |
| `tools/fetch_dataset.js` | SSL |
| `tools/telegram/bot.js` | SSL |
| `tools/apify_propertyfinder.js` | SSL |
| `apps/dashboard/src/api.js` | CREAR (API_URL central) |
| `apps/dashboard/src/App.jsx` | Import API_URL |
| `apps/dashboard/src/components/*.jsx` (5) | Import API_URL |
| `apps/dashboard/src/pages/*.jsx` (9) | Import API_URL |
| `apps/dashboard/vite.config.js` | Agregar proxy |
| `apps/dashboard/Dockerfile` | REEMPLAZAR (multi-stage) |
| `docker-compose.yml` | Reducir a solo Redis |
| `.env` | Credenciales Railway PG |

**Total: 3 nuevos, 24 modificados**

---

## Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| Nixpacks no encuentra deps del bot | Verificar que root `package.json` tiene telegraf, openai, etc. |
| GIST index falla en Railway PG | btree_gist extension al inicio del schema |
| `server.js` importa `../../tools/` | Dockerfile copia `tools/` al path correcto en el contenedor |
