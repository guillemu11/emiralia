# Plan 1: Migración Docker Local → Supabase + Vercel

## Contexto

Emiralia corre 100% local con Docker (PostgreSQL + Redis + API + Dashboard). Si el PC se apaga, todo se cae. No hay git inicializado, así que cambiar de ordenador = perder el proyecto. Esta migración resuelve ambos problemas: DB siempre online en Supabase, website público en Vercel, y código respaldado en GitHub.

**Coste total: $0** — todo en free tiers (Supabase + Vercel + GitHub).

---

## Fase 1 — Git + GitHub (prerequisito)

1. **Crear `.gitignore`** en la raíz con: `node_modules/`, `.env`, `dist/`, `tmp/`, imágenes temporales
2. **`git init`** + primer commit con el código fuente
3. **`gh repo create emiralia --private`** + push a GitHub

---

## Fase 2 — Crear proyecto Supabase y migrar esquema

4. **Crear proyecto Supabase** via MCP (`mcp__claude_ai_Supabase__create_project`, región `eu-central-1`)
5. **Agregar extensión** `btree_gist` al inicio de `tools/db/schema.sql` (necesaria para el índice GIST espacial de properties)
6. **Aplicar schema** en Supabase via MCP (`apply_migration` con contenido de `schema.sql`)
7. **Aplicar seed** via MCP (`execute_sql` con contenido de `seed.sql`)
8. **Obtener credenciales** de conexión (host, password)

---

## Fase 3 — Actualizar conexiones de DB (8 archivos)

9. **Actualizar `.env`** con credenciales de Supabase:
   ```
   PG_HOST=db.[REF].supabase.co
   PG_PORT=5432
   PG_DB=postgres
   PG_USER=postgres
   PG_PASSWORD=[password]
   PG_SSL=true
   ```

10. **Modificar `tools/db/pool.js`** — Agregar SSL, cambiar defaults:
    ```js
    ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false }
    ```
    El condicional `PG_SSL` permite volver a local si se necesita.

11. **Modificar los 7 archivos con pools independientes** (mismo patrón SSL):
    - `apps/api/src/index.js`
    - `apps/dashboard/server.js`
    - `tools/db/save_project.js`
    - `tools/apify_propertyfinder.js`
    - `tools/fetch_dataset.js`
    - `tools/telegram/bot.js`
    - `tools/check_db_full.js` / `tools/check_db_count.js`

---

## Fase 4 — Deploy website a Vercel

12. **Deploy `apps/website/`** a Vercel (es 100% estático, sin DB, sin API)
    - Via CLI: `npx vercel` desde `apps/website/`
    - O via GitHub: importar repo → root directory `apps/website` → framework Vite
    - No requiere variables de entorno

---

## Fase 5 — Simplificar Docker

13. **Reducir `docker-compose.yml`** a solo Redis:
    - Eliminar: postgres, adminer, api, dashboard
    - Mantener: redis (el API lo requiere en startup)

---

## Fase 6 — Verificación

14. **Test conexión DB:**
    ```bash
    node -e "import pool from './tools/db/pool.js'; const r = await pool.query('SELECT COUNT(*) FROM agents'); console.log(r.rows[0].count); await pool.end();" --input-type=module
    ```
15. **Test API:** `docker compose up redis -d` → `node apps/api/src/index.js` → `curl localhost:3001/api/agents`
16. **Test tools CLI:** `node tools/db/memory.js list pm-agent`
17. **Test Vercel:** abrir URL asignada, verificar ambas páginas (index + desarrolladores)
18. **Commit final** con todos los cambios de migración

---

## Archivos críticos

| Archivo | Cambio |
|---------|--------|
| `.gitignore` | CREAR |
| `tools/db/pool.js` | Agregar SSL + cambiar defaults |
| `tools/db/schema.sql` | Agregar `CREATE EXTENSION btree_gist` al inicio |
| `apps/api/src/index.js` | Agregar SSL al pool |
| `apps/dashboard/server.js` | Agregar SSL al pool |
| `tools/db/save_project.js` | Agregar SSL al pool |
| `tools/apify_propertyfinder.js` | Agregar SSL al pool |
| `tools/fetch_dataset.js` | Agregar SSL al pool |
| `tools/telegram/bot.js` | Agregar SSL al pool |
| `docker-compose.yml` | Reducir a solo Redis |
| `.env` | Credenciales Supabase |

---

## Notas

- **Supabase free tier** pausa proyectos tras 7 días sin queries. Si pasa, se reactiva desde el dashboard.
- **Redis** se mantiene local porque el API crashea sin él. Opcionalmente se puede hacer la conexión tolerante a fallos, pero es un cambio separado.
- El **dashboard y API siguen corriendo localmente**, pero contra Supabase cloud. Para ponerlos en la nube (Vercel/Railway) se necesita otro paso futuro.
- **Coste: $0** — todo en free tiers (Supabase + Vercel + GitHub).
