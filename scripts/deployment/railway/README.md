# Railway Deployment Scripts

Scripts para desplegar Emiralia a Railway.

## Workflow Recomendado

### Primera Vez (Setup)

1. **Configurar Railway CLI**:
   ```bash
   npm run deploy:railway:setup
   ```

   Este script:
   - Verifica autenticación (`railway whoami`)
   - Conecta el proyecto local al proyecto Railway
   - Verifica servicios y plugins existentes

2. **Configurar variables de entorno**:

   Crear `.env` en el root con:
   ```bash
   RAILWAY_PROJECT_ID=your-project-id
   RAILWAY_TOKEN=your-railway-token
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```

3. **Deploy automático**:
   ```bash
   npm run deploy:railway
   ```

   Este script:
   - Crea servicios dashboard y website
   - Configura variables de entorno
   - Configura build/start commands
   - Trigger deployments

### Deployments Subsecuentes

```bash
npm run deploy:railway
```

## Archivos

| Archivo | Propósito |
|---------|-----------|
| `setup.sh` | Configuración inicial (whoami, link, verify) |
| `auto-deploy.sh` | Deploy automático de dashboard + website |

## Seguridad

⚠️ **IMPORTANTE**:
- NUNCA commitear credenciales en los scripts
- Usar `.env` para variables sensibles
- `.env` está en `.gitignore`
