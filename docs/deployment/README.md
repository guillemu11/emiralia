# Deployment Documentation

Documentación de estrategias de deployment para Emiralia.

## Plataformas Soportadas

- [Railway](railway.md) — Deployment actual de dashboard + website + PostgreSQL
- [Vercel](vercel.md) — Alternativa para website estático

## Workflow Recomendado

### Desarrollo Local
```bash
npm run db:up          # PostgreSQL local
npm run dev:all        # Dashboard + Website
```

### Staging/Producción (Railway)
```bash
npm run deploy:railway:setup    # Primera vez
npm run deploy:railway          # Deployments subsecuentes
```

## Variables de Entorno

Ver `.env.example` para la lista completa.

Variables críticas:
- `RAILWAY_PROJECT_ID` — ID del proyecto Railway
- `RAILWAY_TOKEN` — Token de autenticación Railway
- `ANTHROPIC_API_KEY` — API key de Anthropic
- `PG_*` — Credenciales PostgreSQL (auto-inyectadas por Railway)
