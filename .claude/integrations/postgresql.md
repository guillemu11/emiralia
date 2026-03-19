# PostgreSQL — Integration

**Status:** ✅ Connected

**Service:** Local Docker instance + Railway cloud DB

---

## Overview

PostgreSQL is the core database for Emiralia, storing:
- **Properties** scraped from PropertyFinder, PanicSelling
- **WAT Memory** (agent coordination via key-value storage)
- **Skill Invocations** (activity tracking)
- **Projects** (PM Agent project management)
- **Research** (Research Agent findings)

---

## Configuration

### Local (Development)

**Docker Compose:**
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: emiralia
      POSTGRES_USER: gmunoz02
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

**Environment Variables:**
```bash
# .env
DATABASE_URL=postgresql://gmunoz02:${POSTGRES_PASSWORD}@localhost:5432/emiralia
```

### Production (Railway)

**Environment Variables:**
```bash
# Railway auto-injects these
DATABASE_URL=postgresql://...@railway.app/railway
PGHOST=...
PGPORT=5432
PGUSER=postgres
PGPASSWORD=...
PGDATABASE=railway
```

---

## Health Check

### Local
```bash
# Check if Docker container is running
docker ps | grep postgres

# Test connection
node -e "
import pool from './tools/db/pool.js';
const result = await pool.query('SELECT NOW()');
console.log('✅ Connected:', result.rows[0]);
await pool.end();
" --input-type=module
```

### Railway
```bash
# Check deployment status
# (Railway dashboard or CLI)

# Test remote connection
node -e "
import pool from './tools/db/pool.js';
const result = await pool.query('SELECT COUNT(*) FROM properties');
console.log('✅ Properties:', result.rows[0].count);
await pool.end();
" --input-type=module
```

---

## Schema

**Core Tables:**
- `properties` — scraped properties (id, title, price, location, broker, etc.)
- `agent_memory` — WAT Memory (agent_id, key, value, scope)
- `skill_invocations` — activity tracking (id, agent_id, skill_name, domain, status, timestamp)
- `projects` — PM Agent projects (id, title, status, owner, start_date, eta)
- `research` — Research Agent findings (id, source, title, impact, created_at)
- `agents` — registered agents (id, name, role, department)

**Initialization:**
```bash
node tools/db/init_db.js
```

---

## Common Issues

### Issue: Connection Refused (Local)
**Symptoms:** `ECONNREFUSED 127.0.0.1:5432`

**Solution:**
```bash
# Start Docker container
docker-compose up -d

# Verify
docker ps | grep postgres
```

### Issue: Sequences Out of Sync
**Symptoms:** Duplicate key errors after manual inserts

**Solution:**
```bash
node tools/db/fix-sequences.js
```

### Issue: Migration Needed
**Symptoms:** Table/column doesn't exist

**Solution:**
```bash
# Run migrations
node tools/db/run-migrations-railway.js
```

---

## Related Components

**Used By:**
- [[data-agent]] — queries properties, saves scrape results
- [[pm-agent]] — saves projects, queries skill stats
- [[research-agent]] — saves research findings
- [[wat-auditor-agent]] — audits memory consistency
- All agents — read/write WAT Memory via [[memory.js]] and [[wat-memory.js]]

**Tools:**
- [[tools/db/pool.js]] — connection pool singleton
- [[tools/db/memory.js]] — WAT Memory read/write
- [[tools/db/wat-memory.js]] — cross-agent coordination
- [[tools/db/query_properties.js]] — property queries
- [[tools/db/save_project.js]] — project management

**Workflows:**
- [[data-intelligence]] — stores scraped properties
- [[scrape_propertyfinder]] — inserts properties daily
- [[sprint-planning]] — queries project status

---

## Documentation

- **Official Docs:** https://www.postgresql.org/docs/15/
- **Railway Guide:** https://docs.railway.app/databases/postgresql
- **Node.js Driver (pg):** https://node-postgres.com/