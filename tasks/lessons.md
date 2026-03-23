# Lecciones Aprendidas — Emiralia

Documento vivo. Cada agente registra aquí las lecciones derivadas de correcciones del usuario.
**Regla:** Después de CUALQUIER corrección → añadir entrada. No esperar. El agente responsable escribe la lección.

## 2026-03-23 content-agent — inbox_items source CHECK constraint no acepta 'campaign_manager'

**Corrección:** El endpoint `POST /api/campaigns/items/:itemId/submit-review` insertaba `source = 'campaign_manager'` en `inbox_items`, pero la tabla tiene `CHECK (source IN ('telegram', 'dashboard', 'agent'))`.
**Patrón a evitar:** Nunca usar valores de source en inbox_items fuera de los tres permitidos. Para inserciones desde agentes o sistemas automatizados usar siempre `source = 'agent'`.
**Cómo aplicar:** En cualquier route que inserte en `inbox_items`, verificar que el valor de `source` pertenece a `('telegram', 'dashboard', 'agent')` antes de ejecutar el INSERT. El fix fue cambiar `'campaign_manager'` por `'agent'` en `routes/campaigns.js` línea 483.

## 2026-03-23 content-agent — Secuencia SERIAL de PostgreSQL avanza aunque falle la constraint CHECK

**Corrección:** Al fallar un INSERT por CHECK constraint, PostgreSQL ya habia consumido el siguiente valor de la secuencia. Al reintentar, el `nextval` asignaba IDs que colisionaban con filas existentes de otra sesión/reinicio del servidor.
**Patrón a evitar:** Tras un error en INSERT con columna SERIAL, resetear la secuencia antes de reintentar: `SELECT setval('tabla_id_seq', (SELECT MAX(id) FROM tabla))`.
**Cómo aplicar:** Si se detecta `duplicate key value violates unique constraint "<tabla>_pkey"` en un INSERT que no especifica ID explícito, ejecutar el reset de secuencia antes de los reintentos.

**Formato:**
```
## [FECHA] [agente-id] — [descripción corta]
**Corrección:** qué hizo mal el agente
**Patrón a evitar:** la regla derivada en positivo o negativo
**Cómo aplicar:** cuándo y dónde aplica esta lección
```

---

<!-- Las lecciones se añaden debajo de esta línea, la más reciente primero -->

## 2026-03-23 pm-agent — Agentes definidos en .md no aparecían en el dashboard

**Corrección:** Se crearon 4 agentes con su `.md` en `.claude/agents/` (legal, seo, social-media, analytics) pero nunca se añadieron a `tools/db/seed_agents.js`, por lo que no existían en la DB y no aparecían en el dashboard.
**Patrón a evitar:** Al crear un agente nuevo (fichero `.md` en `.claude/agents/`), NO asumir que ya existe en la DB. El dashboard lee de PostgreSQL, no de los ficheros.
**Cómo aplicar:** Siempre que se cree o detecte un agente nuevo → verificar inmediatamente que está en `tools/db/seed_agents.js`. Si no está, añadirlo y ejecutar `node tools/db/seed_agents.js`. Este paso es parte del checklist de creación de agente, no opcional.
