# Railway — Integration

**Status:** ✅ Deployed

**Service:** Railway (cloud deployment platform)

---

## Overview

Railway hosts Emiralia's production services:
- **Telegram Bot** (`tools/telegram/bot.js`) — 24/7 uptime for agent command center
- **PostgreSQL Database** — cloud instance with auto-backups
- **Dashboard API** (planned) — REST API for web dashboard

**Why Railway:**
- Zero-config deployments
- Auto-scaling
- Free $5/month credits (enough for bot + small DB)
- Built-in PostgreSQL with connection pooling

---

## Configuration

### Project Structure

```bash
emiralia/
├── railway.json         # Railway config
├── Procfile            # Start commands
└── tools/
    └── telegram/
        └── bot.js      # Main bot server
```

### Environment Variables (Railway Dashboard)

**Required:**
```bash
TELEGRAM_BOT_TOKEN=7891234567:AAH...
TELEGRAM_CHAT_ID=123456789
DATABASE_URL=postgresql://postgres:...@containers-us-west-123.railway.app:5432/railway
APIFY_API_TOKEN=apify_api_...
NODE_ENV=production
```

**Auto-Injected by Railway:**
```bash
PGHOST=containers-us-west-123.railway.app
PGPORT=5432
PGUSER=postgres
PGPASSWORD=...
PGDATABASE=railway
```

### Deployment Config

**railway.json:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node tools/telegram/bot.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Procfile:**
```
web: node tools/telegram/bot.js
```

---

## Health Check

### Deployment Status

```bash
# Check deployment status (via Railway CLI)
railway status

# View logs
railway logs --tail

# Check recent deployments
railway deployments
```

### Database Health

```bash
# Test DB connection from local
node -e "
import { Client } from 'pg';
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const res = await client.query('SELECT COUNT(*) FROM properties');
console.log('✅ Properties:', res.rows[0].count);
await client.end();
" --input-type=module
```

### Bot Health

```bash
# Check if bot is responding
curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates | jq '.result[-1]'

# Send test message
# Message @emiralia_bot: /agents
# Should receive agent list
```

---

## Deployment Workflow

### Initial Deploy

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy
git push  # Railway auto-deploys on push to main
```

### Update Deployment

```bash
# Any push to main triggers auto-deploy
git add .
git commit -m "feat: update bot"
git push

# View deployment logs
railway logs --tail
```

### Rollback

```bash
# List deployments
railway deployments

# Redeploy previous version
railway redeploy <deployment-id>
```

---

## Database (PostgreSQL)

### Connection

**From Railway Services:**
- Use `DATABASE_URL` (auto-injected)

**From Local:**
- Copy `DATABASE_URL` from Railway dashboard
- Add to `.env.local`

### Backups

**Railway Auto-Backups:**
- Daily snapshots (retained 7 days on free plan)
- Manual backups: Railway Dashboard → Database → Backups → Create

**Manual Backup:**
```bash
# Dump DB
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20260319.sql
```

---

## Monitoring

### Logs

```bash
# Real-time logs
railway logs --tail

# Filter errors
railway logs | grep ERROR

# Filter specific service
railway logs --service telegram-bot
```

### Metrics (Railway Dashboard)

- **CPU Usage:** should be < 10% for bot
- **Memory:** should be < 100MB
- **Network:** inbound spikes during scraping

### Alerts

**Setup:**
1. Railway Dashboard → Settings → Notifications
2. Add email/Slack webhook
3. Configure alerts:
   - Deployment failures
   - High CPU/memory
   - Database connection errors

---

## Common Issues

### Issue: Deployment Failed
**Symptoms:** Red deployment in Railway dashboard

**Solution:**
```bash
# Check build logs
railway logs

# Common causes:
# - Missing env vars → add in Railway dashboard
# - Syntax error → check git commit
# - Dependency issue → verify package.json
```

### Issue: Bot Not Starting
**Symptoms:** Deployment succeeds but bot doesn't respond

**Solution:**
```bash
# Check start command
railway logs | grep "Bot started"

# Verify Procfile
cat Procfile

# Should be: web: node tools/telegram/bot.js
```

### Issue: Database Connection Timeout
**Symptoms:** `ETIMEDOUT` or `ECONNREFUSED`

**Solution:**
```bash
# Check DATABASE_URL is set
railway variables

# Test connection
node tools/db/pool.js

# Verify DB is running
railway status --service postgres
```

### Issue: Out of Compute Credits
**Symptoms:** Services stopped, Railway email notification

**Solution:**
- Upgrade to Hobby plan ($5/mo)
- Or optimize:
  - Reduce scraping frequency
  - Use Railway only for bot (move DB to Supabase free tier)

---

## Cost Optimization

| Resource | Free Tier | Current Usage | Cost |
|----------|-----------|---------------|------|
| **Compute** | $5/mo credit | ~$2/mo (bot 24/7) | Free |
| **Database** | 512MB RAM | ~200MB used | Free |
| **Bandwidth** | 100GB/mo | ~1GB/mo | Free |
| **Total** | $5/mo credit | ~$2-3/mo | **Free** ✅ |

**Optimization Tips:**
- Keep bot lightweight (no heavy processing)
- Use Apify for scraping (don't run scrapers on Railway)
- Offload analytics to local (don't query DB constantly)

---

## Related Components

**Deployed Services:**
- [[telegram]] bot — 24/7 agent command center
- [[postgresql]] database — cloud instance

**Tools:**
- [[tools/telegram/bot.js]] — main deployed service
- [[tools/db/run-migrations-railway.js]] — DB migration script for Railway

**Workflows:**
- [[scrape_propertyfinder]] — triggers Railway bot for daily scrape notifications

---

## Documentation

- **Railway Docs:** https://docs.railway.app/
- **Railway CLI:** https://docs.railway.app/develop/cli
- **PostgreSQL on Railway:** https://docs.railway.app/databases/postgresql
- **Pricing:** https://railway.app/pricing