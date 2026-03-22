# Lecciones Aprendidas — Emiralia

Documento vivo. Cada agente registra aquí las lecciones derivadas de correcciones del usuario.
**Regla:** Después de CUALQUIER corrección → añadir entrada. No esperar. El agente responsable escribe la lección.

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
