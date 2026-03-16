# Railway Deployment - Emiralia

## Architecture

Emiralia uses a monorepo structure with two Railway services:

| Service | Type | Framework | Port | Dockerfile | Config |
|---------|------|-----------|------|------------|--------|
| **website** | Static Site | Vite + Nginx | 80 | `apps/website/Dockerfile` | `apps/website/railway.toml` |
| **dashboard** | API + SPA | Express + React | 3001 | `apps/dashboard/Dockerfile` | `apps/dashboard/railway.toml` |

## Service Configuration

### Website Service

**Purpose:** Static marketing website with property listings

**Tech Stack:**
- Build: Vite + TailwindCSS + PostCSS
- Runtime: Nginx Alpine
- Output: Multi-page HTML app (11 pages)

**Railway Settings:**
- Root Directory: `apps/website`
- Builder: DOCKERFILE
- Dockerfile Path: `Dockerfile`
- Port: 80
- Healthcheck: `/`

**Build Process:**
1. Stage 1: Node.js builds website with `npm run build` → `dist/`
2. Stage 2: Nginx serves static files from `dist/`

**Pages served:**
- `/` (index.html)
- `/propiedades.html`, `/propiedades-v2.html`
- `/propiedad.html`
- `/desarrolladores.html`, `/desarrollador.html`
- `/blog.html`, `/articulo.html`
- `/invertir.html`, `/interes.html`, `/ai-insights.html`

### Dashboard Service

**Purpose:** Admin dashboard with API backend

**Tech Stack:**
- Frontend: React + TailwindCSS
- Backend: Express.js + Node.js
- Database: PostgreSQL (Railway plugin)

**Railway Settings:**
- Root Directory: `apps/dashboard`
- Builder: DOCKERFILE
- Dockerfile Path: `Dockerfile`
- Port: 3001
- Healthcheck: `/api/agents`
- Start Command: `node server.js`

**Build Process:**
1. Stage 1: Build React app → `dist/`
2. Stage 2: Node runtime serves React + API endpoints

**Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection (reference from plugin)
- `ANTHROPIC_API_KEY` - Claude API key
- `PORT` - Server port (default: 3001)

## Deployment Methods

### Method 1: Automatic (Git Push)

**Trigger:** Push to `master` branch

```bash
git add .
git commit -m "feat: Add new feature"
git push origin master
```

Railway auto-deploys on push if:
- Service has auto-deploy enabled
- Changes affect service's root directory or watch paths

### Method 2: Manual (Railway Dashboard)

1. Go to Railway Dashboard → Project → Service
2. Click "Deploy" button
3. Monitor build logs

### Method 3: Railway CLI

```bash
# Deploy dashboard
railway up --service dashboard --detach

# Deploy website
railway up --service website --detach
```

## Initial Setup (One-Time)

If setting up Railway from scratch:

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### Step 2: Link Project

```bash
cd /path/to/emiralia
railway link
```

### Step 3: Create Services

**Option A: Automated Script**
```bash
./railway-auto-deploy.sh
```

**Option B: Manual**
```bash
# Create PostgreSQL
railway plugin add postgresql

# Create dashboard service
railway service create dashboard
railway service --name dashboard

# Configure dashboard in Dashboard UI:
# - Root Directory: apps/dashboard
# - Environment: DATABASE_URL (reference PostgreSQL)

# Create website service
railway service create website
railway service --name website

# Configure website in Dashboard UI:
# - Root Directory: apps/website
```

### Step 4: Configure Environment Variables

```bash
# Dashboard environment variables
railway variables --service dashboard set ANTHROPIC_API_KEY=<your-key>
railway variables --service dashboard set PORT=3001
```

### Step 5: Deploy

```bash
# Option 1: Push to trigger auto-deploy
git push origin master

# Option 2: Manual deploy via CLI
railway up --service dashboard --detach
railway up --service website --detach
```

## Troubleshooting

### Issue: Website shows dashboard content

**Symptom:** Accessing website URL shows Express API or React dashboard instead of static HTML

**Cause:** Root Directory not configured correctly in Railway Dashboard

**Fix:**
1. Go to Railway Dashboard → website service → Settings
2. Verify "Root Directory" = `apps/website`
3. Redeploy service

**Verification:**
```bash
curl https://[website-url].railway.app/ | grep "EMIRALIA"
# Should return HTML, NOT JSON
```

### Issue: Dashboard can't connect to database

**Symptom:** Logs show `Error: connect ECONNREFUSED` or `DATABASE_URL is not defined`

**Cause:** DATABASE_URL environment variable not set

**Fix:**
1. Go to Railway Dashboard → dashboard service → Variables
2. Add reference variable: `DATABASE_URL` → Link to PostgreSQL plugin
3. Redeploy service

**Verification:**
```bash
# Check logs for successful connection
railway logs --service dashboard

# Should see: "Dashboard API listening on port 3001"
```

### Issue: Build fails with "Dockerfile not found"

**Symptom:** Build logs show `Error: Dockerfile not found at path: Dockerfile`

**Cause:** Root Directory not set, or Dockerfile Path is incorrect

**Fix:**
1. Verify Root Directory is set correctly:
   - Website: `apps/website`
   - Dashboard: `apps/dashboard`
2. Verify Dockerfile Path is `Dockerfile` (relative to root directory)
3. Check that `Dockerfile` exists in the service directory

### Issue: Website shows 404 for all pages

**Symptom:** Homepage loads but navigating to `/propiedades.html` shows 404

**Cause:** Nginx routing misconfigured

**Fix:**
1. Verify `apps/website/nginx.conf` has SPA fallback:
   ```nginx
   location / {
     try_files $uri $uri/ /index.html;
   }
   ```
2. Verify Dockerfile copies nginx.conf:
   ```dockerfile
   COPY apps/website/nginx.conf /etc/nginx/conf.d/default.conf
   ```

### Issue: Dashboard server crashes on startup

**Symptom:** Logs show `Error: Cannot find module './tools/...'`

**Cause:** Dockerfile not copying `tools/` directory

**Fix:**
1. Verify `apps/dashboard/Dockerfile` line 48:
   ```dockerfile
   COPY --from=builder /app/tools /app/tools
   ```
2. Redeploy service

## Deployment Checklist

Before pushing to production:

- [ ] Code builds locally without errors
- [ ] All environment variables are set in Railway Dashboard
- [ ] Root Directory is configured for each service
- [ ] Database migrations are applied (if any)
- [ ] API endpoints tested locally
- [ ] Website loads all pages correctly locally
- [ ] No hardcoded localhost URLs in code

After deployment:

- [ ] Website URL returns HTML (not JSON)
- [ ] Dashboard URL returns API responses
- [ ] Database connection successful (check logs)
- [ ] No 500 errors in Railway logs
- [ ] Healthcheck endpoints return 200

## Useful Commands

```bash
# View logs
railway logs --service website
railway logs --service dashboard

# Check service status
railway status

# List all services
railway service list

# Get service URL
railway domain --service website
railway domain --service dashboard

# Restart service
railway up --service dashboard --detach

# Environment variables
railway variables --service dashboard
railway variables --service dashboard set KEY=value
```

## Links

- **Railway Dashboard:** https://railway.app/dashboard
- **Website Service:** Configure Root Directory = `apps/website`
- **Dashboard Service:** Configure Root Directory = `apps/dashboard`
- **PostgreSQL:** Managed by Railway plugin

## Support

For Railway-specific issues:
- Railway Docs: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway

For Emiralia-specific issues:
- Check `railway-setup.sh` script
- Check `railway-website-deploy.sh` script
- Review commit history for deployment changes
