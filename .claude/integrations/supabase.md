# Supabase — Integration

**Status:** ⚠️ Planned (Not Yet Integrated)

**Service:** Supabase (PostgreSQL + Auth + Storage + Realtime)

---

## Overview

Supabase is planned as the **production database** for Emiralia's B2B platform, replacing Railway PostgreSQL when we launch the developer portal.

**Why Supabase:**
- **Free tier:** 500MB DB + 1GB bandwidth (sufficient for MVP)
- **Instant APIs:** Auto-generated REST + GraphQL endpoints
- **Auth built-in:** Row-Level Security (RLS) for multi-tenant B2B
- **Realtime:** Live property updates via websockets
- **Storage:** S3-compatible for property images

**Current Status:**
- PostgreSQL on Railway (active)
- Migration to Supabase: **Q2 2026** (after B2B portal design)

---

## Planned Schema

### Tables

**B2C (Current — will migrate):**
- `properties` — scraped properties
- `agents` — agent registry
- `agent_memory` — WAT Memory
- `skill_invocations` — activity tracking
- `projects` — PM Agent projects
- `research` — Research Agent findings

**B2B (New — Supabase-only):**
- `developers` — verified developers (Emaar, Damac, etc.)
- `developer_properties` — properties owned by developers
- `leads` — buyer leads from platform
- `subscriptions` — developer subscriptions (Freemium, Pro, Enterprise)
- `analytics` — developer dashboard analytics

---

## Authentication (Planned)

### Row-Level Security (RLS)

**Use Case:** Developers can only see their own properties and leads.

```sql
-- Example RLS Policy
CREATE POLICY "Developers can only view their properties"
ON developer_properties
FOR SELECT
USING (auth.uid() = developer_id);

CREATE POLICY "Developers can only view their leads"
ON leads
FOR SELECT
USING (auth.uid() IN (
  SELECT developer_id FROM developer_properties WHERE id = leads.property_id
));
```

### Auth Flow (Planned)

```
Developer signup (developer.emiralia.com)
  ↓
Supabase Auth (email/password or OAuth)
  ↓
Auto-create row in `developers` table (trigger)
  ↓
Developer sees dashboard with RLS-filtered data
```

---

## Realtime (Planned)

**Use Case:** Live property updates on developer dashboard.

```javascript
// Example: Listen for new leads
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

supabase
  .channel('leads')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'leads' },
    (payload) => {
      console.log('New lead:', payload.new);
      // Update dashboard UI
    }
  )
  .subscribe();
```

---

## Storage (Planned)

**Use Case:** Property images uploaded by developers.

**Buckets:**
- `property-images` — public (CDN-served)
- `developer-assets` — private (logos, contracts)

```javascript
// Example: Upload property image
const { data, error } = await supabase.storage
  .from('property-images')
  .upload(`${propertyId}/hero.jpg`, file);
```

---

## Migration Plan

### Phase 1: Dual Write (Q2 2026)
- Keep Railway PostgreSQL as primary
- Write to Supabase in parallel
- Validate data consistency

### Phase 2: Read from Supabase (Q2 2026)
- Dashboard reads from Supabase
- Background jobs still read from Railway
- Monitor performance

### Phase 3: Full Cutover (Q3 2026)
- Supabase becomes primary
- Railway PostgreSQL deprecated
- Remove dual-write logic

---

## Configuration (When Ready)

### Environment Variables

```bash
# .env
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Admin access
```

### Client Setup

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Query properties
const { data, error } = await supabase
  .from('properties')
  .select('*')
  .eq('location', 'Dubai Marina')
  .limit(10);
```

---

## Cost (Free Tier)

| Resource | Free Tier | Estimated Usage (MVP) | Cost |
|----------|-----------|----------------------|------|
| **Database** | 500MB | ~300MB | Free ✅ |
| **Bandwidth** | 1GB/mo | ~500MB/mo | Free ✅ |
| **Storage** | 1GB | ~200MB (images) | Free ✅ |
| **Auth Users** | 50K MAU | ~100 developers | Free ✅ |
| **Realtime** | 200 concurrent | ~50 concurrent | Free ✅ |

**Upgrade Threshold:** 500MB DB (estimated Q3 2026)
- **Pro Plan:** $25/mo → 8GB DB + 50GB bandwidth

---

## Related Components

**Will Use Supabase:**
- [[developer-portal]] (planned) — B2B dashboard for developers
- [[sales-agent]] (planned) — lead management
- [[customer-success-agent]] (planned) — onboarding

**Migration Tools (To Build):**
- `tools/supabase/migrate-from-railway.js` — one-time migration
- `tools/supabase/sync-agent-memory.js` — WAT Memory migration
- `tools/supabase/validate-migration.js` — data consistency check

---

## Documentation

- **Supabase Docs:** https://supabase.com/docs
- **Auth:** https://supabase.com/docs/guides/auth
- **Realtime:** https://supabase.com/docs/guides/realtime
- **Storage:** https://supabase.com/docs/guides/storage
- **Pricing:** https://supabase.com/pricing